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
set KDS_URL=http://152.42.179.36/kitchen/kds

:: Look for Chrome in common installation paths
set CHROME_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% goto :launch

set CHROME_PATH="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% goto :launch

set CHROME_PATH="%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist %CHROME_PATH% goto :launch

:: Look for Microsoft Edge (since you are using Edge)
set EDGE_PATH="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if exist %EDGE_PATH% goto :launch_edge

echo Error: Neither Google Chrome nor Microsoft Edge was found!
echo Please make sure one of them is installed.
pause
exit

:launch
start "" %CHROME_PATH% --kiosk-printing "%KDS_URL%"
exit

:launch_edge
start "" %EDGE_PATH% --kiosk-printing "%KDS_URL%"
exit
