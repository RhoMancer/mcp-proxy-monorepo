@echo off
REM ========================================================================
REM Start Hevy MCP Proxy (Local Mode - No OAuth)
REM ========================================================================
REM
REM This script starts the Hevy proxy in local mode (port 8083, no auth).
REM Designed for Claude Code CLI access via HTTP transport.
REM
REM Features:
REM - Health check before starting (avoids duplicate processes)
REM - Background startup with verification
REM - Uses hevy-local.config.js (no OAuth credentials required)
REM
REM ========================================================================

REM Check if already running
curl -s http://127.0.0.1:8083/health >/dev/null 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [~] Hevy proxy already running on port 8083
    exit /b 0
)

echo Starting Hevy MCP Proxy (local mode)...
start /B node src/cli.js -c examples/hevy-local.config.js
timeout /t 3 /nobreak >/dev/null

REM Verify startup
curl -s http://127.0.0.1:8083/health >/dev/null 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Hevy proxy started successfully on port 8083
    echo Ready for Claude Code with Hevy MCP (HTTP transport)
) else (
    echo [ERROR] Failed to start Hevy proxy
    exit /b 1
)
