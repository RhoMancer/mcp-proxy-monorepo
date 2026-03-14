@echo off
REM ========================================================================
REM Verification Script for Claude Code CLI + Hevy MCP (Windows)
REM ========================================================================
REM
REM This script verifies that:
REM 1. Both proxy instances are running (ports 8082 and 8083)
REM 2. MCP connection works from local proxy
REM 3. Claude Code CLI is configured correctly
REM 4. All Hevy MCP tools are available
REM
REM Usage:
REM   verify_claude_code_setup.bat
REM
REM ========================================================================

setlocal enabledelayedexpansion

echo ========================================================================
echo  Hevy MCP - Claude Code CLI Setup Verification
echo ========================================================================
echo.

set PASS=0
set FAIL=0

REM Test 1: Check OAuth Provider proxy (port 8082)
echo [1/6] Checking OAuth Provider proxy (port 8082)...
curl -s http://127.0.0.1:8082/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] OAuth Provider proxy is running
    set /a PASS+=1
) else (
    echo [FAIL] OAuth Provider proxy is NOT running
    set /a FAIL+=1
)
echo.

REM Test 2: Check Local mode proxy (port 8083)
echo [2/6] Checking Local mode proxy (port 8083)...
curl -s http://127.0.0.1:8083/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Local mode proxy is running
    set /a PASS+=1
) else (
    echo [FAIL] Local mode proxy is NOT running
    set /a FAIL+=1
)
echo.

REM Test 3: Check MCP initialize on local proxy
echo [3/6] Testing MCP initialization on local proxy...
curl -s -X POST http://127.0.0.1:8083/message -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2024-11-05\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test-client\",\"version\":\"1.0.0\"}}}" > %TEMP%\hevy_init.json
findstr /C:"hevy-mcp" %TEMP%\hevy_init.json >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] MCP initialization successful (hevy-mcp)
    set /a PASS+=1
) else (
    echo [FAIL] MCP initialization failed
    set /a FAIL+=1
)
echo.

REM Test 4: Check available tools
echo [4/6] Checking available Hevy MCP tools...
curl -s -X POST http://127.0.0.1:8083/message -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/list\",\"params\":{}}" > %TEMP%\hevy_tools.json
REM Count occurrences of "name": which indicates tools
for /f %%i in ('type %TEMP%\hevy_tools.json ^| find /c /c "\"name\":"') do set TOOL_COUNT=%%i
if !TOOL_COUNT! geq 18 (
    echo [OK] All !TOOL_COUNT! Hevy MCP tools are available
    set /a PASS+=1
) else (
    echo [WARN] Only !TOOL_COUNT! tools found (expected 18)
    set /a FAIL+=1
)
echo.

REM Test 5: Check Claude Code CLI configuration
echo [5/6] Checking Claude Code CLI configuration...
set CLAUDE_DIR=%USERPROFILE%\.claude
set MCP_CONFIG=%CLAUDE_DIR%\mcp_servers.json

if exist "%MCP_CONFIG%" (
    echo [OK] MCP config file exists at %MCP_CONFIG%
    findstr /C:"hevy" "%MCP_CONFIG%" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK] Hevy MCP server is configured
        findstr /C:"8083" "%MCP_CONFIG%" >nul 2>&1
        if %errorlevel% equ 0 (
            echo [OK] Hevy is configured for port 8083 (local mode)
            set /a PASS+=1
        ) else (
            echo [WARN] Hevy is configured but not on port 8083
            type "%MCP_CONFIG%" | findstr /A:5 "hevy"
            set /a FAIL+=1
        )
    ) else (
        echo [WARN] Hevy MCP server is NOT configured in %MCP_CONFIG%
        echo   Add this configuration:
        echo   {
        echo     "mcpServers": {
        echo       "hevy": {
        echo         "transport": {
        echo           "type": "http",
        echo           "url": "http://127.0.0.1:8083/message"
        echo         }
        echo       }
        echo     }
        echo   }
        set /a FAIL+=1
    )
) else (
    echo [WARN] MCP config file not found at %MCP_CONFIG%
    echo   Create it with:
    echo   mkdir "%USERPROFILE%\.claude"
    echo   echo {"mcpServers":{"hevy":{"transport":{"type":"http","url":"http://127.0.0.1:8083/message"}}}} ^> "%USERPROFILE%\.claude\mcp_servers.json"
    set /a FAIL+=1
)
echo.

REM Test 6: Verify with a simple tool call
echo [6/6] Testing tool call (get-workout-count)...
curl -s -X POST http://127.0.0.1:8083/message -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"id\":3,\"method\":\"tools/call\",\"params\":{\"name\":\"get-workout-count\",\"arguments\":{}}}" > %TEMP%\hevy_count.json
findstr /C:"\"result\":" %TEMP%\hevy_count.json >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Tool call successful
    set /a PASS+=1
) else (
    echo [WARN] Tool call test failed - API key may not be configured
    set /a FAIL+=1
)
echo.

REM Summary
echo ========================================================================
echo  Verification Summary
echo ========================================================================
echo  Passed: %PASS%/6
echo  Failed: %FAIL%/6
echo.

if %FAIL% equ 0 (
    echo [SUCCESS] All tests passed!
    echo.
    echo Your Hevy MCP setup is complete. You can now:
    echo   1. Use Hevy MCP in Claude Code CLI (this terminal)
    echo   2. Use Hevy MCP in Claude.ai web app (https://claude.ai)
    echo.
    echo Available tools: get-workouts, get-workout, get-workout-count,
    echo                  create-workout, get-routines, get-routine,
    echo                  get-exercise-templates, and more...
) else (
    echo [WARNING] Some tests failed
    echo.
    echo To fix issues:
    echo   1. Make sure both proxies are running:
    echo      .\START_HEVY_DUAL_MODE.bat
    echo   2. Check your .env file has HEVY_API_KEY
    echo   3. Verify Claude Code CLI config at %USERPROFILE%\.claude\mcp_servers.json
    echo.
    echo For full documentation: DUAL_MODE_SETUP.md
)

echo ========================================================================
echo.

REM Cleanup
del %TEMP%\hevy_init.json 2>nul
del %TEMP%\hevy_tools.json 2>nul
del %TEMP%\hevy_count.json 2>nul

pause
