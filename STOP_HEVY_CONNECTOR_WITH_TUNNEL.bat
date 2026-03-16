@echo off
REM ========================================================================
REM Hevy MCP Connector - Stop Script (Dual Mode)
REM ========================================================================
REM
REM This stops BOTH Hevy MCP proxies and Cloudflare Tunnel:
REM   - OAuth Proxy (port 8082)
REM   - Local Proxy (port 8083)
REM   - Cloudflare Tunnel
REM
REM Use this when you're done using Hevy with Claude.
REM
REM ========================================================================

cd packages\mcp-http-proxy
call STOP_HEVY_DUAL_MODE.bat
