#!/usr/bin/env node

/**
 * CLI entry point for mcp-http-proxy
 *
 * Usage:
 *   mcp-proxy                    # Loads mcp.config.js
 *   mcp-proxy --config my-config.js
 *   mcp-proxy --help
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { ProxyServer } from './ProxyServer.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    config: null,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--config' || arg === '-c') {
      options.config = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
MCP HTTP Proxy - Generic HTTP-to-stdio proxy for MCP servers

USAGE:
  mcp-proxy [OPTIONS]

OPTIONS:
  -c, --config <file>    Path to config file (default: mcp.config.js)
  -h, --help             Show this help message

CONFIG FILE:
  The config file should export a default object with the following structure:

  {
    mcp: {
      command: string,      // Command to spawn MCP server (e.g., 'npx', 'node')
      args: string[],       // Arguments for the command
      env: object          // Environment variables for the MCP server
    },
    server: {
      port: number,        // HTTP port (default: 8080)
      host: string         // HTTP host (default: '127.0.0.1')
    },
    tunnel: {
      domain: string,      // Custom domain for Cloudflare tunnel
      tunnelId: string     // Cloudflare tunnel ID
    }
  }

EXAMPLE CONFIG:
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

ENVIRONMENT VARIABLES:
  Load from .env file in the current directory.

EXAMPLES:
  # Start with default config (mcp.config.js)
  mcp-proxy

  # Start with custom config
  mcp-proxy --config my-config.js

  # With .env file
  echo "API_KEY=secret" > .env
  mcp-proxy

For more information, visit: https://github.com/yourusername/mcp-http-proxy
`);
}

// Load config file
async function loadConfig(configPath) {
  // Default config paths to try
  const defaultPaths = [
    join(process.cwd(), 'mcp.config.js'),
    join(process.cwd(), 'mcp.config.mjs'),
    join(process.cwd(), 'mcp.config.cjs'),
  ];

  const pathsToTry = configPath
    ? [join(process.cwd(), configPath)]
    : defaultPaths;

  for (const path of pathsToTry) {
    try {
      // Try to resolve as an ES module
      const configUrl = `file://${path}`;
      const config = await import(configUrl);
      if (config.default) {
        console.log(`Loaded config from: ${path}`);
        return config.default;
      }
    } catch (e) {
      // Continue to next path
    }
  }

  throw new Error(`No config file found. Tried: ${pathsToTry.join(', ')}`);
}

// Main entry point
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Load .env file
  dotenv.config();

  // Load config
  let config;
  try {
    config = await loadConfig(options.config);
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    console.error('Use --help for usage information.');
    process.exit(1);
  }

  // Create and start proxy server
  const proxy = new ProxyServer(config);
  proxy.start();
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
