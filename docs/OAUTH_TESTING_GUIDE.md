# OAuth Testing Guide for Claude Connectors

Complete guide for testing OAuth Provider mode with MCP Proxy and Claude Connectors.

## Overview

The MCP Proxy supports **OAuth Provider mode**, allowing you to securely expose MCP servers to Claude Connectors over the internet with authentication.

This guide covers:
1. Setting up OAuth with GitHub (easiest for testing)
2. Testing with the built-in Echo Test Server
3. Connecting via Claude Connectors
4. Testing the full authentication flow

## Prerequisites

- Node.js 18 or higher
- GitHub account (for OAuth app)
- MCP Proxy installed

## Quick Start with Echo Test Server

### Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: `MCP Proxy Test` (or any name)
   - **Homepage URL**: `http://127.0.0.1:8080` (or your public URL)
   - **Authorization callback URL**: `http://127.0.0.1:8080/auth/callback`
   - **Application description**: Optional
4. Click "Register application"
5. Copy the **Client ID**
6. Click "Generate a new client secret" and copy it

### Step 2: Configure Environment Variables

Create `.env` file in `packages/mcp-http-proxy/`:

```bash
cd packages/mcp-http-proxy
cat > .env << 'EOF'
# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here

# Session Secret (generate a random one)
OAUTH_CLIENT_SECRET=your_generated_session_secret_here
EOF
```

**Generate OAUTH_CLIENT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Step 3: Start the Proxy with OAuth

```bash
cd packages/mcp-http-proxy
npx mcp-proxy --config examples/echo-oauth-test.config.js
```

You should see:
```
[INFO] MCP Proxy starting on http://127.0.0.1:8080
[INFO] OAuth Provider mode enabled (GitHub)
[INFO] MCP server started
```

### Step 4: Test OAuth Flow

#### 4.1 Check Health Endpoint
```bash
curl http://127.0.0.1:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "mcpRunning": true,
  "mcpInitialized": true,
  "authEnabled": true
}
```

#### 4.2 Test Protected Routes (Should Fail Without Auth)
```bash
curl http://127.0.0.1:8080/tools
```

Expected response: `401 Unauthorized`

#### 4.3 Initiate OAuth Login

Open browser to:
```
http://127.0.0.1:8080/auth/login
```

You should be redirected to GitHub's authorization page.

#### 4.4 Authorize the App

Click "Authorize" on the GitHub page. You'll be redirected back to:
```
http://127.0.0.1:8080/auth/callback?code=...
```

The proxy will exchange the code for an access token and create a session.

#### 4.5 Check Authenticated Endpoints

```bash
# Check your user info
curl http://127.0.0.1:8080/auth/me
```

Expected response (with your GitHub user info):
```json
{
  "authenticated": true,
  "user": {
    "login": "your-github-username",
    "name": "Your Name",
    ...
  }
}
```

```bash
# List available tools (should work now!)
curl http://127.0.0.1:8080/tools
```

Expected response:
```json
{
  "tools": [
    { "name": "echo", "description": "Echo back arguments..." },
    { "name": "ping", "description": "Check server..." },
    { "name": "get_time", "description": "Get current..." },
    { "name": "sum", "description": "Add two numbers..." }
  ]
}
```

## Connecting via Claude Connectors

### Option 1: Local Testing (Claude Desktop)

For local testing with Claude Desktop, you don't need OAuth — use stdio directly:

```json
{
  "mcpServers": {
    "echo-test": {
      "command": "node",
      "args": ["/path/to/mcp-proxy-monorepo/packages/mcp-http-proxy/examples/test-server/echo-mcp-server.js"]
    }
  }
}
```

### Option 2: Remote Testing with OAuth

For testing Claude Connectors with OAuth over HTTP:

1. **Expose your proxy publicly** (use Cloudflare Tunnel or ngrok):
   ```bash
   # Using Cloudflare Tunnel (recommended)
   npx cloudflare-tunnel --url http://127.0.0.1:8080
   ```

2. **Update OAuth App Callback URL**:
   - Go back to your GitHub OAuth App settings
   - Update Authorization callback URL to your public URL:
     ```
     https://your-public-domain.com/auth/callback
     ```

3. **Update Proxy Config** with your public URL:
   ```javascript
   // In examples/echo-oauth-test.config.js
   callbackUrl: 'https://your-public-domain.com/auth/callback'
   ```

4. **Restart the Proxy**

5. **Test the full flow** with your public URL

## Testing with Claude Connectors

### Manual Testing via Browser

1. Visit `https://your-domain.com/health`
2. Click "Login with GitHub" or visit `/auth/login`
3. Complete OAuth flow
4. Try accessing `/tools` — should show tools
5. Call a tool via `/message` endpoint

### Testing via API

```bash
# 1. Get session cookie from OAuth flow
# (Browse to /auth/login, complete auth, copy session cookie)

# 2. Call a tool with authentication
curl -H "Cookie: session=your_session_cookie" \
  -H "Content-Type: application/json" \
  -X POST \
  http://127.0.0.1:8080/message \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "echo",
      "arguments": {"message": "Hello OAuth!"}
    }
  }'
```

## Troubleshooting

### Issue: "Invalid OAuth callback URL"
- **Cause**: OAuth app callback URL doesn't match the proxy's callback URL
- **Fix**: Ensure they match exactly (including http/https and port)

### Issue: "Session secret not set"
- **Cause**: `OAUTH_CLIENT_SECRET` not in `.env`
- **Fix**: Generate and add to `.env`

### Issue: Protected routes return 401 even after OAuth
- **Cause**: Session not being stored or cookie not being sent
- **Fix**: Check browser's developer console for cookies

### Issue: GitHub OAuth page shows "Redirect URI mismatch"
- **Cause**: Authorization callback URL in GitHub app doesn't match request
- **Fix**: Update GitHub OAuth app with exact callback URL

## Testing Checklist

- [ ] Health endpoint shows `authEnabled: true`
- [ ] `/auth/login` redirects to OAuth provider
- [ ] OAuth flow completes successfully
- [ ] `/auth/me` returns user information
- [ ] `/tools` returns tool list (authenticated)
- [ ] Can call tools via `/message` endpoint
- [ ] Logout works (`POST /auth/logout`)
- [ ] After logout, protected routes return 401

## Next Steps

- Test with real MCP servers (Hevy, LibreOffice)
- Set up Cloudflare Tunnel for public access
- Configure additional OAuth providers (Google, Auth0)
- Test with Claude Connectors in production

## Related Documentation

- `packages/mcp-http-proxy/QUICKSTART.md` — Hevy + OAuth setup
- `packages/mcp-http-proxy/examples/test-server/README.md` — Echo test server
- `.validation/MANUAL_TESTING.md` — General testing procedures
