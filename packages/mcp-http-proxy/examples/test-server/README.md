# Echo Test MCP Server

A simple MCP server for testing OAuth Provider mode without external dependencies.

## Purpose

This server provides minimal MCP functionality for testing:
- **OAuth Provider mode** — Test authentication flows without hevy-mcp or LibreOffice
- **Proxy functionality** — Verify HTTP-to-stdio bridging works
- **Tool execution** — Test tool calling with simple echo/ping/sum tools

## Quick Start

### Without OAuth (Basic Testing)

```bash
cd packages/mcp-http-proxy
npx mcp-proxy --config examples/echo-test.config.js
```

### With OAuth (OAuth Provider Testing)

**Step 1: Create `.env` file:**
```bash
cd packages/mcp-http-proxy
cat > .env << EOF
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_CLIENT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
EOF
```

**Step 2: Create GitHub OAuth App:**
1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set Homepage URL: `http://127.0.0.1:8080`
4. Set Authorization callback: `http://127.0.0.1:8080/auth/callback`
5. Copy Client ID and create Client Secret

**Step 3: Start the proxy with OAuth:**
```bash
npx mcp-proxy --config examples/echo-oauth-test.config.js
```

**Step 4: Test the OAuth flow:**
```bash
# Check health (should show authEnabled: true)
curl http://127.0.0.1:8080/health

# Initiate OAuth login (should redirect to GitHub)
curl -L http://127.0.0.1:8080/auth/login

# After OAuth, check authenticated endpoints
curl http://127.0.0.1:8080/auth/me
curl http://127.0.0.1:8080/tools
```

## Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `echo` | Echo back arguments | `message` (optional string) |
| `ping` | Check server responsiveness | none |
| `get_time` | Get current server time | none |
| `sum` | Add two numbers | `a`, `b` (required numbers) |

## Testing with Claude

Add this connector to Claude with URL:
- Without OAuth: `http://127.0.0.1:8080/mcp`
- With OAuth: `http://127.0.0.1:8080/sse` (requires authentication)

Example prompts:
- "Ping the server"
- "Echo the message 'Hello World'"
- "What's the current time on the server?"
- "Add 5 and 3"

## Standalone Usage

You can also run the echo server directly via stdio:

```bash
cd packages/mcp-http-proxy/examples/test-server
npm install
node echo-mcp-server.js
```

Then use with any MCP client that supports stdio transport.
