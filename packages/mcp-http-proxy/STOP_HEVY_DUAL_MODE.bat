@echo off
REM ========================================================================
REM MCP HTTP Proxy - Stop Hevy Dual Mode Setup
REM ========================================================================
REM
REM This stops BOTH proxy instances:
REM   1. OAuth Provider mode (port 8082)
REM   2. Local mode (port 8083)
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Stopping Hevy MCP Proxies
echo ========================================================================
echo.

REM Kill the OAuth Provider proxy (port 8082)
echo [1/2] Stopping OAuth Provider proxy (port 8082)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8082 ^| findstr LISTENING') do (
    taskkill /PID %%a /F 2>nul
)

REM Kill the Local mode proxy (port 8083)
echo [2/2] Stopping Local mode proxy (port 8083)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8083 ^| findstr LISTENING') do (
    taskkill /PID %%a /F 2>nul
)

echo.
echo ========================================================================
echo  All Hevy MCP proxies stopped
echo ========================================================================
echo.

timeout /t 2 /nobreak > nul
