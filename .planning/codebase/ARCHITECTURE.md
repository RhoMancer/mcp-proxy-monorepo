# Architecture

**Analysis Date:** 2026-03-13

## Pattern Overview

**Overall:** Monorepo with HTTP-to-stdio proxy pattern

**Key Characteristics:**
- Generic proxy server that bridges HTTP/JSON to stdio-based MCP servers
- Pluggable authentication (OAuth 2.0 client, OAuth 2.0 provider)
- Child process spawning with JSON-RPC message forwarding
- Multi-language support (Node.js proxy, Python MCP servers)

## Layers

**HTTP Server Layer:**
- Purpose: Express-based HTTP server with CORS, authentication middleware
- Location: `packages/mcp-http-proxy/src/ProxyServer.js`
- Contains: Route handlers, middleware setup, SSE endpoints
- Depends on: `express`, `passport`, `express-session`, `cookie-parser`
- Used by: CLI entry point, consuming applications

**Authentication Layer:**
- Purpose: OAuth 2.0 authentication (client mode and provider mode)
- Location: `packages/mcp-http-proxy/src/auth/`
- Contains: `OAuth2Auth.js` (client), `OAuthProviderAuth.js` (provider), `validateConfig.js`
- Depends on: `passport`, `passport-oauth2`, `express-session`
- Used by: `ProxyServer.js`

**Process Bridge Layer:**
- Purpose: Spawn and communicate with stdio MCP servers via child_process
- Location: `packages/mcp-http-proxy/src/ProxyServer.js` (methods `_spawnMcpProcess`, `_sendMcpRequest`, `_handleMcpResponse`)
- Contains: Child process management, JSON-RPC request/response handling, pending request tracking
- Depends on: Node.js `child_process` module
- Used by: `ProxyServer.js`

**MCP Protocol Layer:**
- Purpose: Implement MCP server protocol (stdio transport)
- Location: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/`
- Contains: `__init__.py` (MCP server), `calc_tools.py` (tool implementations), `uno_connection.py` (LibreOffice bridge)
- Depends on: `mcp` Python SDK, UNO (LibreOffice)
- Used by: Python MCP servers

**Application Integration Layer:**
- Purpose: Package-specific configuration and startup scripts
- Location: `packages/libreoffice-calc-mcp/start.js`, `packages/mcp-http-proxy/src/cli.js`
- Contains: Config loading, environment setup, process orchestration
- Depends on: `mcp-http-proxy`, `dotenv`
- Used by: End users via npm scripts

## Data Flow

**HTTP Client to MCP Server Flow:**

1. HTTP client sends POST to `/message` or `/messages` with JSON-RPC request body
2. Authentication middleware validates session or Bearer token (if auth enabled)
3. `ProxyServer._handleJsonRpcRequest` receives request
4. If MCP process not running, `_spawnMcpProcess` spawns configured command
5. If not initialized, `_initializeMcp` sends initialize handshake
6. `_sendMcpRequest` forwards JSON-RPC to MCP process stdin (newline-delimited)
7. MCP process stdout is buffered and parsed line-by-line
8. `_handleMcpResponse` matches response ID to pending request and resolves Promise
9. Response sent back to HTTP client as JSON

**SSE Endpoint Flow:**

1. HTTP client connects to `/sse`
2. Server sends `event: endpoint` with message endpoint URL
3. Keep-alive comments sent every 15 seconds

**OAuth Provider Mode Flow (Claude Connectors):**

1. Claude Connector redirects user to `/authorize` with PKCE parameters
2. `OAuthProviderAuth` generates authorization code and stores with challenge
3. Redirect back to Claude with code
4. Claude POSTs to `/token` with code and code_verifier
5. Proxy verifies PKCE challenge and issues JWT-like access token
6. Subsequent requests include `Authorization: Bearer <token>` header
7. `getAuthenticateMiddleware` validates token signature and expiration

**OAuth Client Mode Flow (traditional OAuth redirect):**

1. User visits `/auth/login`
2. Passport redirects to OAuth provider (GitHub, Google, etc.)
3. Provider redirects to `/auth/callback` with authorization code
4. Passport exchanges code for access token
5. User session established
6. Subsequent requests require valid session cookie

## Key Abstractions

**ProxyServer Class:**
- Purpose: Main server orchestration
- Examples: `packages/mcp-http-proxy/src/ProxyServer.js`
- Pattern: Constructor sets up Express app, authentication, and routes; `start()` begins listening

**Pending Request Map:**
- Purpose: Track in-flight JSON-RPC requests by ID
- Examples: `this.pendingRequests = new Map()` in `ProxyServer`
- Pattern: Store `{resolve, reject}` functions keyed by request ID; resolve on response

**Configuration-Driven Spawning:**
- Purpose: Allow any stdio MCP server to be proxied
- Examples: All `*.config.js` files in `packages/mcp-http-proxy/examples/`
- Pattern: Config file exports `{mcp: {command, args, env}, server: {port, host}, auth?, oauthProvider?}`

**UNO Connection Singleton:**
- Purpose: Reuse LibreOffice connection across tool invocations
- Examples: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/uno_connection.py`
- Pattern: `get_connection()` returns cached `UNOConnection` instance

## Entry Points

**CLI Entry Point:**
- Location: `packages/mcp-http-proxy/src/cli.js`
- Triggers: `mcp-proxy` command or `node src/cli.js`
- Responsibilities: Parse args, load config file, create ProxyServer, call start()

**Application Entry Point:**
- Location: `packages/libreoffice-calc-mcp/start.js`
- Triggers: `npm start` in libreoffice-calc-mcp package
- Responsibilities: Auto-start LibreOffice headless, load mcp.config.js, create ProxyServer

**Python MCP Server Entry Point:**
- Location: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/__init__.py`
- Triggers: `python -m libreoffice_calc_mcp`
- Responsibilities: Initialize MCP Server instance, register tool handlers, run stdio_server

**Validation Test Entry Point:**
- Location: `.validation/run-tests.js`
- Triggers: `npm run test`, `npm run test:oauth`, `npm run test:libreoffice`
- Responsibilities: Select test suite, run integration tests

## Error Handling

**Strategy:** Graceful degradation with detailed error messages

**Patterns:**
- **MCP Process Exit:** Reject all pending requests with "MCP process terminated"
- **Request Timeout:** 30-second timeout rejects with "Request timeout"
- **Connection Failure (UNO):** `LibreOfficeConnectionError` with helpful troubleshooting steps
- **Auth Failure:** Return 401 with JSON error body
- **Invalid JSON-RPC:** Return JSON-RPC error response with codes (-32600, -32603)

**Error Types:**
- `LibreOfficeConnectionError`: UNO connection failed
- `CalcError`: Calc operation failed (Python)
- Custom error objects for JSON-RPC responses

## Cross-Cutting Concerns

**Logging:** Console stdout/stderr. Extensive logging for debugging MCP protocol messages

**Validation:**
- Config validation via `validateConfig.js` (OAuth settings)
- PKCE challenge verification in OAuthProviderAuth
- Request/response validation in JSON-RPC layer

**Authentication:**
- Optional OAuth 2.0 client mode (Passport.js strategies)
- Optional OAuth 2.0 provider mode (JWT-like tokens)
- Bearer token middleware for protected routes

**Environment:**
- dotenv loaded at multiple levels (root, package)
- Environment variable substitution in config files
- Support for .env files in each package directory

---

*Architecture analysis: 2026-03-13*
