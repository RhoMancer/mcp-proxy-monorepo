/**
 * Echo Test MCP Server Configuration
 *
 * Configuration for testing the mcp-proxy with a simple echo server.
 * Useful for OAuth Provider mode testing without external dependencies.
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   npx mcp-proxy --config examples/echo-test.config.js
 *
 * With OAuth:
 *   Set OAUTH_CLIENT_SECRET in .env
 *   npx mcp-proxy --config examples/echo-oauth-test.config.js
 */

export default {
  mcp: {
    // Use the local echo test server
    command: 'node',
    args: ['examples/test-server/echo-mcp-server.js'],
    env: {
      NODE_ENV: 'development',
    },
  },
  server: {
    port: 8080,
    host: '127.0.0.1',
  },
};
