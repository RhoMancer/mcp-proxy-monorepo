@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Start LibreOffice Headless
REM ========================================================================
REM
REM This script starts LibreOffice in headless socket mode only.
REM The proxy server will NOT be started.
REM
REM After running this, use START_LIBREOFFICE_PROXY.bat to start the proxy.
REM Or use START_LIBREOFFICE_AND_PROXY.bat for both at once.
REM
REM LibreOffice will run on:
REM - Host: localhost
REM - Port: 2002
REM - Protocol: socket
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Starting LibreOffice in Headless Socket Mode...
echo ========================================================================
echo.
echo   Host: localhost
echo   Port: 2002
echo.

start /B "" "%~dp0..\..\..\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck

echo.
echo LibreOffice started in headless mode.
echo You can now start the proxy with START_LIBREOFFICE_PROXY.bat
echo.
