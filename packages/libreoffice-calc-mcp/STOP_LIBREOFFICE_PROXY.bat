@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Stop All Services
REM ========================================================================
REM
REM This script stops the LibreOffice Calc MCP proxy and any associated services.
REM
REM Stops:
REM - Cloudflare Tunnel (if running)
REM - Node.js proxy server
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Stopping LibreOffice Calc MCP Services...
echo ========================================================================
echo.

echo [1/2] Stopping Cloudflare Tunnel...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "cloudflared"') do taskkill /F /PID %%i 2>nul
echo     - Done

echo.
echo [2/2] Stopping Node.js Proxy Server...
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe" ^| findstr "start.js"') do taskkill /F /PID %%i 2>nul
echo     - Done

echo.
echo ========================================================================
echo  All LibreOffice Calc MCP services stopped.
echo ========================================================================
echo.
pause
