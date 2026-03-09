@echo off
REM Stop Hevy MCP Proxy and Cloudflare Tunnel

echo Stopping Hevy MCP services...

REM Stop cloudflared tunnel
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "cloudflared"') do taskkill /F /PID %%i 2>nul

REM Stop Node.js proxy server (npm start)
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe"') do taskkill /F /PID %%i 2>nul

echo Hevy MCP services stopped.
pause
