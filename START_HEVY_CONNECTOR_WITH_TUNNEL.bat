@echo off
REM ========================================================================
REM Hevy MCP Connector - Quick Start (with Cloudflare Tunnel)
REM ========================================================================
REM
REM This is the EASIEST way to start the Hevy connector for Claude.
REM Just double-click this file from anywhere in the repo!
REM
REM This starts BOTH the MCP Proxy AND the Cloudflare Tunnel for HTTPS
REM access from Claude AI.
REM
REM DAILY WORKFLOW:
REM   1. Double-click this file
REM   2. Keep the window open
REM   3. Connect in Claude: https://claude.ai
REM
REM Your OAuth Secret: See .env file (OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: packages\mcp-http-proxy\QUICKSTART.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Hevy MCP Connector - Starting with Cloudflare Tunnel
echo ========================================================================
echo.
echo Changing to: packages\mcp-http-proxy
echo.

cd packages\mcp-http-proxy

echo Launching START_HEVY_WITH_TUNNEL.bat...
echo.
echo ========================================================================
echo.

call START_HEVY_WITH_TUNNEL.bat
