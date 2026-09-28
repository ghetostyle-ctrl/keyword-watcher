[CmdletBinding()]
param([string]$BunPath = (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'), [switch]$CheckOnly)
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-KeywordWatcherContext $BunPath
try {
    Assert-KeywordWatcherFiles $context
    $state = Get-KeywordWatcherPortState $context
    if ($CheckOnly) {
        Write-Output ('Dependencies ready; port 3000: ' + $state + '. No application was started.')
        exit 0
    }
    if ($state -eq 'OwnedServer') {
        Write-KeywordWatcherEvent $context 'server' 'existing_server_detected'
        do {
            Start-Sleep -Seconds 10
            $state = Get-KeywordWatcherPortState $context
        } while ($state -eq 'OwnedServer')
    }
    if ($state -ne 'Free') {
        Write-KeywordWatcherEvent $context 'server' 'port_occupied' 1
        exit 1
    }
    $code = Invoke-KeywordWatcherBun $context 'server'
    # A server that exits unexpectedly should be restarted even when Bun returns zero.
    if ($code -eq 0) { exit 1 }
    exit $code
} catch {
    if ($CheckOnly) { Write-Output 'Preflight failed. Check required files and local port permissions.' }
    else { try { Write-KeywordWatcherEvent $context 'server' 'wrapper_failed' 1 } catch {} }
    exit 1
}
