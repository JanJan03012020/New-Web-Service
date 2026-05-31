@echo off
set PYTHON=C:\Users\USER\AppData\Local\Programs\Python\Python312\python.exe
set PIP=C:\Users\USER\AppData\Local\Programs\Python\Python312\Scripts\pip.exe

cd /d "%~dp0"
if not exist .env (
    echo ERROR: .env file not found!
    echo Please copy .env.example to .env and set your SERVER_URL and STATION_NAME
    pause
    exit /b 1
)
echo Installing dependencies...
"%PIP%" install -r requirements.txt
echo.
echo PisoNet Agent Starting...
"%PYTHON%" agent.py
pause
