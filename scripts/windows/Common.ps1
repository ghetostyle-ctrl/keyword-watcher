Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-KeywordWatcherContext {
    param([string]$BunPath = (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'))
    $appRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
    [pscustomobject]@{
        AppRoot = $appRoot
        BunPath = [IO.Path]::GetFullPath($BunPath)
        PowerShellPath = (Join-Path $env:WINDIR 'System32\WindowsPowerShell\v1.0\powershell.exe')
        UserSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        TaskPath = '\'
        ServerTask = 'KeywordWatcher-Server'
        CollectionTask = 'KeywordWatcher-DailyCollection'
        Marker = ('KeywordWatcher managed task v1 | root=' + $appRoot)
    }
}

function Assert-KeywordWatcherFiles {
    param($Context)
    foreach ($path in @($Context.BunPath, (Join-Path $Context.AppRoot '.env'),
        (Join-Path $Context.AppRoot 'server\index.ts'), (Join-Path $Context.AppRoot 'scripts\collector.ts'),
        (Join-Path $Context.AppRoot 'dist\index.html'))) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw 'A required application file is missing. Check Bun, .env and the production build.'
        }
    }
    if (-not (Test-Path -LiteralPath (Join-Path $Context.AppRoot 'node_modules') -PathType Container)) {
        throw 'Application dependencies are missing. Run bun install first.'
    }
}

function Get-KeywordWatcherArguments {
    param($Context, [ValidateSet('server', 'collection')] [string]$Kind)
    $file = if ($Kind -eq 'server') { 'Run-Server.ps1' } else { 'Run-Collection.ps1' }
    $scriptPath = Join-Path $Context.AppRoot ('scripts\windows\' + $file)
    '-NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "{0}" -BunPath "{1}"' -f $scriptPath, $Context.BunPath
}

function Test-KeywordWatcherTaskOwnership {
    param($Context, $Task, [ValidateSet('server', 'collection')] [string]$Kind)
    if ($null -eq $Task) { return $false }
    $actions = @($Task.Actions)
    if ($actions.Count -ne 1 -or $Task.Description -ne $Context.Marker) { return $false }
    $principalId = $Task.Principal.UserId
    if ($principalId -ne $Context.UserSid) {
        try { $principalId = ([Security.Principal.NTAccount]$principalId).Translate([Security.Principal.SecurityIdentifier]).Value }
        catch { return $false }
    }
    ($principalId -eq $Context.UserSid) -and
        ($actions[0].Execute -ieq $Context.PowerShellPath) -and
        ($actions[0].Arguments -ceq (Get-KeywordWatcherArguments $Context $Kind)) -and
        ($actions[0].WorkingDirectory -ieq $Context.AppRoot)
}

function Test-KeywordWatcherProcessIdentity {
    param($Context, [string]$ExecutablePath, [string]$CommandLine, [string]$OwnerSid)
    if ($OwnerSid -ne $Context.UserSid -or $ExecutablePath -ine $Context.BunPath) { return $false }
    $entryPath = Join-Path $Context.AppRoot 'server\index.ts'
    $entry = [regex]::Escape($entryPath)
    $entryArgument = '"' + $entry + '"'
    if ($entryPath -notmatch '\s') { $entryArgument += '|' + $entry }
    $pattern = '^\s*(?:"[^"]+"|[^\s"]+)\s+(?:run\s+)?(?:' + $entryArgument + ')\s*$'
    [regex]::IsMatch($CommandLine, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
}

function Get-KeywordWatcherPortState {
    param($Context)
    $listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Where-Object LocalPort -eq 3000)
    if ($listeners.Count -eq 0) { return 'Free' }
    foreach ($processId in @($listeners.OwningProcess | Sort-Object -Unique)) {
        try {
            $process = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $processId) -ErrorAction Stop
            $owner = Invoke-CimMethod -InputObject $process -MethodName GetOwnerSid -ErrorAction Stop
            if ($owner.ReturnValue -ne 0 -or -not (Test-KeywordWatcherProcessIdentity $Context $process.ExecutablePath $process.CommandLine $owner.Sid)) {
                return 'OccupiedUnverified'
            }
        } catch { return 'OccupiedUnverified' }
    }
    'OwnedServer'
}

function Write-KeywordWatcherEvent {
    param($Context, [ValidateSet('server', 'collection')] [string]$Kind,
        [ValidateSet('started', 'exited', 'wrapper_failed', 'port_occupied', 'existing_server_detected')] [string]$Event,
        [int]$ExitCode = 0)
    $logs = Join-Path $Context.AppRoot 'data\logs'
    New-Item -ItemType Directory -Path $logs -Force | Out-Null
    $path = Join-Path $logs ($Kind + '-' + (Get-Date -Format 'yyyy-MM') + '.log')
    # Only fixed events and numeric exit codes are logged. Never persist Bun output or exception messages.
    Add-Content -LiteralPath $path -Encoding UTF8 -Value ('{0} event={1} exit_code={2}' -f [DateTimeOffset]::Now.ToString('o'), $Event, $ExitCode)
}

function Invoke-KeywordWatcherBun {
    param($Context, [ValidateSet('server', 'collection')] [string]$Kind)
    $entry = if ($Kind -eq 'server') { 'server\index.ts' } else { 'scripts\collector.ts' }
    $start = New-Object Diagnostics.ProcessStartInfo
    $start.FileName = $Context.BunPath
    $start.Arguments = '"' + (Join-Path $Context.AppRoot $entry) + '"'
    $start.WorkingDirectory = $Context.AppRoot
    $start.UseShellExecute = $false
    $start.CreateNoWindow = $true
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.EnvironmentVariables['NODE_ENV'] = 'production'
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $start
    try {
        if (-not $process.Start()) { throw 'Runtime could not start.' }
        # Drain both pipes without retaining output, avoiding deadlocks and accidental secret logs.
        $stdout = $process.StandardOutput.BaseStream.CopyToAsync([IO.Stream]::Null)
        $stderr = $process.StandardError.BaseStream.CopyToAsync([IO.Stream]::Null)
        Write-KeywordWatcherEvent $Context $Kind 'started'
        $process.WaitForExit()
        $stdout.GetAwaiter().GetResult()
        $stderr.GetAwaiter().GetResult()
        $exitCode = $process.ExitCode
        Write-KeywordWatcherEvent $Context $Kind 'exited' $exitCode
        return $exitCode
    } finally { $process.Dispose() }
}
