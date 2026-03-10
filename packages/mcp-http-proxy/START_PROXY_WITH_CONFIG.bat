@echo off
REM ========================================================================
REM MCP HTTP Proxy - Generic Start Script
REM ========================================================================
REM
REM This starts the MCP HTTP Proxy with a configuration file of your choice.
REM
REM USAGE:
REM   START_PROXY_WITH_CONFIG.bat [config-file]
REM
REM If no config is specified, it will prompt you to pick from examples/.
REM
REM EXAMPLES:
REM   START_PROXY_WITH_CONFIG.bat examples/claude-connectors-hevy.config.js
REM   START_PROXY_WITH_CONFIG.bat examples/claude-connectors-libreoffice.config.js
REM   START_PROXY_WITH_CONFIG.bat examples/echo-test.config.js
REM
REM Available example configs:
REM   - claude-connectors-hevy.config.js      (Hevy workout tracker)
REM   - claude-connectors-libreoffice.config.js (LibreOffice Calc)
REM   - echo-test.config.js                   (Echo test server)
REM   - oauth-*.config.js                     (Various OAuth providers)
REM
REM For full docs, see: QUICKSTART.md
REM
REM ========================================================================

set CONFIG_FILE=%1

if "%CONFIG_FILE%"=="" (
    echo.
    echo ========================================================================
    echo  No configuration file specified.
    echo ========================================================================
    echo.
    echo Available example configurations:
    echo.
    dir /b examples\*.config.js
    echo.
    echo Usage: START_PROXY_WITH_CONFIG.bat [config-file]
    echo.
    echo Example: START_PROXY_WITH_CONFIG.bat examples/claude-connectors-hevy.config.js
    echo.
    pause
    exit /b 1
)

if not exist "%CONFIG_FILE%" (
    echo.
    echo ========================================================================
    echo  ERROR: Configuration file not found: %CONFIG_FILE%
    echo ========================================================================
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================================
echo  MCP HTTP Proxy - Starting
echo ========================================================================
echo.
echo Configuration: %CONFIG_FILE%
echo.
echo Starting proxy...
echo Press Ctrl+C to stop the proxy
echo.
echo ========================================================================
echo.

node src/cli.js -c "%CONFIG_FILE%"

pause
