@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Start Proxy Only
REM ========================================================================
REM
REM This script starts ONLY the MCP HTTP proxy.
REM Assumes LibreOffice is already running in headless socket mode.
REM
REM For complete startup, use START_LIBREOFFICE_WITH_TUNNEL.bat
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Starting LibreOffice MCP Proxy
echo ========================================================================
echo.
echo   Local:  http://127.0.0.1:8081
echo.

node start.js
