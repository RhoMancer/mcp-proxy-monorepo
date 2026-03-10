@echo off
REM Stop MCP HTTP Proxy and Cloudflare Tunnel

echo Stopping MCP Proxy and Cloudflare Tunnel...

REM Kill node processes running the proxy
taskkill /F /IM node.exe /FI "WINDOWTITLE eq MCP Proxy*" 2>nul

REM Kill cloudflared processes
taskkill /F /IM cloudflared.exe 2>nul

echo Done.
