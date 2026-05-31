@echo off
set PYTHON=C:\Users\USER\AppData\Local\Programs\Python\Python312\python.exe
set PIP=C:\Users\USER\AppData\Local\Programs\Python\Python312\Scripts\pip.exe

cd /d "%~dp0backend"
echo Installing dependencies...
"%PIP%" install -r requirements.txt
echo.
echo Starting PisoNet Backend Server on http://localhost:8000
"%PYTHON%" main.py
pause
