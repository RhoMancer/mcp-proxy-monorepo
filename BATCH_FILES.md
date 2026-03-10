# Batch Scripts Reference

This document describes the purpose and usage of all batch scripts in the monorepo.

## Root Level Scripts

These are the primary entry points for daily use.

| Script | Purpose |
|--------|---------|
| `START_HEVY_CONNECTOR_WITH_TUNNEL.bat` | Starts Hevy MCP connector with Cloudflare Tunnel for HTTPS access |
| `STOP_HEVY_CONNECTOR_WITH_TUNNEL.bat` | Stops Hevy MCP connector and tunnel |

## Package: mcp-http-proxy

Generic MCP HTTP proxy scripts and Hevy-specific convenience wrappers.

| Script | Purpose |
|--------|---------|
| `START_PROXY_WITH_CONFIG.bat` | Generic proxy starter - accepts any config file as argument |
| `START_HEVY.bat` | Hevy-specific: Starts proxy only (local development) |
| `START_HEVY_WITH_TUNNEL.bat` | Hevy-specific: Starts proxy + Cloudflare Tunnel |
| `STOP_PROXY_AND_TUNNEL.bat` | Stops proxy and tunnel processes |

### Usage Examples

```batch
REM Generic proxy with custom config
START_PROXY_WITH_CONFIG.bat examples/claude-connectors-libreoffice.config.js

REM Or use the Hevy-specific scripts
START_HEVY.bat                    # Local proxy only
START_HEVY_WITH_TUNNEL.bat        # Proxy + tunnel
```

## Package: libreoffice-calc-mcp

LibreOffice Calc MCP connector scripts.

| Script | Purpose |
|--------|---------|
| `START_LIBREOFFICE_HEADLESS.bat` | Starts LibreOffice in headless socket mode only |
| `START_LIBREOFFICE_PROXY.bat` | Starts MCP proxy (assumes LibreOffice is running) |
| `START_LIBREOFFICE_AND_PROXY.bat` | All-in-one: Starts LibreOffice + proxy together |
| `STOP_LIBREOFFICE_PROXY.bat` | Stops LibreOffice Calc MCP services |

### Typical Workflow

```batch
REM Option 1: All at once
START_LIBREOFFICE_AND_PROXY.bat

REM Option 2: Step by step
START_LIBREOFFICE_HEADLESS.bat
START_LIBREOFFICE_PROXY.bat

REM When done
STOP_LIBREOFFICE_PROXY.bat
```

## Design Principles

1. **Clear Naming**: Each script name explicitly describes what it does
2. **Layered Hierarchy**: Root scripts for users, package scripts for developers
3. **Generic + Specific**: Generic tools work with any config, specific scripts for common use cases
4. **No Redundancy**: Each script has a unique purpose - no "launcher" scripts that just call others without adding value

## Quick Reference

### For Hevy Connector Users
- **Start**: `START_HEVY_CONNECTOR_WITH_TUNNEL.bat` (from repo root)
- **Stop**: `STOP_HEVY_CONNECTOR_WITH_TUNNEL.bat` (from repo root)

### For LibreOffice Calc Users
- **Start**: `packages\libreoffice-calc-mcp\START_LIBREOFFICE_AND_PROXY.bat`
- **Stop**: `packages\libreoffice-calc-mcp\STOP_LIBREOFFICE_PROXY.bat`

### For Developers
- **Generic proxy**: `packages\mcp-http-proxy\START_PROXY_WITH_CONFIG.bat [config]`
- **Stop all**: `packages\mcp-http-proxy\STOP_PROXY_AND_TUNNEL.bat`
