@echo off
REM ========================================================================
REM Start Hevy MCP Proxy (Quick Entry Point)
REM ========================================================================
REM
REM Root-level convenience script for starting Hevy proxy in local mode.
REM Delegates to packages/mcp-http-proxy/start-hevy-local-proxy.bat
REM
REM Usage: Run this before starting Claude Code CLI
REM
REM ========================================================================

cd /d "%~dp0packages\mcp-http-proxy"
call start-hevy-local-proxy.bat
cd /d "%~dp0"
