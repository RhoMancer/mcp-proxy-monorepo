# Phase 1: Diagnostics - Research

**Researched:** 2026-03-13
**Domain:** MCP HTTP Proxy - Diagnostic Testing Infrastructure
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIAG-01 | Automated test script verifies proxy is accepting connections on configured port | Vitest + supertest for HTTP assertions; existing `/health` endpoint returns server status |
| DIAG-02 | Automated test script verifies MCP server process spawns successfully | Node.js `child_process.spawn` already used; test can verify process `pid` and `killed` status |
| DIAG-03 | Automated test script verifies JSON-RPC request/response round-trip works | Echo test server available; MCP SDK stdio transport pattern documented |
| DIAG-04 | Diagnostic output clearly identifies failure point (proxy, MCP process, or network) | Layered test approach; each test isolates a specific failure mode with targeted assertions |

</phase_requirements>

## Summary

Phase 1 establishes a diagnostic testing foundation for the MCP HTTP Proxy. The research confirms the project already has Vitest testing infrastructure with supertest for HTTP assertions, Passport/OAuth mocking patterns in place, and an existing health check endpoint at `/health` that reports proxy status. The echo test MCP server (`examples/test-server/echo-mcp-server.js`) provides a lightweight, dependency-free target for JSON-RPC round-trip testing.

The diagnostic approach follows a three-layer testing strategy: (1) Proxy server connectivity layer using HTTP health checks, (2) MCP process spawning layer verifying child process lifecycle, and (3) JSON-RPC round-trip layer validating protocol communication. Each layer is independently testable with clear pass/fail boundaries.

**Primary recommendation:** Create a dedicated `test/diagnostics/` directory with three focused test files using the existing Vitest + supertest stack, leveraging the echo test server as the MCP target, and extending the `/health` endpoint with additional process status details if needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 2.0.0 | Test runner | Already configured in project; fast, native ESM support, watch mode |
| supertest | 7.0.0 | HTTP assertions | Industry standard for Express endpoint testing; async/await friendly |
| Node.js child_process | (built-in) | Process management | Already used in ProxyServer.js for spawning MCP processes |
| @modelcontextprotocol/sdk | latest | MCP stdio transport | Official SDK; used by echo test server |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Express | 4.18.2 | HTTP server | Already used by proxy; supertest requires Express app |
| express-session | 1.18.0 | Session mocking | Integration tests may need session context (already mocked) |
| vi.mock (Vitest) | (built-in) | Module mocking | Already used for Passport/OAuth mocking in test/setup.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Vitest is faster, native ESM, already configured; Jest would require migration |
| supertest | node-fetch | supertest designed for Express apps with automatic server lifecycle management |
| Echo server | Full MCP servers | Echo server is dependency-free and deterministic; real servers add external dependencies |

**Installation:**
No additional packages needed - all dependencies already installed in `packages/mcp-http-proxy/package.json`.

## Architecture Patterns

### Recommended Project Structure
```
packages/mcp-http-proxy/test/diagnostics/
├── proxy-connectivity.test.js   # DIAG-01: Health endpoint, port binding
├── process-lifecycle.test.js     # DIAG-02: MCP process spawn, death detection
├── jsonrpc-roundtrip.test.js     # DIAG-03: Full protocol round-trip
└── fixtures/
    └── echo-server.config.js     # Reusable config for echo test server
```

### Pattern 1: Diagnostic Test Isolation
**What:** Each diagnostic test runs independently with clean process state
**When to use:** All diagnostic tests must be runnable in any order without interference
**Example:**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ProxyServer } from '../src/ProxyServer.js';
import echoConfig from './fixtures/echo-server.config.js';

describe('DIAG-01: Proxy Connectivity', () => {
  let server;
  let proxy;

  beforeAll(async () => {
    // Create proxy instance with no OAuth (local mode)
    const config = {
      ...echoConfig,
      server: { port: 0, host: '127.0.0.1' } // OS-assigned port
    };
    proxy = new ProxyServer(config);
    await proxy.start();
  });

  afterAll(async () => {
    if (proxy) await proxy.stop();
  });

  it('should accept connections on configured port', async () => {
    const response = await request(proxy.app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    // Port verification through successful connection
  });
});
```

### Pattern 2: Process Lifecycle Verification
**What:** Directly observe MCP child process state without relying on protocol responses
**When to use:** DIAG-02 requires verifying the process itself spawns, not just that communication works
**Example:**
```javascript
import { spawn } from 'child_process';

describe('DIAG-02: MCP Process Spawning', () => {
  it('should spawn MCP process with expected structure', async () => {
    const config = {
      mcp: {
        command: 'node',
        args: ['examples/test-server/echo-mcp-server.js']
      }
    };
    const proxy = new ProxyServer(config);

    // Spawn the process
    proxy._spawnMcpProcess();

    // Verify process object structure
    expect(proxy.mcpProcess).toBeDefined();
    expect(proxy.mcpProcess.pid).toBeGreaterThan(0);
    expect(proxy.mcpProcess.killed).toBe(false);
    expect(proxy.mcpProcess.stdin).toBeDefined();
    expect(proxy.mcpProcess.stdout).toBeDefined();

    // Cleanup
    proxy.mcpProcess.kill();
  });

  it('should detect process termination', async () => {
    const proxy = new ProxyServer(echoConfig);
    proxy._spawnMcpProcess();

    const processPid = proxy.mcpProcess.pid;

    // Kill the process
    proxy.mcpProcess.kill();

    // Wait for close event
    await new Promise(resolve => {
      proxy.mcpProcess.on('close', resolve);
    });

    // Verify proxy cleared the reference
    expect(proxy.mcpProcess).toBeNull();
  });
});
```

### Pattern 3: JSON-RPC Round-Trip Testing
**What:** Full end-to-end test of MCP protocol communication
**When to use:** DIAG-03 requires verifying JSON-RPC request/response works end-to-end
**Example:**
```javascript
describe('DIAG-03: JSON-RPC Round-Trip', () => {
  let proxy;

  beforeAll(async () => {
    proxy = new ProxyServer(echoConfig);
    proxy._spawnMcpProcess();
    await proxy._initializeMcp();
  });

  afterAll(() => {
    if (proxy.mcpProcess) proxy.mcpProcess.kill();
  });

  it('should complete initialize handshake', async () => {
    expect(proxy.isInitialized).toBe(true);
  });

  it('should call tools/list and receive response', async () => {
    const response = await proxy._sendMcpRequest('tools/list');

    expect(response).toBeDefined();
    expect(response.jsonrpc).toBe('2.0');
    expect(response.id).toBeDefined();
    expect(response.result).toBeDefined();
    expect(response.result.tools).toBeInstanceOf(Array);
    expect(response.result.tools.length).toBeGreaterThan(0);
  });

  it('should call a tool and receive result', async () => {
    const response = await proxy._sendMcpRequest('tools/call', {
      name: 'ping',
      arguments: {}
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toBeDefined();
    expect(response.result.content[0].text).toContain('pong');
  });
});
```

### Anti-Patterns to Avoid
- **Testing with real MCP servers (libreoffice, hevy):** These have external dependencies (LibreOffice installation, API keys) that make tests flaky. Use echo server for diagnostics.
- **Assuming port availability:** Tests should use OS-assigned ports (port: 0) or check port availability before binding.
- **Mixing diagnostic concerns:** Each test should verify ONE layer (proxy, process, or network), not multiple.
- **Leaking processes:** Always clean up spawned MCP processes in afterAll/afterEach hooks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP request assertions | Custom fetch/http calls | supertest | Handles Express app binding, automatic response parsing, assertion chaining |
| Port availability checking | Custom net.Socket attempts | `server: { port: 0 }` | OS automatically assigns available port; no race conditions |
| Process spawning verification | Custom PID polling | Direct property access on `spawn()` result | Node.js spawn returns process object synchronously with immediate status |
| Mock servers | Hand-rolled MCP servers | Echo test server (`examples/test-server/echo-mcp-server.js`) | Already implements full MCP protocol, deterministic, no dependencies |

**Key insight:** The proxy already implements all the diagnostic primitives needed (health check, process spawning, JSON-RPC handling). Tests should exercise these existing capabilities rather than reimplementing diagnostic logic.

## Common Pitfalls

### Pitfall 1: Process State Leakage Between Tests
**What goes wrong:** Previous test's MCP process is still running, causing EADDRINUSE or "process already spawned" errors
**Why it happens:** Node.js `spawn()` creates OS-level processes that persist beyond test scope
**How to avoid:** Always call `proxy.mcpProcess.kill()` in afterAll/afterEach hooks; consider using test-isolated ports (port: 0)
**Warning signs:** Tests pass individually but fail in suite; "port already in use" errors

### Pitfall 2: Asynchronous Initialization Race Conditions
**What goes wrong:** Test tries to send JSON-RPC before MCP process finishes initialization handshake
**Why it happens:** `_initializeMcp()` is async but tests may not await it properly
**How to avoid:** Always await `_initializeMcp()` before sending requests; use explicit `isInitialized` checks
**Warning signs:** "Request timeout" errors; `response.error?.code === -32601` (method not found during init)

### Pitfall 3: Health Check False Positives
**What goes wrong:** `/health` returns `{ status: 'ok' }` but MCP process is actually dead
**Why it happens:** Express server stays alive even if spawned child process dies; existing health endpoint may not check process vitality
**How to avoid:** Extend health check to verify `mcpProcess !== null` AND `mcpProcess.killed === false`
**Warning signs:** Test passes connectivity but JSON-RPC tests fail with "process not available"

### Pitfall 4: Mock Configuration Conflicts
**What goes wrong:** Tests fail because Passport/OAuth mocks in `test/setup.js` interfere with no-auth tests
**Why it happens:** Global mocks run before all imports; they may return unexpected responses
**How to avoid:** Tests for local mode should skip auth middleware entirely or use config without `auth`/`oauthProvider` keys
**Warning signs:** "Authentication required" errors when testing local-only config

## Code Examples

Verified patterns from official sources:

### Creating a Proxy Server for Testing
```javascript
// Source: packages/mcp-http-proxy/src/ProxyServer.js (constructor)
import { ProxyServer } from '../src/ProxyServer.js';

// Local mode - no OAuth required
const config = {
  mcp: {
    command: 'node',
    args: ['examples/test-server/echo-mcp-server.js'],
    env: { NODE_ENV: 'test' }
  },
  server: {
    port: 0, // OS-assigned port avoids conflicts
    host: '127.0.0.1'
  }
  // No 'auth' or 'oauthProvider' keys = local mode
};

const proxy = new ProxyServer(config);
```

### Health Check Verification (DIAG-01)
```javascript
// Source: packages/mcp-http-proxy/src/ProxyServer.js lines 139-148
const response = await request(proxy.app)
  .get('/health')
  .expect(200);

// Existing health endpoint returns:
// { status, mcpRunning, mcpInitialized, server, authEnabled, oauthProviderEnabled }
expect(response.body.status).toBe('ok');
expect(response.body.mcpRunning).toBe(true);
```

### Process Spawning Verification (DIAG-02)
```javascript
// Source: packages/mcp-http-proxy/src/ProxyServer.js lines 377-443
proxy._spawnMcpProcess();

// Verify process object
expect(proxy.mcpProcess).toBeDefined();
expect(proxy.mcpProcess.pid).toBeGreaterThan(0);
expect(proxy.mcpProcess.killed).toBe(false);

// Verify stdio channels
expect(proxy.mcpProcess.stdin.writable).toBe(true);
expect(proxy.mcpProcess.stdout.readable).toBe(true);
expect(proxy.mcpProcess.stderr.readable).toBe(true);
```

### JSON-RPC Request (DIAG-03)
```javascript
// Source: packages/mcp-http-proxy/src/ProxyServer.js lines 466-496
const response = await proxy._sendMcpRequest('tools/list');

// MCP SDK JSON-RPC 2.0 response format:
// { jsonrpc: "2.0", id: number, result: { tools: [...] } }
expect(response.jsonrpc).toBe('2.0');
expect(response.id).toBeDefined();
expect(response.result).toBeDefined();
```

### Echo Test Server Tools
```javascript
// Source: packages/mcp-http-proxy/examples/test-server/echo-mcp-server.js
// Available tools for testing:
// - echo: returns JSON of arguments
// - ping: returns "pong!"
// - get_time: returns current ISO timestamp
// - sum: adds two numbers (a, b)

const response = await proxy._sendMcpRequest('tools/call', {
  name: 'sum',
  arguments: { a: 5, b: 3 }
});
expect(response.result.content[0].text).toBe('Sum: 8');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual testing with curl/nc | Automated Vitest + supertest suite | Project initial commit | Fast feedback, regression prevention |
| Ad-hoc process spawning | Structured child_process wrapper | ProxyServer.js lines 377-443 | Centralized error handling, stdio parsing |
| No health visibility | `/health` endpoint with status | Existing implementation | Passive monitoring possible |

**Deprecated/outdated:**
- Direct stdio process debugging: Use the structured diagnostic tests instead of manual `stdio` inspection
- Manual port selection: Use `port: 0` for OS-assigned ports in tests

## Open Questions

1. **Should health endpoint check MCP process vitality?**
   - What we know: Current `/health` returns `mcpRunning: boolean` based on whether `mcpProcess !== null`
   - What's unclear: Whether this field is updated when process dies (the `close` handler sets `mcpProcess = null`)
   - Recommendation: Verify existing behavior; if `mcpRunning` is stale, add `mcpProcess.killed` check to health endpoint

2. **Should diagnostic tests run against real MCP servers or only echo server?**
   - What we know: Echo server is dependency-free and deterministic; real servers have external dependencies
   - What's unclear: Project requirements mention testing with libreoffice-calc-mcp and hevy-mcp
   - Recommendation: Phase 1 tests use echo server; Phase 2/3 may add conditional tests for real servers if environment allows

3. **How to handle 30-second timeout in `_sendMcpRequest` for diagnostic tests?**
   - What we know: Existing implementation has 30-second timeout (line 489)
   - What's unclear: Whether diagnostic tests should have shorter timeouts to fail fast
   - Recommendation: For diagnostic tests, consider 5-10 second timeout with clear failure message

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.0.0 |
| Config file | `packages/mcp-http-proxy/vitest.config.js` |
| Setup file | `packages/mcp-http-proxy/test/setup.js` (Passport/OAuth mocks) |
| Quick run command | `npm test -- test/diagnostics/proxy-connectivity.test.js` |
| Full suite command | `npm test -- test/diagnostics/` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIAG-01 | Verify proxy accepting connections on configured port | integration | `npm test -- test/diagnostics/proxy-connectivity.test.js -x` | ❌ Wave 0 |
| DIAG-02 | Verify MCP server process spawns successfully | unit | `npm test -- test/diagnostics/process-lifecycle.test.js -x` | ❌ Wave 0 |
| DIAG-03 | Verify JSON-RPC request/response round-trip works | integration | `npm test -- test/diagnostics/jsonrpc-roundtrip.test.js -x` | ❌ Wave 0 |
| DIAG-04 | Diagnostic output clearly identifies failure point | meta | Verified via test output inspection of above tests | N/A (quality attribute) |

### Sampling Rate
- **Per task commit:** `npm test -- test/diagnostics/ -x` (run only diagnostic tests)
- **Per wave merge:** `npm test` (full test suite)
- **Phase gate:** All diagnostic tests passing + manual verification of test output clarity

### Wave 0 Gaps
- [ ] `test/diagnostics/proxy-connectivity.test.js` — covers DIAG-01
- [ ] `test/diagnostics/process-lifecycle.test.js` — covers DIAG-02
- [ ] `test/diagnostics/jsonrpc-roundtrip.test.js` — covers DIAG-03
- [ ] `test/diagnostics/fixtures/echo-server.config.js` — shared test config

No framework installation needed — Vitest, supertest, and test setup already configured.

## Sources

### Primary (HIGH confidence)
- **Vitest documentation** - Test patterns, async testing, hooks (https://vitest.dev)
- **Node.js child_process** - spawn() API, process object structure (https://nodejs.org/api/child_process.html)
- **MCP SDK** - stdio transport, JSON-RPC protocol (https://modelcontextprotocol.io)
- **supertest** - HTTP assertion library (https://github.com/visionmedia/supertest)

### Secondary (MEDIUM confidence)
- **Project codebase analysis** - ProxyServer.js implementation, existing test patterns
- **echo-mcp-server.js** - Verified MCP server implementation for testing
- **vitest.config.js** - Confirmed project test configuration

### Tertiary (LOW confidence)
- None - all findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages already installed and verified in package.json
- Architecture: HIGH - Based on existing codebase patterns and documented test infrastructure
- Pitfalls: HIGH - Derived from common Node.js testing issues and specific codebase observations

**Research date:** 2026-03-13
**Valid until:** 2026-04-13 (30 days - testing infrastructure is stable)
