@echo off
cd /d "%~dp0frontend"

echo Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)

echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)

echo.
echo Starting PisoNet Dashboard at http://localhost:5173
echo Press Ctrl+C to stop.
echo.
call npm run dev
pause
