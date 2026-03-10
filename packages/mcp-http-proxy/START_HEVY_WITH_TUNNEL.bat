@echo off
REM ========================================================================
REM MCP HTTP Proxy - Hevy Connector (Proxy + Cloudflare Tunnel)
REM ========================================================================
REM
REM This is the DAILY QUICKSTART command for Hevy MCP connector.
REM It starts both the MCP Proxy AND the Cloudflare Tunnel for HTTPS access.
REM
REM DAILY WORKFLOW:
REM   1. Run this file
REM   2. Keep this window open
REM   3. Connect in Claude: https://claude.ai
REM
REM Your OAuth Secret is in: .env file (see OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: QUICKSTART.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Hevy MCP Connector - Starting with Cloudflare Tunnel
echo ========================================================================
echo.
echo [1/2] Starting MCP Proxy (port 8082)...
echo.

REM Start the MCP HTTP Proxy in background (with explicit working directory)
start "MCP Proxy" /d "%CD%" cmd /c "node src/cli.js --config examples/claude-connectors-hevy.config.js"

REM Wait for proxy to start
timeout /t 2 /nobreak > nul

echo [2/2] Starting Cloudflare Tunnel...
echo.
echo   Tunnel URL: https://hevy.angussoftware.dev
echo   Config file: config.yml
echo.
echo ========================================================================
echo  TUNNEL IS RUNNING - Keep this window open!
echo ========================================================================
echo.
echo Connect in Claude: https://claude.ai
echo   OAuth Client Secret: See .env file (OAUTH_CLIENT_SECRET)
echo   For full setup guide: QUICKSTART.md
echo.
echo Press Ctrl+C to stop the tunnel
echo.
echo ========================================================================
echo.

cloudflared tunnel --config "%CD%\config.yml" run
