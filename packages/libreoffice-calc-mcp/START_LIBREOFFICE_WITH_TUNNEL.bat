@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Complete Startup with Cloudflare Tunnel
REM ========================================================================
REM
REM This is the MAIN startup script for LibreOffice Calc MCP.
REM Starts: LibreOffice + MCP Proxy + Cloudflare Tunnel
REM
REM DAILY WORKFLOW:
REM   1. Run this file
REM   2. Keep this window open
REM   3. Connect in Claude: https://claude.ai
REM
REM Your public URL: https://libreoffice-calc-mcp.angussoftware.dev
REM OAuth Secret: See .env file (OAUTH_CLIENT_SECRET)
REM
REM For local use only (no tunnel), use START_LIBREOFFICE_AND_PROXY.bat
REM
REM ========================================================================

echo.
echo ========================================================================
echo  LibreOffice Calc MCP - Starting with Cloudflare Tunnel
echo ========================================================================
echo.
echo [1/3] Starting LibreOffice in headless socket mode...
echo   Host: localhost, Port: 2002
echo.

start "" "C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck

echo Waiting for LibreOffice to be ready (5 seconds)...
timeout /t 5 /nobreak >nul

echo.
echo [2/3] Starting MCP HTTP Proxy (port 8081)...
echo.

REM Start the MCP HTTP Proxy in background (with explicit working directory)
start "LibreOffice MCP Proxy" /d "%CD%" node start.js

REM Wait for proxy to start
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting Cloudflare Tunnel...
echo.
echo   Tunnel URL: https://libreoffice-calc-mcp.angussoftware.dev
echo   Config file: config.yml
echo.
echo ========================================================================
echo  ALL SERVICES RUNNING - Keep this window open!
echo ========================================================================
echo.
echo Connect in Claude: https://claude.ai
echo   Remote MCP server URL: https://libreoffice-calc-mcp.angussoftware.dev/message
echo   OAuth Client Secret: See .env file (OAUTH_CLIENT_SECRET)
echo.
echo Press Ctrl+C to stop the tunnel
echo.
echo ========================================================================
echo.

cloudflared tunnel --config "%CD%\config.yml" run
