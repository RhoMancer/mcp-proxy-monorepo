@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Complete Startup (LibreOffice + Proxy)
REM ========================================================================
REM
REM This script starts BOTH LibreOffice AND the MCP proxy.
REM For local use only (no Cloudflare Tunnel).
REM
REM For remote access with tunnel, use START_LIBREOFFICE_WITH_TUNNEL.bat
REM
REM ========================================================================

echo.
echo ========================================================================
echo  LibreOffice Calc MCP - Local Startup
echo ========================================================================
echo.
echo [1/2] Starting LibreOffice...
call START_LIBREOFFICE_HEADLESS.bat

echo.
echo [2/2] Starting MCP Proxy...
call START_LIBREOFFICE_PROXY.bat
