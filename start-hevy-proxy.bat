@echo off
REM Start Hevy MCP Proxy before Claude Code
REM This ensures HTTP MCP transport is available

cd /d H:\My_Repositories\mcp-proxy-monorepo\packages\mcp-http-proxy

REM Check if already running
curl -s http://127.0.0.1:8083/health >/dev/null 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [✓] Hevy proxy already running on port 8083
) else (
    echo Starting Hevy MCP Proxy...
    start /B node src/cli.js -c examples/hevy-local.config.js
    timeout /t 3 /nobreak >/dev/null
    
    curl -s http://127.0.0.1:8083/health >/dev/null 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo [✓] Hevy proxy started successfully
    ) else (
        echo [✗] Failed to start Hevy proxy
        exit /b 1
    )
)

echo Ready for Claude Code with Hevy MCP (HTTP transport)
