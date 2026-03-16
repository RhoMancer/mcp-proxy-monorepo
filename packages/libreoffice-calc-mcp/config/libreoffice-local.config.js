/**
 * LibreOffice MCP - Local Claude Code configuration (NO OAuth)
 *
 * This configuration runs the LibreOffice MCP server without OAuth for local Claude Code CLI access.
 * Use this alongside the OAuth-enabled proxy for Claude.ai web access.
 *
 * Usage:
 *   cd packages/libreoffice-calc-mcp
 *   node ../mcp-http-proxy/src/cli.js -c config/libreoffice-local.config.js
 *
 * Environment variables (.env file):
 *   MCP_LIBREOFFICE_PYTHON: Path to LibreOffice's Python executable
 *   MCP_LIBREOFFICE_HOST: LibreOffice socket host (default: localhost)
 *   MCP_LIBREOFFICE_PORT: LibreOffice socket port (default: 2002)
 *   MCP_LIBREOFFICE_PROGRAM_DIR: LibreOffice program directory for PYTHONPATH
 *   MCP_LOCAL_PROXY_PORT: Port for local proxy (default: 8084)
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
    // Note: With shell: true in spawn(), cmd.exe handles path quoting automatically
    command: process.env.MCP_LIBREOFFICE_PYTHON || DEFAULT_LIBREOFFICE_PYTHON,
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
    port: parseInt(process.env.MCP_LOCAL_PROXY_PORT) || 8084,
    host: process.env.MCP_PROXY_HOST || '127.0.0.1'
  }
  // NO oauthProvider - this is for local CLI access only
};
