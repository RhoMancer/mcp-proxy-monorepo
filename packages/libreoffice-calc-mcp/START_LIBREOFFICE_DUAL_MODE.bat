@echo off
REM ========================================================================
REM MCP HTTP Proxy - LibreOffice Dual Mode Setup
REM ========================================================================
REM
REM This starts FOUR services simultaneously:
REM   1. LibreOffice Headless - Socket mode for document access
REM   2. Cloudflare Tunnel - Routes external traffic to OAuth proxy
REM   3. OAuth Provider mode (port 8085) - For Claude.ai web app with tunnel
REM   4. Local mode (port 8084) - For Claude Code CLI (no authentication)
REM
REM DAILY WORKFLOW:
REM   1. Run this file FIRST
REM   2. Keep windows open
REM   3. THEN start Claude Code CLI
REM   4. Use Claude Code CLI (port 8084) AND Claude.ai web app (port 8085)
REM
REM Configuration:
REM   - OAuth Provider: config/libreoffice-oauth.config.js
REM   - Local: config/libreoffice-local.config.js
REM
REM Your secrets are in: .env file (OAUTH_CLIENT_SECRET)
REM
REM ========================================================================

echo.
echo ========================================================================
echo  LibreOffice MCP Connector - Dual Mode Setup
echo ========================================================================
echo.
echo Starting FOUR services:
echo   [1/4] LibreOffice Headless - Socket mode for document access
echo   [2/4] Cloudflare Tunnel - For external access to OAuth proxy
echo   [3/4] OAuth Provider mode (port 8085) - For Claude.ai web app
echo   [4/4] Local mode (port 8084) - For Claude Code CLI
echo.
echo ========================================================================
echo.

REM Step 1: Start LibreOffice in headless socket mode
echo [1/4] Starting LibreOffice Headless...
call START_LIBREOFFICE_HEADLESS.bat
if errorlevel 1 (
    echo ERROR: Failed to start LibreOffice
    pause
    exit /b 1
)

REM Step 2: Start Cloudflare Tunnel (required for OAuth proxy external access)
echo [2/4] Starting Cloudflare Tunnel...
start "Cloudflare Tunnel - LibreOffice" /d "%CD%" cloudflared.exe tunnel --config config.yml run

REM Wait for tunnel to establish
timeout /t 3 /nobreak > nul

REM Step 3: Start the OAuth Provider proxy (for Claude.ai web app)
echo [3/4] Starting OAuth Provider proxy (port 8085)...
start "MCP Proxy - LibreOffice OAuth Provider" /d "%CD%" node ../mcp-http-proxy/src/cli.js -c config/libreoffice-oauth.config.js

REM Wait a moment for the first proxy to start
timeout /t 2 /nobreak > nul

REM Step 4: Start the Local mode proxy (for Claude Code CLI)
echo [4/4] Starting Local mode proxy (port 8084)...
start "MCP Proxy - LibreOffice Local Mode" /d "%CD%" node ../mcp-http-proxy/src/cli.js -c config/libreoffice-local.config.js

REM Wait for second proxy to start
timeout /t 2 /nobreak > nul

echo.
echo ========================================================================
echo  ALL FOUR SERVICES ARE RUNNING
echo ========================================================================
echo.
echo Service 1 (LibreOffice):      Socket on localhost:2002
echo   - Required for all document operations
echo   - Must be running for both proxies to work
echo.
echo Service 2 (Cloudflare Tunnel): https://libreoffice-calc-mcp.angussoftware.dev
echo   - Routes external traffic to OAuth proxy
echo   - Required for Claude.ai web app access
echo.
echo Service 3 (OAuth Provider):   http://127.0.0.1:8085
echo   - For Claude.ai web app
echo   - Requires OAuth credentials
echo   - Accessed via Cloudflare Tunnel externally
echo.
echo Service 4 (Local Mode):       http://127.0.0.1:8084
echo   - For Claude Code CLI
echo   - No authentication required
echo   - Configure in: %%USERPROFILE%%\.claude\mcp_servers.json
echo.
echo To verify both proxies are running:
echo   curl http://127.0.0.1:8084/health
echo   curl http://127.0.0.1:8085/health
echo.
echo To stop all services, close the terminal windows or run:
echo   .\STOP_LIBREOFFICE_PROXY.bat
echo   (Also close LibreOffice separately if needed)
echo.
echo ========================================================================
echo  IMPORTANT: START CLAUDE CODE CLI NOW
echo ========================================================================
echo.
echo The proxies are ready! Start or restart Claude Code CLI to access LibreOffice tools.
echo.
echo If Claude Code was already running, restart it to discover the MCP tools.
echo.
echo ========================================================================
echo.

pause
