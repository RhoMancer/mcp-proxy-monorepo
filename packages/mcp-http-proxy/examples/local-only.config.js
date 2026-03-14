/**
 * Local-Only Configuration for MCP HTTP Proxy
 *
 * This configuration runs the proxy in LOCAL mode without any OAuth authentication.
 * Use this for local Claude Code CLI development where you don't need external access.
 *
 * LOCAL MODE CHARACTERISTICS:
 * - No OAuth authentication required
 * - Accessible from localhost only
 * - Direct connection to MCP server via stdio
 * - CORS enabled for all origins
 *
 * USAGE:
 *   cd packages/mcp-http-proxy
 *   node src/cli.js -c ../examples/local-only.config.js
 *
 * CLAUDE CODE CONFIGURATION:
 *   Add to your Claude Code .claude/config.json:
 *   {
 *     "mcpServers": {
 *       "my-local-server": {
 *         "url": "http://localhost:8080/sse"
 *       }
 *     }
 *   }
 *
 * DIFFERENCES FROM OAUTH MODES:
 * - Local mode: No auth/oauthProvider keys, accessible from localhost
 * - OAuth redirect: Requires 'auth' config, redirects to GitHub/Google login
 * - OAuth Provider: Requires 'oauthProvider' config, for Claude.ai Connectors
 */

export default {
  mcp: {
    // The MCP server command to run
    command: 'node',
    args: [
      // Path to echo-mcp-server relative to monorepo root
      // Replace with your actual MCP server command
      'examples/test-server/echo-mcp-server.js'
    ],
    // Optional: Working directory for the MCP process
    // Set to path if MCP server needs specific working directory
    // cwd: undefined,

    // Optional: Environment variables to pass to MCP server
    env: {
      NODE_ENV: 'development',
      // Example: API_KEY: process.env.YOUR_API_KEY
    }
  },
  server: {
    // HTTP port for the proxy (choose a port not in use)
    port: 8080,

    // Bind to localhost only for security
    // Use '0.0.0.0' for network access (not recommended for local development)
    host: '127.0.0.1'
  }
  // NOTE: NO 'auth' or 'oauthProvider' keys = local mode (no authentication)
};

/*
 * TROUBLESHOOTING:
 *
 * Port already in use?
 *   - Change the port number above
 *   - Or kill the process using the port:
 *     netstat -ano | findstr :8080  # Windows
 *     lsof -i :8080                  # macOS/Linux
 *
 * MCP process won't start?
 *   - Verify the command path is correct
 *   - Check required environment variables are set
 *   - Test the MCP server command directly in your terminal
 *
 * Claude Code can't connect?
 *   - Verify the proxy is running: check terminal output
 *   - Confirm the URL in .claude/config.json matches the port above
 *   - Use http://localhost:8080/sse or http://127.0.0.1:8080/sse
 *
 * For different MCP servers, modify the 'mcp' section:
 *
 * npx-based server (e.g., hevy-mcp):
 *   command: 'npx',
 *   args: ['-y', 'hevy-mcp'],
 *   env: { HEVY_API_KEY: process.env.HEVY_API_KEY }
 *
 * Python-based server (e.g., libreoffice-calc-mcp):
 *   command: 'python',
 *   args: ['-m', 'libreoffice_calc_mcp'],
 *   cwd: '/path/to/mcp/server/src'
 */
