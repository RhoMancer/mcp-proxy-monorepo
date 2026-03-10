/**
 * Claude Connectors OAuth Provider configuration for Hevy MCP
 *
 * This configuration enables the mcp-proxy to act as an OAuth provider for Claude Connectors.
 * Use this when adding Hevy MCP as a custom connector in the Claude web app.
 *
 * CLAUDE CONNECTORS SETUP:
 *
 * 1. In Claude web app, go to "Add custom connector" (Beta)
 * 2. Fill in the following fields:
 *    - Name: Hevy Workout Tracker (or your preferred name)
 *    - Remote MCP server URL: http://127.0.0.1:8082/mcp
 *    - OAuth Client ID: claude-hevy-client
 *    - OAuth Client Secret: hevy-secret-key-change-me
 *
 * 3. Click "Add" to connect
 *
 * SECURITY NOTES:
 * - Change the default client_secret in production
 * - For multiple clients, use the allowedClients array format
 * - Use HTTPS in production for secure token transmission
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   node src/cli.js -c ../examples/claude-connectors-hevy.config.js
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
    port: 8082,
    host: '127.0.0.1'
  },
  // OAuth Provider mode for Claude Connectors
  oauthProvider: {
    // Simple mode: Use a shared secret for all clients
    // Enter this exact secret in Claude Connectors OAuth Client Secret field
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'hevy-secret-key-change-me',

    // Token expiration (default: 24 hours)
    tokenExpiration: 24 * 60 * 60 * 1000,

    // OR: Use allowedClients for multiple clients with different secrets
    /*
    allowedClients: [
      {
        clientId: 'claude-hevy-client',
        clientSecret: 'hevy-secret-key-change-me',
        name: 'Claude Connectors - Hevy'
      },
      {
        clientId: 'another-client',
        clientSecret: 'different-secret',
        name: 'Another Application'
      }
    ]
    */
  }
};
