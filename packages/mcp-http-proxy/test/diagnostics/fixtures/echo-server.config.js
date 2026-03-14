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

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get absolute path to the fixtures directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve absolute path to echo server (works regardless of CWD)
const echoServerPath = resolve(__dirname, '../../../examples/test-server/echo-mcp-server.js');

export default {
  mcp: {
    // Use absolute path to avoid spawn working directory issues
    command: 'node',
    args: [echoServerPath],
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
