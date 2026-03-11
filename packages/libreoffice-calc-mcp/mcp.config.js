/**
 * Configuration for libreoffice-calc-mcp HTTP proxy
 *
 * This proxy allows libreoffice-calc-mcp (stdio-based) to work with HTTP clients.
 *
 * Environment variables (optional):
 * - MCP_LIBREOFFICE_PYTHON: Path to LibreOffice's Python executable
 * - MCP_LIBREOFFICE_HOST: LibreOffice socket host (default: localhost)
 * - MCP_LIBREOFFICE_PORT: LibreOffice socket port (default: 2002)
 * - MCP_LIBREOFFICE_PROGRAM_DIR: LibreOffice program directory for PYTHONPATH
 * - MCP_PROXY_PORT: Port for the proxy (default: 8081)
 * - MCP_PROXY_HOST: Host for the proxy (default: 127.0.0.1)
 */

import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env from the current directory
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

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
        join(__dirname, '../libreoffice-calc-mcp-server/src') + ';' +
        (process.env.MCP_LIBREOFFICE_PROGRAM_DIR || DEFAULT_LIBREOFFICE_PROGRAM_DIR)
      )
    }
  },
  server: {
    port: parseInt(process.env.MCP_PROXY_PORT) || 8081,
    host: process.env.MCP_PROXY_HOST || '127.0.0.1'
  },
  // Cloudflare tunnel for external HTTPS access
  tunnel: {
    domain: 'libreoffice-calc-mcp.angussoftware.dev',
    tunnelId: '8d14ea92-a9f8-476e-bd3b-a9648cb7b4bf'
  },
  // OAuth Provider mode for Claude Connectors
  oauthProvider: {
    // Simple mode: Use a shared secret for all clients
    // Enter this exact secret in Claude Connectors OAuth Client Secret field
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'libreoffice-secret-key-change-me',

    // Token expiration (default: 24 hours)
    tokenExpiration: 24 * 60 * 60 * 1000
  }
};
