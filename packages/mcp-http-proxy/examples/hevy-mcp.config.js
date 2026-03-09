/**
 * Example configuration for hevy-mcp
 *
 * This config shows how to use mcp-http-proxy with the hevy-mcp server.
 *
 * Setup:
 * 1. Create a .env file with HEVY_API_KEY
 * 2. Run: npm install mcp-http-proxy
 * 3. Run: mcp-proxy --config examples/hevy-mcp.config.js
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
    port: 8080,
    host: '127.0.0.1'
  }
};
