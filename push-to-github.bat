@echo off
echo Connecting and pushing HIMS project to GitHub...
cd /d "%~dp0"
"C:\Program Files\Git\cmd\git.exe" remote remove origin 2>nul
"C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/aatmandholakia957-spec/hospital-incident-system.git
"C:\Program Files\Git\cmd\git.exe" branch -M main
"C:\Program Files\Git\cmd\git.exe" push -u origin main
echo.
echo ===================================================
echo Done! You can close this window now.
echo ===================================================
pause
