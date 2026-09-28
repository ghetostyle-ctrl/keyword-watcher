[CmdletBinding(SupportsShouldProcess = $true)]
param([string]$BunPath = (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'), [switch]$StartNow)
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-KeywordWatcherContext $BunPath
Assert-KeywordWatcherFiles $context
if ((Get-TimeZone).Id -ne 'Korea Standard Time') {
    throw 'These tasks require the Windows time zone Korea Standard Time. No time-zone setting was changed.'
}
$definitions = @(
    @{ Name = $context.ServerTask; Kind = 'server' },
    @{ Name = $context.CollectionTask; Kind = 'collection' }
)
# Validate the entire set before making any task changes.
foreach ($definition in $definitions) {
    $existing = Get-ScheduledTask -TaskPath $context.TaskPath -TaskName $definition.Name -ErrorAction SilentlyContinue
    if ($null -ne $existing -and -not (Test-KeywordWatcherTaskOwnership $context $existing $definition.Kind)) {
        throw ('An unrelated task already uses ' + $definition.Name + '. Nothing was registered.')
    }
}
$principal = New-ScheduledTaskPrincipal -UserId $context.UserSid -LogonType Interactive -RunLevel Limited
foreach ($definition in $definitions) {
    $action = New-ScheduledTaskAction -Execute $context.PowerShellPath -Argument (Get-KeywordWatcherArguments $context $definition.Kind) -WorkingDirectory $context.AppRoot
    if ($definition.Kind -eq 'server') {
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $context.UserSid
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    } else {
        $trigger = New-ScheduledTaskTrigger -Daily -At '09:00'
        $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Hours 1) -MultipleInstances IgnoreNew -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 15) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    }
    $task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description $context.Marker
    if ($PSCmdlet.ShouldProcess($definition.Name, 'Register current-user KeywordWatcher task')) {
        Register-ScheduledTask -TaskPath $context.TaskPath -TaskName $definition.Name -InputObject $task -Force | Out-Null
    }
}
if ($StartNow -and $PSCmdlet.ShouldProcess($context.ServerTask, 'Start hidden server task')) {
    Start-ScheduledTask -TaskPath $context.TaskPath -TaskName $context.ServerTask
}
Write-Output 'Task configuration: server at sign-in; collection daily at 09:00 Korea Standard Time.'
Write-Output 'Requires a signed-in user and an awake computer. No password or power settings were changed.'
