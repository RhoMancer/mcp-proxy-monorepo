# Dual-Mode Setup: Claude Code CLI + Claude.ai Web App

This guide explains how to run **two proxy instances simultaneously** for Hevy MCP:
- **Local mode (port 8083)** - For Claude Code CLI (no authentication)
- **OAuth Provider mode (port 8082)** - For Claude.ai web app with Cloudflare Tunnel

## Why Two Proxies?

| Mode | Port | Use Case | Authentication | Tunnel |
|------|------|----------|----------------|--------|
| **Local** | 8083 | Claude Code CLI | None | No |
| **OAuth Provider** | 8082 | Claude.ai web app | OAuth credentials | Yes (Cloudflare) |

Running both allows you to:
1. Develop and test locally using Claude Code CLI
2. Use the Hevy connector in the Claude.ai web app simultaneously
3. Have a seamless workflow across both environments

## Quick Start

### Option 1: Use the Batch File (Windows)

```bash
.\START_HEVY_DUAL_MODE.bat
```

This will start both proxies in separate terminal windows:
- Terminal 1: OAuth Provider mode (port 8082) with Cloudflare Tunnel
- Terminal 2: Local mode (port 8083) for Claude Code CLI

### Option 2: Manual Start

**Terminal 1 - OAuth Provider (for Claude.ai web app):**
```bash
cd packages/mcp-http-proxy
node src/cli.js -c ../examples/claude-connectors-hevy.config.js
```

**Terminal 2 - Local mode (for Claude Code CLI):**
```bash
cd packages/mcp-http-proxy
node src/cli.js -c ../examples/hevy-local.config.js
```

## Verify Both Proxies

```bash
curl http://127.0.0.1:8082/health
curl http://127.0.0.1:8083/health
```

Both should return:
```json
{"status":"ok"}
```

## Configuration

### Local Mode Config (`hevy-local.config.js`)

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  },
  server: {
    port: 8083,
    host: '127.0.0.1'
  }
  // NO oauthProvider - this is for local CLI access only
};
```

### OAuth Provider Config (`claude-connectors-hevy.config.js`)

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  },
  server: {
    port: 8082,
    host: '127.0.0.1'
  },
  tunnel: {
    domain: 'hevy.angussoftware.dev',
    tunnelId: 'your-tunnel-id'
  },
  oauthProvider: {
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'hevy-secret-key-change-me'
  }
};
```

## Claude Code CLI Configuration

Configure Claude Code to connect to the local proxy:

**File:** `~/.claude/mcp_servers.json`
```json
{
  "mcpServers": {
    "hevy": {
      "transport": {
        "type": "http",
        "url": "http://127.0.0.1:8083/message"
      }
    }
  }
}
```

## Claude.ai Web App Configuration

1. Go to **Claude.ai** → **Add custom connector** (Beta)
2. Fill in:
   - **Name:** Hevy Workout Tracker
   - **Remote MCP server URL:** `https://hevy.angussoftware.dev/message`
   - **OAuth Client ID:** `claude-hevy-client`
   - **OAuth Client Secret:** (from `.env` file → `OAUTH_CLIENT_SECRET`)

## Environment Variables

Required in `packages/mcp-http-proxy/.env`:
```bash
HEVY_API_KEY=your_hevy_api_key_from_hevy_app
OAUTH_CLIENT_SECRET=your_generated_oauth_secret
```

Generate OAuth secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Available Tools

When connected, you'll have access to 18 Hevy MCP tools:
- `get-workouts` - List workouts with pagination
- `get-workout` - Get specific workout details
- `get-workout-count` - Get total workout count
- `create-workout` - Create a new workout
- `update-workout` - Update an existing workout
- `get-routines` - List workout routines
- `get-routine` - Get specific routine
- `create-routine` - Create a new routine
- `update-routine` - Update a routine
- `get-exercise-templates` - List exercise templates
- `get-exercise-template` - Get specific exercise template
- `get-exercise-history` - Get exercise history
- `create-exercise-template` - Create custom exercise
- `get-routine-folders` - List routine folders
- `get-routine-folder` - Get specific folder
- `create-routine-folder` - Create a folder
- `get-webhook-subscription` - Get webhook info
- `create-webhook-subscription` - Create webhook
- `delete-webhook-subscription` - Delete webhook

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
netstat -ano | findstr :8082
netstat -ano | findstr :8083

# Kill it if needed
taskkill /PID <PID> /F
```

### Claude Code CLI Can't Connect

1. Verify local proxy is running: `curl http://127.0.0.1:8083/health`
2. Check `~/.claude/mcp_servers.json` has correct URL
3. Restart Claude Code CLI

### Claude.ai Web App Can't Connect

1. Verify OAuth proxy is running: `curl http://127.0.0.1:8082/health`
2. Verify Cloudflare Tunnel is running
3. Check OAuth secret matches in `.env` file

### Tools Not Showing in Claude

1. Restart Claude (both CLI and web app)
2. Check proxy logs for errors
3. Verify HEVY_API_KEY is set in `.env`

## Stopping Both Proxies

**Option 1:** Close both terminal windows

**Option 2:** Use the stop script
```bash
.\STOP_HEVY_DUAL_MODE.bat
```

**Option 3:** Kill by port
```bash
taskkill /F /FI "WINDOWTITLE eq MCP Proxy*"
```

## Summary

- **Port 8083 (local):** For Claude Code CLI - no auth, simpler setup
- **Port 8082 (OAuth):** For Claude.ai web app - requires OAuth credentials and tunnel
- **Both can run simultaneously** without conflicts
- **Share the same HEVY_API_KEY** from environment variables

For more details, see:
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Single-mode setup guide
- [docs/claude-connectors-guide.md](docs/claude-connectors-guide.md) - Claude Connectors details
