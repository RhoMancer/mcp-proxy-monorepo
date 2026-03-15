# Dual-Mode Setup: Claude Code CLI + Claude.ai Web App

**Example Setup: Hevy MCP Dual-Mode Configuration**

> **Note:** This guide demonstrates the dual-mode setup using Hevy as a showcase example. The dual-mode pattern (simultaneous local + OAuth access) can be applied to any MCP server.

This guide explains how to run **three services simultaneously**:
- **Cloudflare Tunnel** - Routes external traffic to OAuth proxy
- **OAuth Provider mode (port 8082)** - For Claude.ai web app with Cloudflare Tunnel
- **Local mode (port 8083)** - For Claude Code CLI (no authentication)

## Why Three Services?

| Service | Port/URL | Use Case | Authentication |
|---------|----------|----------|----------------|
| **Cloudflare Tunnel** | `your-tunnel-url.example.com` | Routes external traffic | None |
| **OAuth Provider** | 8082 (internal) | Claude.ai web app | OAuth credentials |
| **Local Mode** | 8083 | Claude Code CLI | None |

Running all three allows you to:
1. Develop and test locally using Claude Code CLI
2. Use the MCP connector in the Claude.ai web app simultaneously
3. Have a seamless workflow across both environments

## ⚠️ Important: Startup Order

**CRITICAL:** Start the proxies BEFORE starting Claude Code CLI.

| Order | Step | Why |
|-------|------|-----|
| 1️⃣ | Start proxies (see below) | MCP servers must be running first |
| 2️⃣ | Start Claude Code CLI | It discovers MCP tools at startup only |
| 3️⃣ | Use Claude.ai | Connects via tunnel anytime |

**Why this matters:**
- Claude Code CLI reads MCP server configurations **once at startup**
- If servers aren't available, it marks them unavailable and **doesn't retry**
- SSE connections are stateful — they don't auto-reconnect after server restarts

**After computer restart:**
1. Run `.\START_HEVY_DUAL_MODE.bat` first
2. Then start Claude Code CLI
3. Tools will be available immediately

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
# Check local proxy (for Claude Code CLI)
curl http://127.0.0.1:8083/health

# Check OAuth proxy (for Claude.ai)
curl http://127.0.0.1:8082/health

# Check Cloudflare Tunnel (optional - from outside your network)
curl https://your-tunnel-url.example.com/health
```

All should return:
```json
{"status":"ok"}
```

## Service Status Checklist

Before using Claude, verify all three services are running:

| Service | Command to Check | Expected Result |
|---------|------------------|-----------------|
| Local Proxy | `curl http://127.0.0.1:8083/health` | `{"status":"ok",...}` |
| OAuth Proxy | `curl http://127.0.0.1:8082/health` | `{"status":"ok",...}` |
| Cloudflare Tunnel | `tasklist \| findstr cloudflared` | `cloudflared.exe` listed |

**If any service is missing:** Run `.\START_HEVY_DUAL_MODE.bat` again.

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
    domain: 'your-tunnel-url.example.com',
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
   - **Name:** Your MCP Server Name
   - **Remote MCP server URL:** `https://your-tunnel-url.example.com/message`
   - **OAuth Client ID:** `your-client-id`
   - **OAuth Client Secret:** (from `.env` file → `OAUTH_CLIENT_SECRET`)

## Environment Variables

Required in `packages/mcp-http-proxy/.env`:
```bash
YOUR_MCP_SERVER_API_KEY=your_api_key_here
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
2. **Verify Cloudflare Tunnel is running:** `tasklist | grep cloudflared`
3. If tunnel not running: `cloudflared tunnel --config config.yml run`
4. Check OAuth secret matches in `.env` file
5. Test tunnel directly: `curl https://hevy.angussoftware.dev/health`

### Tools Not Showing in Claude

1. **Verify startup order:** Proxies MUST be running before Claude Code starts
2. **Restart Claude Code CLI** after starting proxies
3. Check proxy logs for errors
4. Verify HEVY_API_KEY is set in `.env`

### Computer Restarted? (Session Lost)

When your computer restarts, all background processes are killed:

```bash
# 1. Start proxies first
.\START_HEVY_DUAL_MODE.bat

# 2. Then restart Claude Code CLI
# Tools will be available on next session
```

**Why:** SSE connections are stateful. The client (Claude Code) must re-establish the connection after the server restarts. This only happens on Claude Code startup, not when proxies start.

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

## Emergency Recovery (Cat Incident Protocol)

If your computer suddenly loses power (cat on power button, etc.):

```bash
# Step 1: Start all three services
cd packages/mcp-http-proxy
.\START_HEVY_DUAL_MODE.bat

# Step 2: Restart Claude Code CLI
# Close and reopen your terminal/IDE

# Step 3: Verify all three services
curl http://127.0.0.1:8083/health    # Local proxy
curl http://127.0.0.1:8082/health    # OAuth proxy
curl https://your-tunnel-url.example.com/health  # Tunnel (optional)
```

**Remember:** All three services → THEN Claude Code. Always.

## Summary

- **Port 8083 (local):** For Claude Code CLI - no auth, simpler setup
- **Port 8082 (OAuth):** For Claude.ai web app - requires OAuth credentials and tunnel
- **Both can run simultaneously** without conflicts
- **Share the same HEVY_API_KEY** from environment variables
- **Startup order matters:** Proxies → Claude Code → Everything else

For more details, see:
- [README.md](README.md) - Full documentation
- [QUICKSTART.md](QUICKSTART.md) - Single-mode setup guide
- [docs/claude-connectors-guide.md](docs/claude-connectors-guide.md) - Claude Connectors details
