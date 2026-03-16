@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Start LibreOffice Headless Only
REM ========================================================================
REM
REM This script starts ONLY LibreOffice in headless socket mode.
REM Use this when you want to run the proxy separately.
REM
REM For complete startup, use START_LIBREOFFICE_WITH_TUNNEL.bat
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Starting LibreOffice (Headless Socket Mode)
echo ========================================================================
echo.
echo   Host: localhost
echo   Port: 2002
echo.

start "" "C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck

echo LibreOffice starting...
echo Wait 5 seconds for socket to be ready, then run proxy.
REM Use ping for delay instead of timeout (avoids redirection issues)
ping 127.0.0.1 -n 6 > nul
