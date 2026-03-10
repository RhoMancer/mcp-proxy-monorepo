@echo off
REM ========================================================================
REM Hevy MCP Connector - Stop Script
REM ========================================================================
REM
REM This stops both the MCP Proxy and Cloudflare Tunnel.
REM Use this when you're done using Claude Connectors.
REM
REM ========================================================================

cd packages\mcp-http-proxy
call stop.bat
