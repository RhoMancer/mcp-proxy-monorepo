@echo off
REM ========================================================================
REM LibreOffice Calc Connector - Dual Mode Startup (Claude Code CLI + Claude.ai)
REM ========================================================================
REM
REM This is the EASIEST way to start the LibreOffice connector for BOTH:
REM   - Claude Code CLI (local, no auth)
REM   - Claude.ai web app (via Cloudflare Tunnel, with OAuth)
REM
REM Just double-click this file from anywhere in the repo!
REM
REM This starts FOUR services:
REM   1. LibreOffice Headless (socket mode for document access)
REM   2. Cloudflare Tunnel - For external HTTPS access
REM   3. OAuth Proxy (port 8085) - For Claude.ai web app
REM   4. Local Proxy (port 8084) - For Claude Code CLI
REM
REM DAILY WORKFLOW:
REM   1. Double-click this file
REM   2. Keep the windows open
REM   3. THEN start Claude Code CLI (tools will be discovered)
REM   4. Use Claude.ai web app anytime via tunnel
REM
REM Your public URL: https://libreoffice-calc-mcp.angussoftware.dev
REM OAuth Client Secret: See .env file (OAUTH_CLIENT_SECRET)
REM
REM For full docs, see: packages\libreoffice-calc-mcp\README.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  LibreOffice Calc Connector - Dual Mode Startup
echo ========================================================================
echo.
echo Changing to: packages\libreoffice-calc-mcp
echo.

cd packages\libreoffice-calc-mcp

echo Launching START_LIBREOFFICE_DUAL_MODE.bat...
echo   This will open 4 terminal windows:
echo     1. LibreOffice Headless (socket on localhost:2002)
echo     2. Cloudflare Tunnel (for HTTPS access)
echo     3. OAuth Proxy on port 8085 (for Claude.ai)
echo     4. Local Proxy on port 8084 (for Claude Code CLI)
echo.
echo ========================================================================
echo.

call START_LIBREOFFICE_DUAL_MODE.bat
