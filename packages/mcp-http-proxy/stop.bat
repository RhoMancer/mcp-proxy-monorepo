@echo off
REM ========================================================================
REM MCP HTTP Proxy - Stop Script
REM ========================================================================
REM
REM This stops both the MCP Proxy and Cloudflare Tunnel processes.
REM Use this when you're done using Claude Connectors.
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Stopping Hevy MCP Connector...
echo ========================================================================
echo.

echo [1/2] Stopping MCP Proxy...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq MCP Proxy*" 2>nul
if %ERRORLEVEL% EQU 0 echo     - Proxy stopped
if %ERRORLEVEL% NEQ 0 echo     - No proxy running

echo.
echo [2/2] Stopping Cloudflare Tunnel...
taskkill /F /IM cloudflared.exe 2>nul
if %ERRORLEVEL% EQU 0 echo     - Tunnel stopped
if %ERRORLEVEL% NEQ 0 echo     - No tunnel running

echo.
echo ========================================================================
echo  All stopped! You can close this window.
echo ========================================================================
echo.
pause
