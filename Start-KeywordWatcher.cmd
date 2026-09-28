@echo off
setlocal
cd /d "%~dp0"
set "TRENDWATCH_BUN=%USERPROFILE%\.bun\bin\bun.exe"
if not exist "%TRENDWATCH_BUN%" (
  where bun >nul 2>&1
  if errorlevel 1 (
    echo Bun is required. Install it from https://bun.sh and run this file again.
    pause
    exit /b 1
  )
  set "TRENDWATCH_BUN=bun"
)
if not exist node_modules (
  call "%TRENDWATCH_BUN%" install --frozen-lockfile
  if errorlevel 1 goto failed
)
if not exist dist\index.html (
  call "%TRENDWATCH_BUN%" run build
  if errorlevel 1 goto failed
)
echo Open http://127.0.0.1:3000 in your browser.
echo Keep this window open while using KeywordWatcher or automatic collection.
call "%TRENDWATCH_BUN%" run start
if errorlevel 1 goto failed
exit /b 0
:failed
echo KeywordWatcher could not start. Review the message above.
pause
exit /b 1
