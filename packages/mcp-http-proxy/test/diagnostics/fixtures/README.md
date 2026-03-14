# Diagnostic Test Fixtures

This directory contains shared configuration fixtures for Phase 1 diagnostic tests.

## Purpose

Fixtures provide reusable, test-optimized configurations that all diagnostic tests can import. This ensures consistent test behavior and makes it easy to update configuration across all tests.

## Why `port: 0`?

Tests use `port: 0` in server configurations to let the operating system assign an available port. This prevents EADDRINUSE errors when:

- Running tests in parallel
- Running tests multiple times in succession
- Multiple test suites need a proxy server simultaneously

After the proxy starts, retrieve the assigned port:

```javascript
await proxy.start();
const actualPort = proxy.server.address().port;
```

## Local Mode

Fixture configurations omit `auth` and `oauthProvider` keys to run in "local mode" — no OAuth authentication required. This is appropriate for diagnostic testing where we want to isolate proxy behavior from authentication complexity.

## Files

### `echo-server.config.js`

Configuration for the echo test MCP server located at `examples/test-server/echo-mcp-server.js`.

**Available tools:**
- `echo` — Returns JSON of arguments
- `ping` — Returns "pong!"
- `get_time` — Returns current ISO timestamp
- `sum` — Adds two numbers (a, b)

**Usage:**

```javascript
import echoConfig from './fixtures/echo-server.config.js';
import { ProxyServer } from '../../src/ProxyServer.js';

const proxy = new ProxyServer(echoConfig);
await proxy.start();
```

## Adding New Fixtures

When creating a new fixture:

1. Use `port: 0` for OS-assigned ports
2. Omit auth keys for local mode testing
3. Use relative paths from the fixtures directory
4. Document the MCP server's available tools/resources
5. Include usage example in this README
