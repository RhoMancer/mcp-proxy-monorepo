@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Stop All Services
REM ========================================================================
REM
REM Stops: Cloudflare Tunnel, Node.js Proxy, and LibreOffice
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Stopping LibreOffice Calc MCP Services...
echo ========================================================================
echo.

taskkill /F /IM cloudflared.exe 2>nul && echo   - Cloudflare Tunnel: Stopped
taskkill /F /IM soffice.exe 2>nul && echo   - LibreOffice: Stopped
taskkill /F /IM node.exe 2>nul && echo   - Node.js Proxy: Stopped

echo.
echo ========================================================================
echo  All services stopped.
echo ========================================================================
echo.
pause
