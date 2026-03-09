# hevy-mcp HTTP Proxy

HTTP proxy for [hevy-mcp](https://github.com/chrisdoc/hevy-mcp) using [mcp-http-proxy](https://github.com/RhoMancer/mcp-proxy-monorepo/tree/master/packages/mcp-http-proxy).

This allows hevy-mcp (which only supports stdio transport) to work with AI clients that require HTTPS endpoints.

## Quick Start

```bash
# Install dependencies
npm install

# Set your Hevy API key
echo "HEVY_API_KEY=your_api_key_here" > .env

# Start the proxy
npm start
```

## Configuration

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `HEVY_API_KEY` | Your Hevy API key (required) | *none* |
| `MCP_PROXY_PORT` | HTTP proxy port | `8080` |
| `MCP_PROXY_HOST` | HTTP proxy host | `127.0.0.1` |

Set these in a `.env` file in the package directory:
```bash
HEVY_API_KEY=your_actual_api_key_here
MCP_PROXY_PORT=8080
MCP_PROXY_HOST=127.0.0.1
```

You can also edit `mcp.config.js` to customize other settings.

## Cloudflare Tunnel (Optional)

This proxy can use a Cloudflare tunnel for HTTPS access.

### Setup

1. Create a Cloudflare tunnel at https://dash.cloudflare.com/
2. Copy `config.example.yml` to `config.yml`
3. Edit `config.yml` with your tunnel details:

```yaml
tunnel: your-tunnel-id-here
credentials-file: C:/Users/YOUR_USERNAME/.cloudflared/your-tunnel-id-here.json

ingress:
  - hostname: your-hevy-mcp-domain.example.com
    service: http://localhost:8080
  - service: http://localhost:8080
```

4. Start with the tunnel:
```bash
# Windows
start.bat

# Or manually:
cloudflared.exe tunnel --config config.yml run
```

## Add to Claude Connectors

### Local Access
| Field | Value |
|-------|-------|
| **Name** | `hevy-mcp` |
| **Remote MCP server URL** | `http://127.0.0.1:8080/messages` |

### Remote Access (with Cloudflare Tunnel)
| Field | Value |
|-------|-------|
| **Name** | `hevy-mcp` |
| **Remote MCP server URL** | `https://your-proxy-domain.example.com/messages` |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Connectors UI                     │
│                  (requires HTTPS endpoint)                  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS POST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Named Tunnel (Optional)             │
│           your-proxy-domain.example.com                     │
└────────────────────────────┬────────────────────────────────┘
                             │ Forwards to
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              mcp-http-proxy (localhost:8080)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • CORS enabled for browser clients                  │  │
│  │  • Preserves JSON-RPC request IDs                    │  │
│  │  • HTTP POST → JSON-RPC 2.0 → stdin                 │  │
│  │  • stdout ← JSON-RPC 2.0 ← HTTP Response            │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ stdio (JSON-RPC)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    hevy-mcp (npx)                           │
│                 HEVY_API_KEY via .env                       │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS API calls
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                       Hevy API                              │
│                    (api.hevy.app)                           │
└─────────────────────────────────────────────────────────────┘
```

## Project Files

| File | Purpose |
|------|---------|
| `mcp.config.js` | Configuration for mcp-http-proxy |
| `config.example.yml` | Cloudflare tunnel configuration template |
| `config.yml` | Your actual Cloudflare tunnel configuration (gitignored) |
| `start.bat` | Startup script for proxy + tunnel |
| `.env` | API key configuration (gitignored) |
| `cloudflared.exe` | Cloudflare tunnel binary |

## Based on

This proxy uses [mcp-http-proxy](https://github.com/RhoMancer/mcp-proxy-monorepo/tree/master/packages/mcp-http-proxy), a generic HTTP-to-stdio proxy for MCP servers.

## Available MCP Tools (20 total)

**Workouts:** `get-workouts`, `get-workout`, `create-workout`, `update-workout`, `get-workout-count`, `get-workout-events`

**Routines:** `get-routines`, `get-routine`, `create-routine`, `update-routine`

**Exercises:** `get-exercise-templates`, `get-exercise-template`, `get-exercise-history`, `create-exercise-template`

**Folders:** `get-routine-folders`, `get-routine-folder`, `create-routine-folder`

**Webhooks:** `get-webhook-subscription`, `create-webhook-subscription`, `delete-webhook-subscription`

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/tools` | GET | List available MCP tools |
| `/message` | POST | JSON-RPC endpoint |
| `/messages` | POST | JSON-RPC endpoint (for Claude) |

## Troubleshooting

**"Port already in use" (8080):**
```bash
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

**Or use a different port:**
```bash
# In .env
MCP_PROXY_PORT=8081
```

**Health check:**
```bash
curl http://127.0.0.1:8080/health
# Should return: {"status":"ok","mcpRunning":true,"mcpInitialized":true}
```

**Test MCP endpoint:**
```bash
curl -X POST http://127.0.0.1:8080/messages \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

## Related Links

- hevy-mcp repo: https://github.com/chrisdoc/hevy-mcp
- Hevy API: https://hevy.app/api
- mcp-http-proxy: https://github.com/RhoMancer/mcp-proxy-monorepo/tree/master/packages/mcp-http-proxy
