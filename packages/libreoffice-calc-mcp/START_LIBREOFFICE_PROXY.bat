@echo off
REM ========================================================================
REM LibreOffice Calc MCP - Start Proxy Server
REM ========================================================================
REM
REM This script starts the LibreOffice Calc MCP proxy locally.
REM Assumes LibreOffice is already running in headless socket mode.
REM
REM For a complete startup (LibreOffice + Proxy), use START_LIBREOFFICE_AND_PROXY.bat
REM
REM Environment variables (optional - set in .env):
REM - MCP_LIBREOFFICE_PATH: Path to LibreOffice executable
REM - MCP_LIBREOFFICE_HOST: LibreOffice socket host (default: localhost)
REM - MCP_LIBREOFFICE_PORT: LibreOffice socket port (default: 2002)
REM - MCP_PROXY_PORT: Proxy port (default: 8081)
REM - MCP_PROXY_HOST: Proxy host (default: 127.0.0.1)
REM
REM For Cloudflare tunnel (optional):
REM 1. Copy config.example.yml to config.yml
REM 2. Edit config.yml with your tunnel details
REM 3. Uncomment the cloudflared command below
REM
REM ========================================================================

echo.
echo ========================================================================
echo   LibreOffice Calc MCP Proxy
echo   Local:  http://127.0.0.1:8081
echo ========================================================================
echo.
echo Starting LibreOffice Calc MCP proxy...
echo.

node start.js

REM To start with Cloudflare tunnel, uncomment the following lines:
REM echo Starting Cloudflare Tunnel...
REM cloudflared.exe tunnel --config config.yml run
