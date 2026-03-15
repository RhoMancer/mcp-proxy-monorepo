# Batch Scripts Reference

This document describes the purpose and usage of all batch scripts in the monorepo.

## Root -> Package Pattern

**Design principle:** Root-level scripts are entry points that delegate to package scripts.

- **Root scripts**: High-level user-facing entry points for common workflows
- **Package scripts**: Implementation details containing the actual commands
- **Delegation**: Root scripts `cd` to the package directory and `call` the package script

When adding new scripts:
1. Place implementation scripts in `packages/[package-name]/`
2. Add root entry points only for commonly used workflows
3. Root scripts should delegate, not duplicate logic

---

## Root Level Scripts

Primary entry points for daily use.

| Script | Purpose | Delegates To |
|--------|---------|--------------|
| `START_HEVY_CONNECTOR_WITH_TUNNEL.bat` | Hevy with Cloudflare Tunnel (Claude.ai access) | `packages/mcp-http-proxy/START_HEVY_WITH_TUNNEL.bat` |
| `STOP_HEVY_CONNECTOR_WITH_TUNNEL.bat` | Stop Hevy connector and tunnel | `packages/mcp-http-proxy/STOP_PROXY_AND_TUNNEL.bat` |
| `START_LIBREOFFICE_CONNECTOR_WITH_TUNNEL.bat` | LibreOffice with tunnel | `packages/libreoffice-calc-mcp/START_LIBREOFFICE_WITH_TUNNEL.bat` |
| `start-hevy-proxy.bat` | Quick start for Claude Code CLI (local only) | `packages/mcp-http-proxy/start-hevy-local-proxy.bat` |

---

## Package: mcp-http-proxy

Generic MCP HTTP proxy scripts and Hevy-specific convenience wrappers.

| Script | Purpose |
|--------|---------|
| `START_PROXY_WITH_CONFIG.bat` | Generic proxy starter - accepts any config file as argument |
| `START_HEVY.bat` | Hevy: Local proxy only (port 8083, no auth) |
| `start-hevy-local-proxy.bat` | Hevy: Local proxy with health check and auto-start verification |
| `START_HEVY_WITH_TUNNEL.bat` | Hevy: Proxy + Cloudflare Tunnel (OAuth required) |
| `START_HEVY_DUAL_MODE.bat` | Hevy: Both local (8083) + tunnel (8082) simultaneously |
| `STOP_HEVY_DUAL_MODE.bat` | Stop both dual-mode proxy instances |
| `STOP_PROXY_AND_TUNNEL.bat` | Stop proxy and tunnel processes |
| `verify_claude_code_setup.bat` | Verify Claude Code CLI can discover MCP tools |

### Usage Examples

```batch
REM Generic proxy with custom config
START_PROXY_WITH_CONFIG.bat examples/claude-connectors-libreoffice.config.js

REM Hevy local development (Claude Code CLI)
START_HEVY.bat                    # Local proxy only, port 8083

REM Hevy with tunnel (Claude.ai)
START_HEVY_WITH_TUNNEL.bat        # Proxy + tunnel, port 8082

REM Dual-mode (both simultaneously)
START_HEVY_DUAL_MODE.bat          # Claude Code + Claude.ai at same time
```

---

## Package: libreoffice-calc-mcp

LibreOffice Calc MCP connector scripts.

| Script | Purpose |
|--------|---------|
| `START_LIBREOFFICE_HEADLESS.bat` | LibreOffice in headless socket mode only |
| `START_LIBREOFFICE_PROXY.bat` | MCP proxy only (assumes LibreOffice running) |
| `START_LIBREOFFICE_AND_PROXY.bat` | All-in-one: LibreOffice + proxy together |
| `START_LIBREOFFICE_WITH_TUNNEL.bat` | LibreOffice + proxy + Cloudflare Tunnel |
| `STOP_LIBREOFFICE_PROXY.bat` | Stop LibreOffice Calc MCP services |

### Typical Workflow

```batch
REM Option 1: All at once (local)
START_LIBREOFFICE_AND_PROXY.bat

REM Option 2: All at once (with tunnel)
START_LIBREOFFICE_WITH_TUNNEL.bat

REM Option 3: Step by step
START_LIBREOFFICE_HEADLESS.bat
START_LIBREOFFICE_PROXY.bat

REM When done
STOP_LIBREOFFICE_PROXY.bat
```

---

## Design Principles

1. **Clear Naming**: Script names explicitly describe what they do
2. **Layered Hierarchy**: Root for users, packages for developers
3. **Generic + Specific**: Generic tools work with any config, specific for common cases
4. **No Redundancy**: Each script has a unique purpose - no duplicate functionality

---

## Quick Reference

### Common Workflows

| Use Case | Command |
|----------|---------|
| Hevy local dev (Claude Code CLI) | `packages/mcp-http-proxy/START_HEVY.bat` |
| Hevy + tunnel (Claude.ai) | `START_HEVY_CONNECTOR_WITH_TUNNEL.bat` |
| Hevy dual-mode (both) | `packages/mcp-http-proxy/START_HEVY_DUAL_MODE.bat` |
| LibreOffice local | `packages/libreoffice-calc-mcp/START_LIBREOFFICE_AND_PROXY.bat` |
| LibreOffice + tunnel | `START_LIBREOFFICE_CONNECTOR_WITH_TUNNEL.bat` |
| Generic proxy | `packages/mcp-http-proxy/START_PROXY_WITH_CONFIG.bat [config]` |
| Stop all proxies | `packages/mcp-http-proxy/STOP_PROXY_AND_TUNNEL.bat` |

### Port Reference

| Port | Use Case | Auth Required |
|------|----------|---------------|
| 8082 | Hevy with tunnel (Claude.ai) | Yes (OAuth) |
| 8083 | Hevy local (Claude Code CLI) | No |
| 3000 | Default proxy port | Config-dependent |

---

## File Summary

**Total batch files: 16**

- **Root level:** 4 files
- **packages/mcp-http-proxy:** 7 files
- **packages/libreoffice-calc-mcp:** 5 files
