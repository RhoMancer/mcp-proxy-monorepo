/**
 * Echo Test MCP Server Configuration with OAuth Provider Mode
 *
 * Configuration for testing OAuth Provider mode with a simple echo server.
 * This is the easiest way to test OAuth without external MCP server dependencies.
 *
 * Prerequisites:
 *   1. Set OAUTH_CLIENT_SECRET in packages/mcp-http-proxy/.env
 *      (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
 *
 *   2. Configure GitHub OAuth app:
 *      - Homepage URL: http://127.0.0.1:8080
 *      - Authorization callback: http://127.0.0.1:8080/auth/callback
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   npx mcp-proxy --config examples/echo-oauth-test.config.js
 *
 * Then test OAuth flow:
 *   1. Visit http://127.0.0.1:8080/health - should show authEnabled: true
 *   2. Visit http://127.0.0.1:8080/auth/login - should redirect to GitHub
 *   3. After auth, visit http://127.0.0.1:8080/tools - should see echo tools
 */

export default {
  mcp: {
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
  oauth: {
    enabled: true,
    provider: 'github',
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    sessionSecret: process.env.OAUTH_CLIENT_SECRET || '',
    callbackUrl: 'http://127.0.0.1:8080/auth/callback',
  },
};
