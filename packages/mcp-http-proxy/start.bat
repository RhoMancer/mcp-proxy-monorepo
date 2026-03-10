@echo off
REM Start MCP HTTP Proxy with OAuth Provider mode for Claude Connectors
REM This loads environment variables from .env file

echo Starting MCP HTTP Proxy with OAuth Provider mode...
echo Configuration: claude-connectors-hevy.config.js
echo.

node src/cli.js -c examples/claude-connectors-hevy.config.js

pause
