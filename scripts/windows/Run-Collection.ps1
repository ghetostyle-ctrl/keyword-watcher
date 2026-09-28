[CmdletBinding()]
param([string]$BunPath = (Join-Path $env:USERPROFILE '.bun\bin\bun.exe'), [switch]$CheckOnly)
. (Join-Path $PSScriptRoot 'Common.ps1')
$context = Get-KeywordWatcherContext $BunPath
try {
    Assert-KeywordWatcherFiles $context
    if ($CheckOnly) {
        Write-Output 'Dependencies ready; collection entry: scripts/collector.ts. No collection was started.'
        exit 0
    }
    $code = Invoke-KeywordWatcherBun $context 'collection'
    exit $code
} catch {
    if ($CheckOnly) { Write-Output 'Preflight failed. Check required files.' }
    else { try { Write-KeywordWatcherEvent $context 'collection' 'wrapper_failed' 1 } catch {} }
    exit 1
}
