/**
 * Echo Server Configuration for Diagnostic Tests
 *
 * This fixture provides a reusable configuration for running the echo test MCP server
 * during diagnostic testing. It uses port 0 to allow the OS to assign an available port,
 * avoiding EADDRINUSE conflicts during parallel test execution.
 *
 * Usage in tests:
 *   import echoConfig from './fixtures/echo-server.config.js';
 *   const proxy = new ProxyServer(echoConfig);
 *
 * Why port: 0?
 *   - Tests run in parallel and each needs a unique port
 *   - OS-assigned ports avoid race conditions with port availability checks
 *   - Retrieved via proxy.server.address().port after server starts
 *
 * Local mode:
 *   - No 'auth' or 'oauthProvider' keys = no OAuth required
 *   - Suitable for testing proxy functionality without authentication
 */

export default {
  mcp: {
    // Path from fixtures directory to echo test server
    // fixtures is at test/diagnostics/fixtures/
    // examples is at packages/mcp-http-proxy/examples/
    command: 'node',
    args: [
      // Relative path from fixtures location to the echo MCP server
      // Going up 4 levels: test/diagnostics/fixtures -> test/diagnostics -> test -> packages/mcp-http-proxy
      '../../../examples/test-server/echo-mcp-server.js'
    ],
    env: {
      NODE_ENV: 'test',
    },
  },
  server: {
    port: 0, // OS-assigned port for test isolation
    host: '127.0.0.1',
  },
  // No 'auth' or 'oauthProvider' keys = local mode (no OAuth)
};
