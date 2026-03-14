@echo off
REM ========================================================================
REM MCP HTTP Proxy - Hevy Dual Mode Setup
REM ========================================================================
REM
REM This starts TWO proxy instances simultaneously:
REM   1. OAuth Provider mode (port 8082) - For Claude.ai web app with tunnel
REM   2. Local mode (port 8083) - For Claude Code CLI (no authentication)
REM
REM DAILY WORKFLOW:
REM   1. Run this file
REM   2. Keep windows open
REM   3. Use Claude Code CLI (port 8083) AND Claude.ai web app (port 8082)
REM
REM Configuration:
REM   - OAuth Provider: examples/claude-connectors-hevy.config.js
REM   - Local: examples/hevy-local.config.js
REM
REM Your secrets are in: .env file (HEVY_API_KEY, OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: DUAL_MODE_SETUP.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Hevy MCP Connector - Dual Mode Setup
echo ========================================================================
echo.
echo Starting TWO proxy instances:
echo   [1/2] OAuth Provider mode (port 8082) - For Claude.ai web app
echo   [2/2] Local mode (port 8083) - For Claude Code CLI
echo.
echo ========================================================================
echo.

REM Start the OAuth Provider proxy (for Claude.ai web app)
echo [1/2] Starting OAuth Provider proxy (port 8082)...
start "MCP Proxy - Hevy OAuth Provider" /d "%CD%" node src/cli.js -c examples/claude-connectors-hevy.config.js

REM Wait a moment for the first proxy to start
timeout /t 2 /nobreak > nul

REM Start the Local mode proxy (for Claude Code CLI)
echo [2/2] Starting Local mode proxy (port 8083)...
start "MCP Proxy - Hevy Local Mode" /d "%CD%" node src/cli.js -c examples/hevy-local.config.js

REM Wait for second proxy to start
timeout /t 2 /nobreak > nul

echo.
echo ========================================================================
echo  BOTH PROXIES ARE RUNNING
echo ========================================================================
echo.
echo Proxy 1 (OAuth Provider): http://127.0.0.1:8082
echo   - For Claude.ai web app
echo   - Requires OAuth credentials
echo   - Cloudflare Tunnel: https://hevy.angussoftware.dev
echo.
echo Proxy 2 (Local Mode):    http://127.0.0.1:8083
echo   - For Claude Code CLI
echo   - No authentication required
echo   - Configure in: ~/.claude/mcp_servers.json
echo.
echo To verify both are running:
echo   curl http://127.0.0.1:8082/health
echo   curl http://127.0.0.1:8083/health
echo.
echo To stop both proxies, close the terminal windows or run:
echo   .\STOP_HEVY_DUAL_MODE.bat
echo.
echo For full documentation: DUAL_MODE_SETUP.md
echo.
echo ========================================================================
echo.

pause
