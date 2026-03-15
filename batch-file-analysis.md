# Batch File Analysis

## Overview
Total batch files found: 17

## By Location

### Root Level (4 files)
- `START_HEVY_CONNECTOR_WITH_TUNNEL.bat` - Entry point for Hevy + tunnel (delegates to package)
- `STOP_HEVY_CONNECTOR_WITH_TUNNEL.bat` - Stop Hevy processes
- `START_LIBREOFFICE_CONNECTOR_WITH_TUNNEL.bat` - Entry point for LibreOffice (delegates to package)
- `start-hevy-proxy.bat` - Quick start for Claude Code CLI (local only, port 8083)

### packages/mcp-http-proxy/ (7 files)
- `START_HEVY.bat` - Hevy local proxy only
- `START_HEVY_WITH_TUNNEL.bat` - Hevy + tunnel
- `START_HEVY_DUAL_MODE.bat` - Dual-mode startup (Claude Code + Claude.ai simultaneously)
- `STOP_HEVY_DUAL_MODE.bat` - Dual-mode stop
- `START_PROXY_WITH_CONFIG.bat` - Generic proxy starter
- `STOP_PROXY_AND_TUNNEL.bat` - Stop script
- `verify_claude_code_setup.bat` - Verification script

### packages/libreoffice-calc-mcp/ (5 files)
- `START_LIBREOFFICE_HEADLESS.bat` - LibreOffice headless mode
- `START_LIBREOFFICE_PROXY.bat` - Proxy only
- `START_LIBREOFFICE_AND_PROXY.bat` - Both together
- `START_LIBREOFFICE_WITH_TUNNEL.bat` - With tunnel
- `STOP_LIBREOFFICE_PROXY.bat` - Stop script

### packages/libreoffice-calc-mcp-server/ (1 file)
- `START_LIBREOFFICE_HEADLESS.bat` - **DUPLICATE**

## Duplicates Found

### 1. START_LIBREOFFICE_HEADLESS.bat

**Location 1:** `packages/libreoffice-calc-mcp/START_LIBREOFFICE_HEADLESS.bat`
- Lines: 27
- Features: Better structure, uses `start ""`, includes 5-second timeout for socket readiness
- Purpose: Integration package (user-facing)

**Location 2:** `packages/libreoffice-calc-mcp-server/START_LIBREOFFICE_HEADLESS.bat`
- Lines: 16
- Features: Simpler, blocks until LibreOffice stops
- Purpose: Server package (Python MCP server implementation)

**Recommendation:** Keep the calc-mcp version, remove calc-mcp-server version
**Rationale:** The calc-mcp version is more polished and is in the user-facing integration package

## Non-Duplicates Analysis

### start-hevy-proxy.bat vs START_HEVY_CONNECTOR_WITH_TUNNEL.bat

**start-hevy-proxy.bat:**
- Purpose: Quick start for Claude Code CLI (local development)
- Starts: Local proxy only on port 8083
- Features: Health check, hardcoded absolute path (not ideal)
- Use case: Development with Claude Code CLI

**START_HEVY_CONNECTOR_WITH_TUNNEL.bat:**
- Purpose: Start Hevy with Cloudflare Tunnel for Claude.ai
- Starts: Proxy + tunnel
- Features: Uses relative paths, delegates to package script
- Use case: Production access via Claude.ai

**Recommendation:** Keep both (different purposes)
**Note:** start-hevy-proxy.bat could be improved to use relative paths

## Root Script Delegation Pattern

All root scripts properly follow the delegation pattern:
1. Change directory to package (`cd packages\...`)
2. Call package script (`call SCRIPT.bat`)
3. Return to root (implicit via call)

## Summary

- **Duplicates to remove:** 1 file
  - `packages/libreoffice-calc-mcp-server/START_LIBREOFFICE_HEADLESS.bat`
- **Files to keep:** 16 files
- **Root scripts follow delegation:** ✓ Yes
