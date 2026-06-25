@echo off
echo ===================================================
echo   Anawuma Kitchen KDS - Silent Printer Launcher
echo ===================================================
echo.
echo Make sure you have set your Thermal Printer as the "Default Printer" in Windows!
echo.
echo Launching Google Chrome in Silent Kiosk Printing mode...
echo.

:: Specify the URL to your KDS Dashboard here
set KDS_URL=http://localhost:3000/kitchen/dashboard

:: Look for Chrome in common installation paths
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% goto :launch

set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% goto :launch

set CHROME_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% goto :launch

echo Error: Google Chrome was not found on your system!
echo Please make sure Chrome is installed.
pause
exit

:launch
start "" %CHROME_PATH% --kiosk-printing "%KDS_URL%"
exit
