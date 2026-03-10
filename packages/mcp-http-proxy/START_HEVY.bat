@echo off
REM ========================================================================
REM MCP HTTP Proxy - Hevy Connector (Proxy Only)
REM ========================================================================
REM
REM This starts the MCP Proxy with OAuth Provider mode for Hevy MCP.
REM Use this for local development (no Cloudflare Tunnel).
REM
REM For HTTPS access with Cloudflare Tunnel, use START_HEVY_WITH_TUNNEL.bat
REM
REM DAILY QUICKSTART (LOCAL):
REM   1. Run this file
REM   2. Keep this window open
REM   3. Add connector in Claude: http://127.0.0.1:8082
REM
REM Configuration: examples/claude-connectors-hevy.config.js
REM OAuth Secret: Loaded from .env file (OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: QUICKSTART.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Hevy MCP Connector - Starting (Local Proxy Only)
echo ========================================================================
echo.
echo Configuration: claude-connectors-hevy.config.js
echo OAuth Secret: Loaded from .env file
echo.
echo Starting proxy on http://127.0.0.1:8082
echo.
echo Press Ctrl+C to stop the proxy
echo.
echo ========================================================================
echo.

node src/cli.js -c examples/claude-connectors-hevy.config.js

pause
