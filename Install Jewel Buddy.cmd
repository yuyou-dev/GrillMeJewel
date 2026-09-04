@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Jewel Buddy requires Node.js 20 or newer.
  pause
  exit /b 1
)
node scripts\workbuddy-connector.mjs install
set result=%errorlevel%
echo.
if %result% equ 0 (
  echo Installation completed. In WorkBuddy, open Connectors ^> Custom connections.
  echo Trust the newly installed jewel-buddy MCP script, then enable its switch.
  echo Start a new conversation; do not fall back to a native conversation card.
) else (
  echo Installation failed. Keep the original error shown above.
)
pause
exit /b %result%
