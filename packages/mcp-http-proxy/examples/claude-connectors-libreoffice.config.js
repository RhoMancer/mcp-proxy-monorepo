/**
 * Claude Connectors OAuth Provider configuration for LibreOffice Calc MCP
 *
 * This configuration enables the mcp-proxy to act as an OAuth provider for Claude Connectors.
 * Use this when adding LibreOffice Calc MCP as a custom connector in the Claude web app.
 *
 * CLAUDE CONNECTORS SETUP:
 *
 * 1. In Claude web app, go to "Add custom connector" (Beta)
 * 2. Fill in the following fields:
 *    - Name: LibreOffice Calc (or your preferred name)
 *    - Remote MCP server URL: http://127.0.0.1:8081/mcp
 *    - OAuth Client ID: claude-libreoffice-client
 *    - OAuth Client Secret: libre-secret-key-change-me
 *
 * 3. Click "Add" to connect
 *
 * LIBREOFFICE SETUP:
 *
 * 1. Install LibreOffice with the MCP server enabled
 * 2. Start LibreOffice with listening enabled:
 *    - Or use: start-libreoffice.bat in packages/libreoffice-calc-mcp/
 * 3. Default connection: localhost:2002
 *
 * SECURITY NOTES:
 * - Change the default client_secret in production
 * - For multiple clients, use the allowedClients array format
 * - Use HTTPS in production for secure token transmission
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   node src/cli.js -c ../examples/claude-connectors-libreoffice.config.js
 *
 * Environment variables (.env file):
 *   LIBREOFFICE_HOST=localhost
 *   LIBREOFFICE_PORT=2002
 *   OAUTH_CLIENT_SECRET=libre-secret-key-change-me
 */

export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'libreoffice-calc-mcp'],
    env: {
      LIBREOFFICE_HOST: process.env.LIBREOFFICE_HOST || 'localhost',
      LIBREOFFICE_PORT: process.env.LIBREOFFICE_PORT || '2002'
    }
  },
  server: {
    port: 8081,
    host: '127.0.0.1'
  },
  // OAuth Provider mode for Claude Connectors
  oauthProvider: {
    // Simple mode: Use a shared secret for all clients
    // Enter this exact secret in Claude Connectors OAuth Client Secret field
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'libre-secret-key-change-me',

    // Token expiration (default: 24 hours)
    tokenExpiration: 24 * 60 * 60 * 1000,

    // OR: Use allowedClients for multiple clients with different secrets
    /*
    allowedClients: [
      {
        clientId: 'claude-libreoffice-client',
        clientSecret: 'libre-secret-key-change-me',
        name: 'Claude Connectors - LibreOffice'
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
