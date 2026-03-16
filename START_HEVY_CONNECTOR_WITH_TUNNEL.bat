@echo off
REM ========================================================================
REM Hevy MCP Connector - Dual Mode Startup (Claude Code CLI + Claude.ai)
REM ========================================================================
REM
REM This is the EASIEST way to start the Hevy connector for BOTH:
REM   - Claude Code CLI (local, no auth)
REM   - Claude.ai web app (via Cloudflare Tunnel, with OAuth)
REM
REM Just double-click this file from anywhere in the repo!
REM
REM This starts THREE services:
REM   1. Cloudflare Tunnel - For external HTTPS access
REM   2. OAuth Proxy (port 8082) - For Claude.ai web app
REM   3. Local Proxy (port 8083) - For Claude Code CLI
REM
REM DAILY WORKFLOW:
REM   1. Double-click this file
REM   2. Keep the windows open
REM   3. THEN start Claude Code CLI (tools will be discovered)
REM   4. Use Claude.ai web app anytime via tunnel
REM
REM Your OAuth Secret: See .env file (OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: packages\mcp-http-proxy\DUAL_MODE_SETUP.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Hevy MCP Connector - Dual Mode Startup
echo ========================================================================
echo.
echo Changing to: packages\mcp-http-proxy
echo.

cd packages\mcp-http-proxy

echo Launching START_HEVY_DUAL_MODE.bat...
echo   This will open 3 terminal windows:
echo     1. Cloudflare Tunnel (for HTTPS access)
echo     2. OAuth Proxy on port 8082 (for Claude.ai)
echo     3. Local Proxy on port 8083 (for Claude Code CLI)
echo.
echo ========================================================================
echo.

call START_HEVY_DUAL_MODE.bat
