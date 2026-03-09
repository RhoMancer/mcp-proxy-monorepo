/**
 * Configuration for hevy-mcp HTTP proxy
 *
 * This proxy allows hevy-mcp (stdio-based) to work with HTTP clients.
 *
 * Environment variables:
 * - HEVY_API_KEY: Your Hevy API key (required)
 * - MCP_PROXY_PORT: Proxy port (default: 8080)
 * - MCP_PROXY_HOST: Proxy host (default: 127.0.0.1)
 */

import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load .env from the current directory
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  },
  server: {
    port: parseInt(process.env.MCP_PROXY_PORT) || 8080,
    host: process.env.MCP_PROXY_HOST || '127.0.0.1'
  }
};
