@echo off
REM ========================================================================
REM LibreOffice Calc Connector - Stop Script (Dual Mode)
REM ========================================================================
REM
REM This stops ALL LibreOffice services:
REM   - LibreOffice Headless (socket mode)
REM   - OAuth Proxy (port 8085)
REM   - Local Proxy (port 8084)
REM   - Cloudflare Tunnel
REM
REM Use this when you're done using LibreOffice with Claude.
REM
REM ========================================================================

cd packages\libreoffice-calc-mcp
call STOP_LIBREOFFICE_PROXY.bat
