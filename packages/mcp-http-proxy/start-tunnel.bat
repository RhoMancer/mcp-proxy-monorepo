@echo off
REM Start MCP HTTP Proxy with Cloudflare Tunnel for Claude Connectors
REM This starts both the proxy server and the cloudflared tunnel

echo Starting MCP HTTP Proxy with OAuth Provider mode...
echo Configuration: claude-connectors-hevy.config.js
echo.

REM Start the MCP HTTP Proxy in background
start "MCP Proxy" cmd /c "node src/cli.js -c examples/claude-connectors-hevy.config.js"

REM Wait for proxy to start
timeout /t 2 /nobreak > nul

REM Start Cloudflare Tunnel
echo Starting Cloudflare Tunnel...
echo URL: https://hevy.angussoftware.dev
echo.
cloudflared tunnel run rho-hevy-mcp-proxy --url http://127.0.0.1:8082
