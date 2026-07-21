@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required. Download it from https://nodejs.org/
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js from https://nodejs.org/
  pause
  exit /b 1
)
echo Installing StaarWardd...
call npm install
if errorlevel 1 goto :error
echo Running tests...
call npm test
if errorlevel 1 goto :error
echo Starting StaarWardd at http://localhost:3000
start "" http://localhost:3000
call npm run dev
if errorlevel 1 goto :error
exit /b 0
:error
echo.
echo StaarWardd could not start. See TROUBLESHOOTING.md.
pause
exit /b 1

