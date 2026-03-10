@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Complete Startup (LibreOffice + Proxy)
REM ========================================================================
REM
REM This is the ALL-IN-ONE startup script for LibreOffice Calc MCP.
REM It starts BOTH LibreOffice in headless mode AND the MCP proxy server.
REM
REM Use this for a complete, ready-to-use LibreOffice Calc MCP setup.
REM
REM For individual control, use:
REM - START_LIBREOFFICE_HEADLESS.bat (LibreOffice only)
REM - START_LIBREOFFICE_PROXY.bat (Proxy only)
REM
REM ========================================================================

echo.
echo ========================================================================
echo  LibreOffice Calc MCP - Full Startup
echo ========================================================================
echo.

echo Step 1: Starting LibreOffice in headless socket mode...
echo   Host: localhost, Port: 2002
echo.
start "" "C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck

echo Waiting for LibreOffice to be ready (5 seconds)...
timeout /t 5 /nobreak >nul

echo.
echo Step 2: Starting MCP HTTP Proxy...
echo   Local:  http://127.0.0.1:8081
echo.
cd /d "%~dp0"
npm run start:proxy-only

echo.
echo ========================================================================
echo  Press any key to close...
echo ========================================================================
pause
