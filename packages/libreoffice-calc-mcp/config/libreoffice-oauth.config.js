/**
 * LibreOffice MCP - Claude Connectors OAuth Provider configuration
 *
 * This configuration enables the mcp-proxy to act as an OAuth provider for Claude Connectors.
 * Use this when adding LibreOffice MCP as a custom connector in the Claude web app.
 *
 * CLAUDE CONNECTORS SETUP:
 *
 * 1. In Claude web app, go to "Add custom connector" (Beta)
 * 2. Fill in the following fields:
 *    - Name: LibreOffice Calc (or your preferred name)
 *    - Remote MCP server URL: http://127.0.0.1:8085/message
 *    - OAuth Client ID: claude-libreoffice-client
 *    - OAuth Client Secret: [Use value from .env file - DO NOT use the placeholder below]
 *
 * 3. Click "Add" to connect
 *
 * SECURITY NOTES:
 * - NEVER use the placeholder value 'libreoffice-secret-key-change-me' in production
 * - Set OAUTH_CLIENT_SECRET in your .env file with a strong random value
 * - Generate a secure secret: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 * - For multiple clients, use the allowedClients array format
 * - Use HTTPS in production for secure token transmission
 *
 * Usage:
 *   cd packages/libreoffice-calc-mcp
 *   node ../mcp-http-proxy/src/cli.js -c config/libreoffice-oauth.config.js
 *
 * Environment variables (.env file):
 *   MCP_LIBREOFFICE_PYTHON: Path to LibreOffice's Python executable
 *   MCP_LIBREOFFICE_HOST: LibreOffice socket host (default: localhost)
 *   MCP_LIBREOFFICE_PORT: LibreOffice socket port (default: 2002)
 *   MCP_LIBREOFFICE_PROGRAM_DIR: LibreOffice program directory for PYTHONPATH
 *   OAUTH_CLIENT_SECRET: OAuth client secret for Claude Connectors
 *   LIBREOFFICE_TUNNEL_DOMAIN: Cloudflare tunnel domain (optional)
 *   LIBREOFFICE_TUNNEL_ID: Cloudflare tunnel ID (optional)
 */

import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env from parent directory
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// LibreOffice configuration defaults for Windows
const DEFAULT_LIBREOFFICE_PYTHON = 'C:/Program Files/LibreOffice/program/python.exe';
const DEFAULT_LIBREOFFICE_PROGRAM_DIR = 'C:/Program Files/LibreOffice/program';

export default {
  mcp: {
    // Use LibreOffice's bundled Python (required for UNO/pyuno compatibility)
    // Note: Quoted path required due to spaces on Windows
    command: `"${process.env.MCP_LIBREOFFICE_PYTHON || DEFAULT_LIBREOFFICE_PYTHON}"`,
    args: ['-m', 'libreoffice_calc_mcp'],
    env: {
      LIBREOFFICE_HOST: process.env.MCP_LIBREOFFICE_HOST || 'localhost',
      LIBREOFFICE_PORT: process.env.MCP_LIBREOFFICE_PORT || '2002',
      // Add server src and LibreOffice program directory to Python path
      PYTHONPATH: (
        join(__dirname, '../../libreoffice-calc-mcp-server/src') + ';' +
        (process.env.MCP_LIBREOFFICE_PROGRAM_DIR || DEFAULT_LIBREOFFICE_PROGRAM_DIR)
      )
    }
  },
  server: {
    port: parseInt(process.env.MCP_OAUTH_PROXY_PORT) || 8085,
    host: process.env.MCP_PROXY_HOST || '127.0.0.1'
  },
  // Cloudflare tunnel for external HTTPS access
  tunnel: {
    domain: process.env.LIBREOFFICE_TUNNEL_DOMAIN || 'libreoffice-calc-mcp.angussoftware.dev',
    tunnelId: process.env.LIBREOFFICE_TUNNEL_ID || '8d14ea92-a9f8-476e-bd3b-a9648cb7b4bf'
  },
  // OAuth Provider mode for Claude Connectors
  oauthProvider: {
    // Simple mode: Use a shared secret for all clients
    // Enter this exact secret in Claude Connectors OAuth Client Secret field
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'libreoffice-secret-key-change-me',

    // Token expiration (default: 24 hours)
    tokenExpiration: 24 * 60 * 60 * 1000,

    // OR: Use allowedClients for multiple clients with different secrets
    /*
    allowedClients: [
      {
        clientId: 'claude-libreoffice-client',
        clientSecret: 'libreoffice-secret-key-change-me',
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
