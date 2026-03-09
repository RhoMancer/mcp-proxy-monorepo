@echo off
REM Stop LibreOffice Calc MCP Proxy and Cloudflare Tunnel

echo Stopping LibreOffice Calc MCP services...

REM Stop cloudflared tunnel
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "cloudflared"') do taskkill /F /PID %%i 2>nul

REM Stop Node.js proxy server
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe" ^| findstr "start.js"') do taskkill /F /PID %%i 2>nul

echo LibreOffice Calc MCP services stopped.
pause
