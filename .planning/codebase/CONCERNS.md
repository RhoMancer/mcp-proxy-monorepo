# Codebase Concerns

**Analysis Date:** 2026-03-13

## Tech Debt

**In-Memory Token Storage:**
- Issue: `OAuthProviderAuth` uses `Map` and `Set` for token storage, not persistent
- Files: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js`
- Impact: All issued tokens are lost on server restart, breaking active user sessions
- Fix approach: Implement Redis/database backend for token storage, or document ephemeral nature clearly

**Custom JWT Implementation:**
- Issue: OAuthProviderAuth manually constructs JWT tokens using `crypto.createHmac` instead of using a proper JWT library
- Files: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js` (lines 151-193)
- Impact: May not fully comply with JWT RFC standards, missing features like token refresh, custom claims handling
- Fix approach: Replace with `jsonwebtoken` or similar well-tested library

**Duplicate OAuth Token Endpoint Logic:**
- Issue: `/token` endpoint logic is duplicated between `ProxyServer._setupRoutes()` and `OAuthProviderAuth.getAuthRoutes()`
- Files: `packages/mcp-http-proxy/src/ProxyServer.js` (lines 164-267), `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js` (lines 406-508)
- Impact: Code divergence risk, maintenance burden, inconsistent behavior
- Fix approach: Refactor to single implementation in `OAuthProviderAuth`, remove duplication from `ProxyServer`

**Platform-Specific Code in start.js:**
- Issue: Windows-specific commands (`netstat`, `tasklist`, `findstr`) hardcoded in LibreOffice launcher
- Files: `packages/libreoffice-calc-mcp/start.js`
- Impact: Code breaks on non-Windows platforms despite being JavaScript
- Fix approach: Add platform detection with Unix-equivalent commands

## Known Bugs

**Config File Import Cache Busting:**
- Issue: `validateConfig.js` uses cache-busting query parameter for dynamic imports (`Date.now()`)
- Files: `packages/mcp-http-proxy/src/auth/validateConfig.js` (line 223)
- Symptoms: May cause issues with ES module caching in long-running processes
- Workaround: None documented

**Process Spawn with shell:true:**
- Issue: MCP process spawned using `shell: true` which has security implications
- Files: `packages/mcp-http-proxy/src/ProxyServer.js` (line 397)
- Symptoms: Potential shell injection if command arguments are user-controlled
- Workaround: Inputs currently from config files, not user input

## Security Considerations

**Session Secret Management:**
- Risk: Session secrets can be read from environment variables or config, but no validation of strength
- Files: `packages/mcp-http-proxy/src/auth/OAuth2Auth.js`, `packages/mcp-http-proxy/src/auth/validateConfig.js`
- Current mitigation: `validateConfig.js` checks for weak patterns but only warns
- Recommendations: Enforce minimum entropy, auto-generate if not provided, use secrets manager

**Auto-Generated Token Secret Lost on Restart:**
- Risk: `tokenSecret` is auto-generated if not provided in config, but changes on every restart
- Files: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js` (line 111)
- Current mitigation: None - all tokens invalidated on restart
- Recommendations: Require explicit `tokenSecret` in production config, document auto-generation behavior

**CORS Allows All Origins:**
- Risk: `Access-Control-Allow-Origin: *` header set globally
- Files: `packages/mcp-http-proxy/src/ProxyServer.js` (line 106)
- Current mitigation: None
- Recommendations: Make CORS configurable, restrict to allowed origins in production

**No Rate Limiting:**
- Risk: No rate limiting on authentication or message endpoints
- Files: `packages/mcp-http-proxy/src/ProxyServer.js`
- Current mitigation: None
- Recommendations: Add express-rate-limit or similar middleware

**Insecure Example Configurations:**
- Risk: Example OAuth configs contain placeholder values that users might accidentally deploy
- Files: `packages/mcp-http-proxy/examples/oauth-generic.config.js`
- Current mitigation: TODO comments indicate placeholders (lines 40, 43, 53)
- Recommendations: Add validation that blocks deployment with placeholder values

## Performance Bottlenecks

**No MCP Process Pooling:**
- Problem: Each request spawns/is handled by a single MCP child process
- Files: `packages/mcp-http-proxy/src/ProxyServer.js` (line 392)
- Cause: Single-process design, single `this.mcpProcess` reference
- Improvement path: Consider process pool for concurrent requests, or document as single-tenant design

**Synchronous LibreOffice Operations:**
- Problem: Every Calc operation opens/closes the entire document
- Files: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/calc_tools.py`
- Cause: No document caching, each function calls `conn.open_document()` and `doc.close()`
- Improvement path: Implement document handle caching at connection level

**30-Second Hard Timeout:**
- Problem: All MCP requests timeout after 30 seconds regardless of operation
- Files: `packages/mcp-http-proxy/src/ProxyServer.js` (line 494)
- Cause: Hardcoded timeout in `_sendMcpRequest`
- Improvement path: Make timeout configurable per-operation type

**No Response Compression:**
- Problem: Large responses (e.g., big cell ranges) sent uncompressed
- Files: `packages/mcp-http-proxy/src/ProxyServer.js`
- Cause: No compression middleware configured
- Improvement path: Add express compression middleware

## Fragile Areas

**ProxyServer._setupRoutes() Method:**
- Files: `packages/mcp-http-proxy/src/ProxyServer.js` (lines 127-320)
- Why fragile: 193-line method with mixed concerns (OAuth, routing, middleware, business logic)
- Safe modification: Extract route handlers to separate modules, use Express router composition
- Test coverage: Partial - some unit tests for auth, limited integration tests

**UNO Connection Singleton:**
- Files: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/uno_connection.py` (lines 274-323)
- Why fragile: Global `_connection` variable can cause state pollution across requests
- Safe modification: Pass connection explicitly through all call chains, remove singleton pattern
- Test coverage: No tests for connection lifecycle or concurrent access

**OAuth Provider Authorization Code Storage:**
- Files: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js` (line 114)
- Why fragile: In-memory `authCodes` Map with 10-minute expiration, no persistence
- Safe modification: Document as single-server only, add Redis backend for distributed deployment
- Test coverage: No tests for authorization code expiration or concurrent flows

## Scaling Limits

**In-Memory State:**
- Current capacity: Single-server only due to in-memory sessions and tokens
- Limit: Cannot horizontally scale without session sharing
- Scaling path: Add Redis/session store for distributed state, document as single-instance limitation

**LibreOffice Single-Process Design:**
- Current capacity: One LibreOffice instance per proxy server
- Limit: UNO connection is single-threaded, no concurrent document access
- Scaling path: Run multiple proxy instances with load balancing, each with own LibreOffice instance

**No Request Queueing:**
- Current capacity: Limited by Node.js event loop and MCP process speed
- Limit: No backpressure mechanism, could fail under load
- Scaling path: Add request queue with concurrency limits

## Dependencies at Risk

**passport-oauth2:**
- Risk: Dependency on Passport.js authentication framework may be overkill for simple OAuth
- Impact: Adds complexity, learning curve for developers unfamiliar with Passport patterns
- Migration plan: Consider direct OAuth2 implementation or lighter alternative (e.g., simple-oauth2)

**express (for SSE):**
- Risk: Using Express primarily for SSE endpoint when lighter alternatives exist
- Impact: Larger dependency footprint for simple proxy use case
- Migration plan: Consider raw Node.js HTTP server or lighter framework like polka for simple deployments

**pyuno (UNO):**
- Risk: Requires LibreOffice Python environment, fragile import path
- Impact: Breaks if LibreOffice not installed or PYTHONPATH misconfigured
- Migration plan: Document setup requirements clearly, add better error messages (partially done)

## Missing Critical Features

**Token Refresh:**
- Problem: OAuth tokens never refresh, expire after configured maxAge
- Blocks: Long-lived sessions require re-authentication
- Impact: Poor UX for production deployments

**Graceful Shutdown:**
- Problem: LibreOffice process spawned by `start.js` not cleaned up on proxy shutdown
- Blocks: Clean restarts, may leave orphaned soffice.exe processes
- Impact: Requires manual process killing on Windows

**Health Check for MCP Server:**
- Problem: `/health` endpoint only checks if process spawned, not if it's actually responding
- Blocks: Detection of hung MCP processes
- Impact: Failed requests may not be detected until timeout

**Request Logging/Debugging:**
- Problem: Extensive console.log statements in production code with no log level control
- Blocks: Production debugging without noise
- Impact: Logs may expose sensitive data (headers, bodies logged at line 327-329 in ProxyServer.js)

## Test Coverage Gaps

**ProxyServer integration tests:**
- What's not tested: Full request/response cycle with actual MCP server
- Files: `packages/mcp-http-proxy/src/ProxyServer.js`
- Risk: Regressions in core proxy logic
- Priority: High

**OAuthProviderAuth PKCE flow:**
- What's not tested: Complete authorization code flow with PKCE verification
- Files: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js`
- Risk: Security vulnerabilities in OAuth implementation
- Priority: High

**LibreOffice UNO connection error handling:**
- What's not tested: Connection failures, timeouts, invalid responses
- Files: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/uno_connection.py`
- Risk: Poor error messages, unclear troubleshooting steps
- Priority: Medium

**Token expiration and cleanup:**
- What's not tested: Token store cleanup, expired token rejection
- Files: `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js`
- Risk: Memory leaks from unexpired tokens, security issues from stale tokens
- Priority: Medium

**Concurrent request handling:**
- What's not tested: Multiple simultaneous requests to same proxy
- Files: `packages/mcp-http-proxy/src/ProxyServer.js`
- Risk: Race conditions, request mixing
- Priority: Low (single-tenant design)

---

*Concerns audit: 2026-03-13*
