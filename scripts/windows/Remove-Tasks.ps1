[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param([string]$BunPath = (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'), [switch]$StopRunning)
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-KeywordWatcherContext $BunPath
$ownedTasks = @()
foreach ($definition in @(@{ Name = $context.ServerTask; Kind = 'server' }, @{ Name = $context.CollectionTask; Kind = 'collection' })) {
    $task = Get-ScheduledTask -TaskPath $context.TaskPath -TaskName $definition.Name -ErrorAction SilentlyContinue
    if ($null -eq $task) { continue }
    if (-not (Test-KeywordWatcherTaskOwnership $context $task $definition.Kind)) {
        throw ('Ownership did not match for ' + $definition.Name + '. No task was removed.')
    }
    $ownedTasks += $task
}
foreach ($task in $ownedTasks) {
    if ($PSCmdlet.ShouldProcess($task.TaskName, 'Remove current-user KeywordWatcher task')) {
        if ($StopRunning) { Stop-ScheduledTask -TaskPath $context.TaskPath -TaskName $task.TaskName }
        Unregister-ScheduledTask -TaskPath $context.TaskPath -TaskName $task.TaskName -Confirm:$false
    }
}
Write-Output 'Matching task removal completed. Files, data, credentials and other tasks were not removed.'
if (-not $StopRunning) { Write-Output 'Running instances were left running; they normally stop at sign-out.' }
