@echo off
REM hevy-mcp Proxy Startup Script
REM
REM This script starts the hevy-mcp proxy locally.
REM
REM Environment variables (required - set in .env):
REM - HEVY_API_KEY: Your Hevy API key (get from https://hevy.app/api)
REM
REM Optional environment variables:
REM - MCP_PROXY_PORT: Proxy port (default: 8080)
REM - MCP_PROXY_HOST: Proxy host (default: 127.0.0.1)
REM
REM For Cloudflare tunnel (optional):
REM 1. Copy config.example.yml to config.yml
REM 2. Edit config.yml with your tunnel details
REM 3. Uncomment the cloudflared command below

echo.
echo ================================================
echo   hevy-mcp Proxy
echo   Local:  http://127.0.0.1:8080
echo ================================================
echo.

REM Check for HEVY_API_KEY
if not exist .env (
    echo Warning: .env file not found.
    echo Please create .env with your HEVY_API_KEY:
    echo   echo HEVY_API_KEY=your_key_here ^> .env
    echo.
    pause
    exit /b 1
)

echo Starting hevy-mcp proxy...
echo.

npm start

REM To start with Cloudflare tunnel, uncomment the following lines:
REM echo Starting Cloudflare Tunnel...
REM cloudflared.exe tunnel --config config.yml run
