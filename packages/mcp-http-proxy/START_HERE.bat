@echo off
REM ========================================================================
REM MCP HTTP Proxy - Start Here Guide
REM ========================================================================
REM
REM This file shows you what each batch file does.
REM
REM ========================================================================

echo.
echo ========================================================================
echo  MCP HTTP Proxy - Hevy Connector
echo ========================================================================
echo.
echo What do you want to do?
echo.
echo.
echo   [1] START EVERYTHING (Daily Quickstart)
echo       → Run start-tunnel.bat
echo       → Starts Proxy + Cloudflare Tunnel
echo       → Use this for Claude Connectors
echo.
echo   [2] START PROXY ONLY (No HTTPS)
echo       → Run start.bat
echo       → Starts Proxy on localhost only
echo       → For local testing
echo.
echo   [3] STOP EVERYTHING
echo       → Run stop.bat
echo       → Stops Proxy + Tunnel
echo.
echo   [4] VIEW FULL DOCUMENTATION
echo       → Open QUICKSTART.md
echo.
echo.
echo ========================================================================
echo.
echo RECOMMENDED: Just run start-tunnel.bat for daily use!
echo.
echo Press any key to launch start-tunnel.bat...
pause > nul

call start-tunnel.bat
