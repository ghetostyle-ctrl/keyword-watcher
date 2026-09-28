[CmdletBinding()]
param([string]$BunPath = (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'))
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-KeywordWatcherContext $BunPath
foreach ($definition in @(@{ Name = $context.ServerTask; Kind = 'server' }, @{ Name = $context.CollectionTask; Kind = 'collection' })) {
    $task = Get-ScheduledTask -TaskPath $context.TaskPath -TaskName $definition.Name -ErrorAction SilentlyContinue
    if ($null -eq $task) {
        [pscustomobject]@{ Task = $definition.Name; State = 'NotInstalled'; Owned = $false; LastResult = $null; NextRun = $null }
    } else {
        $info = Get-ScheduledTaskInfo -InputObject $task
        [pscustomobject]@{ Task = $definition.Name; State = $task.State; Owned = (Test-KeywordWatcherTaskOwnership $context $task $definition.Kind); LastResult = $info.LastTaskResult; NextRun = $info.NextRunTime }
    }
}
Write-Output ('Port 3000: ' + (Get-KeywordWatcherPortState $context))
Write-Output ('Windows time zone: ' + (Get-TimeZone).Id)
