@echo off
REM ========================================================================
REM Hevy MCP Connector - Quick Reference
REM ========================================================================
REM
REM You're in the right place! Here's what you need:
REM
REM   TO START: Use START_HEVY_CONNECTOR.bat in the repo root
REM   TO STOP:  Use STOP_HEVY_CONNECTOR.bat in the repo root
REM
REM Or run the commands directly from this directory:
REM   - start-tunnel.bat  (starts proxy + cloudflare tunnel)
REM   - stop.bat           (stops everything)
REM
REM For full documentation, see: QUICKSTART.md
REM
REM ========================================================================

echo.
echo ========================================================================
echo  Hevy MCP Connector - Quick Reference
echo ========================================================================
echo.
echo From anywhere in the repo:
echo.
echo   START: START_HEVY_CONNECTOR.bat
echo   STOP:  STOP_HEVY_CONNECTOR.bat
echo.
echo Or from this directory:
echo.
echo   START: start-tunnel.bat
echo   STOP:  stop.bat
echo.
echo ========================================================================
echo.
echo Press any key to launch start-tunnel.bat...
pause > nul

call start-tunnel.bat
