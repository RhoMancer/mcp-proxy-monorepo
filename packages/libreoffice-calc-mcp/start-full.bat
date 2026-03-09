@echo off
echo ====================================
echo LibreOffice Calc MCP - Full Start
echo ====================================
echo.

echo Step 1: Starting LibreOffice in socket mode...
start "" "C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck

echo Waiting for LibreOffice to be ready (5 seconds)...
timeout /t 5 /nobreak >nul

echo.
echo Step 2: Starting MCP HTTP Proxy...
echo.
cd /d "%~dp0"
npm run start:proxy-only

pause
