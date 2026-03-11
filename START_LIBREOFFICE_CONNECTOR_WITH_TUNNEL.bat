@echo off
REM ========================================================================
REM LibreOffice Calc Connector - Quick Start (with Cloudflare Tunnel)
REM ========================================================================
REM
REM This is the EASIEST way to start the LibreOffice connector for Claude.
REM Just double-click this file from anywhere in the repo!
REM
REM This starts LibreOffice, the MCP Proxy AND the Cloudflare Tunnel for
REM HTTPS access from Claude AI.
REM
REM DAILY WORKFLOW:
REM   1. Double-click this file
REM   2. Keep the window open
REM   3. Connect in Claude: https://claude.ai
REM
REM Your public URL: https://libreoffice-calc-mcp.angussoftware.dev
REM OAuth Client Secret: See .env file (OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: packages\libreoffice-calc-mcp\README.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  LibreOffice Calc Connector - Starting with Cloudflare Tunnel
echo ========================================================================
echo.
echo Changing to: packages\libreoffice-calc-mcp
echo.

cd packages\libreoffice-calc-mcp

echo Launching START_LIBREOFFICE_WITH_TUNNEL.bat...
echo.
echo ========================================================================
echo.

call START_LIBREOFFICE_WITH_TUNNEL.bat
