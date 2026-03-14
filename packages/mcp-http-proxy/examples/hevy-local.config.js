/**
 * Hevy MCP - Local Claude Code configuration (NO OAuth)
 *
 * This configuration runs the Hevy MCP server without OAuth for local Claude Code CLI access.
 * Use this alongside the OAuth-enabled proxy for Claude.ai web access.
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   node src/cli.js -c ../examples/hevy-local.config.js
 *
 * Environment variables (.env file):
 *   HEVY_API_KEY=your_hevy_api_key_from_hevy_app
 */

export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  },
  server: {
    port: 8083,
    host: '127.0.0.1'
  }
  // NO oauthProvider - this is for local CLI access only
};
