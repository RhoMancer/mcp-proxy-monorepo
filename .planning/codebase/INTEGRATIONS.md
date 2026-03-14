# External Integrations

**Analysis Date:** 2026-03-13

## APIs & External Services

**OAuth 2.0 Providers (for proxy authentication):**

- GitHub
  - Authorization: `https://github.com/login/oauth/authorize`
  - Token: `https://github.com/login/oauth/access_token`
  - Auth: env var `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Config: `packages/mcp-http-proxy/examples/oauth-github.config.js`

- Google
  - Authorization: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token: `https://oauth2.googleapis.com/token`
  - Auth: env var `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - Config: `packages/mcp-http-proxy/examples/oauth-google.config.js`

- Auth0
  - Authorization: `https://{domain}/authorize`
  - Token: `https://{domain}/oauth/token`
  - Auth: env var `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
  - Config: `packages/mcp-http-proxy/examples/oauth-auth0.config.js`

- Generic OAuth 2.0
  - Supports GitLab, Bitbucket, Azure AD, Discord, Spotify, Slack
  - Config: `packages/mcp-http-proxy/examples/oauth-generic.config.js`

**Health/Fitness API:**

- Hevy API
  - Purpose: Workout tracking integration
  - Auth: env var `HEVY_API_KEY`
  - SDK/Client: External `hevy-mcp` npm package
  - Config: `packages/mcp-http-proxy/examples/hevy-local.config.js`

## Data Storage

**Databases:**
- None (stateless proxy design)

**File Storage:**
- Local filesystem only - Spreadsheet files accessed via LibreOffice UNO

**Caching:**
- In-memory session storage (express-session with memory store by default)
- Authorization code storage (in-memory Map for OAuth Provider mode)

## Authentication & Identity

**Auth Provider:**
- Custom OAuth 2.0 implementation using Passport.js
- Location: `packages/mcp-http-proxy/src/auth/OAuth2Auth.js`
- Implementation:
  - Authorization Code Flow with redirect mode
  - Client Credentials Flow for OAuth Provider mode
  - PKCE (Proof Key for Code Exchange) for Claude Connectors
  - Session-based authentication with configurable maxAge

**OAuth Provider Mode (for Claude Connectors):**
- Location: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js`
- Acts as an OAuth provider rather than consumer
- Supports both PKCE authorization_code and client_credentials grant types
- Token endpoint at `/token` (top-level)
- Authorize endpoint at `/authorize` (top-level)

## Monitoring & Observability

**Error Tracking:**
- None (console logging only)

**Logs:**
- Console/stdout logging throughout
- Request/response logging for JSON-RPC messages
- MCP process stderr capture and logging
- Health check endpoint: `/health`

## CI/CD & Deployment

**Hosting:**
- Platform-agnostic (any Node.js 18+ host)
- Optional Cloudflare Tunnel for external HTTPS access
  - env var: `MCP_CLOUDFLARE_TUNNEL_ID`
  - env var: `MCP_CLOUDFLARE_CREDENTIALS`

**CI Pipeline:**
- None configured (manual testing via npm scripts)

## Environment Configuration

**Required env vars:**
- `SESSION_SECRET` - For OAuth session encryption (32+ character random string)
- `HEVY_API_KEY` - For Hevy workout tracking integration

**Optional env vars:**
- `MCP_LIBREOFFICE_PATH` - Path to LibreOffice executable
- `MCP_LIBREOFFICE_HOST` - LibreOffice socket host (default: localhost)
- `MCP_LIBREOFFICE_PORT` - LibreOffice socket port (default: 2002)
- `MCP_PROXY_PORT` - Proxy server port (default: 8080)
- `MCP_PROXY_HOST` - Proxy server host (default: 127.0.0.1)
- `MCP_CLOUDFLARE_TUNNEL_ID` - Cloudflare tunnel ID
- `MCP_CLOUDFLARE_CREDENTIALS` - Path to Cloudflare credentials JSON

**OAuth provider credentials:**
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`
- `OAUTH_CLIENT_SECRET` - For OAuth Provider mode

**Secrets location:**
- `.env` files (gitignored)
- `.env.example` provides template

## Webhooks & Callbacks

**Incoming:**
- `/auth/callback` - OAuth 2.0 callback endpoint from providers
- `/auth/login` - Login redirect to OAuth provider
- `/message` or `/messages` - JSON-RPC MCP endpoint (protected)
- `/sse` - Server-Sent Events endpoint for MCP discovery
- `/health` - Health check (public)

**Outgoing:**
- None (proxy is request/response only)

## Protocol-Level Integrations

**MCP (Model Context Protocol):**
- Version: 2024-11-05
- Transport 1: stdio (between proxy and MCP server processes)
- Transport 2: HTTP/SSE (between clients and proxy)
- Implementation: `packages/mcp-http-proxy/src/ProxyServer.js`

**LibreOffice UNO (Universal Network Objects):**
- Protocol: Socket-based UNO connection
- Port: 2002 (default)
- Purpose: Calc spreadsheet manipulation
- Python module: `uno` (from LibreOffice installation)
- Implementation: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/uno_connection.py`

## Platform-Specific Integrations

**Windows:**
- LibreOffice process spawning via `child_process.exec`
- Port detection via `netstat` command
- Process detection via `tasklist` command
- Batch scripts for LibreOffice startup in `packages/libreoffice-calc-mcp/*.bat`

---

*Integration audit: 2026-03-13*
