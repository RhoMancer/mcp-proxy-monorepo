#!/usr/bin/env node

/**
 * LibreOffice MCP Proxy Launcher
 *
 * This script automatically:
 * 1. Checks if LibreOffice is running in socket mode
 * 2. If not, starts LibreOffice in the background with socket listening enabled
 * 3. Starts the MCP HTTP proxy
 *
 * Usage: node start.js
 *
 * Environment variables:
 * - MCP_LIBREOFFICE_PATH: Path to LibreOffice executable
 * - MCP_LIBREOFFICE_HOST: LibreOffice socket host (default: localhost)
 * - MCP_LIBREOFFICE_PORT: LibreOffice socket port (default: 2002)
 * - MCP_PROXY_PORT: Proxy server port (default: 8081)
 * - MCP_PROXY_HOST: Proxy server host (default: 127.0.0.1)
 */

import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { ProxyServer } from 'mcp-http-proxy';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from current directory
dotenv.config({ path: join(__dirname, '.env') });

// Configuration with environment variable support
const CONFIG = {
  // Possible LibreOffice paths on Windows
  libreOfficePaths: [
    process.env.MCP_LIBREOFFICE_PATH,
    'C:/Program Files/LibreOffice/program/soffice.exe',
    'C:/Program Files (x86)/LibreOffice/program/soffice.exe',
    `${process.env.LOCALAPPDATA}/Programs/LibreOffice/program/soffice.exe`,
  ].filter(Boolean),
  // Socket connection settings
  host: process.env.MCP_LIBREOFFICE_HOST || 'localhost',
  port: process.env.MCP_LIBREOFFICE_PORT || '2002',
  // Proxy server settings
  proxyPort: parseInt(process.env.MCP_PROXY_PORT) || 8081,
  proxyHost: process.env.MCP_PROXY_HOST || '127.0.0.1',
};

/**
 * Find LibreOffice executable on the system
 */
function findLibreOffice() {
  for (const path of CONFIG.libreOfficePaths) {
    if (path && existsSync(path)) {
      return path;
    }
  }
  return null;
}

/**
 * Check if LibreOffice is already running in socket mode
 * Uses netstat to check if port is listening
 */
function isLibreOfficeRunning() {
  return new Promise((resolve) => {
    exec(`netstat -an | findstr :${CONFIG.port}`, (error, stdout) => {
      if (stdout && stdout.includes('LISTENING')) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Check if soffice.exe process is running
 */
function isLibreOfficeProcessRunning() {
  return new Promise((resolve) => {
    exec('tasklist | findstr soffice.exe', (error, stdout) => {
      resolve(stdout && stdout.includes('soffice.exe'));
    });
  });
}

/**
 * Start LibreOffice in socket listening mode with verification
 */
function startLibreOffice(sofficePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--accept', `socket,host=${CONFIG.host},port=${CONFIG.port};urp;StarOffice.ServiceManager`,
      '--headless',
      '--nodefault',
      '--nolockcheck',
    ];

    console.log(`Starting LibreOffice in socket mode...`);
    console.log(`  Path: ${sofficePath}`);
    console.log(`  Socket: ${CONFIG.host}:${CONFIG.port}`);

    // Use exec to run LibreOffice - this works like a shell command
    // and properly detaches on Windows
    const startCmd = exec(`"${sofficePath}" ${args.join(' ')}`, {
      windowsHide: true,
    });

    startCmd.on('error', (err) => {
      reject(new Error(`Failed to start LibreOffice: ${err.message}`));
    });

    console.log(`  Process spawned, waiting for socket to be ready...`);

    // Verify socket is actually listening with retries
    let retries = 15; // Increased to 15 seconds
    const checkInterval = 1000; // 1 second

    const checkSocket = async () => {
      retries--;
      const isListening = await isLibreOfficeRunning();

      if (isListening) {
        console.log('✓ LibreOffice socket is listening\n');
        resolve();
      } else if (retries > 0) {
        // Still waiting, check again
        setTimeout(checkSocket, checkInterval);
      } else {
        // Timed out - provide helpful troubleshooting
        reject(new Error(
          `LibreOffice was started but socket never became ready.\n` +
          `  - Waited 15 seconds for port ${CONFIG.host}:${CONFIG.port}\n\n` +
          `TROUBLESHOOTING:\n` +
          `  1. Check if LibreOffice is already running (close it first)\n` +
          `  2. Try starting manually to see errors:\n` +
          `     "${sofficePath}" --accept="socket,host=${CONFIG.host},port=${CONFIG.port};urp;StarOffice.ServiceManager" --headless\n` +
          `  3. Check if another app is using port ${CONFIG.port} (netstat -an | findstr :${CONFIG.port})`
        ));
      }
    };

    // Start checking after 3 seconds (LibreOffice takes time to start)
    setTimeout(checkSocket, 3000);
  });
}

/**
 * Load MCP config
 */
async function loadConfig() {
  const configPath = join(__dirname, 'mcp.config.js');
  // On Windows, convert path to proper file:// URL format
  const configUrl = process.platform === 'win32'
    ? `file:///${configPath.replace(/\\/g, '/')}`
    : `file://${configPath}`;
  const config = await import(configUrl);
  return config.default;
}

/**
 * Main entry point
 */
async function main() {
  console.log('LibreOffice MCP Proxy Launcher');
  console.log('================================\n');

  // Step 1: Check if LibreOffice is already accessible
  const isRunning = await isLibreOfficeRunning();
  const isProcessRunning = await isLibreOfficeProcessRunning();

  if (!isRunning) {
    if (isProcessRunning) {
      console.log('⚠️  LibreOffice is running but NOT in socket mode.');
      console.log('   Please close LibreOffice and run this script again.');
      console.log('');
      console.log('   You can start LibreOffice manually with:');
      console.log(`     "soffice.exe" --accept="socket,host=${CONFIG.host},port=${CONFIG.port};urp;StarOffice.ServiceManager"\n`);
      process.exit(1);
    }

    // Step 2: Find and start LibreOffice
    const sofficePath = findLibreOffice();
    if (!sofficePath) {
      console.error('❌ LibreOffice not found in standard locations.');
      console.error('   Please install LibreOffice or set MCP_LIBREOFFICE_PATH environment variable.\n');
      console.error('   Standard locations checked:');
      CONFIG.libreOfficePaths.forEach(p => console.error(`     - ${p}`));
      process.exit(1);
    }

    try {
      await startLibreOffice(sofficePath);
      // Final verification - double check socket is still listening
      const finalCheck = await isLibreOfficeRunning();
      if (!finalCheck) {
        console.error('❌ LibreOffice started but socket is not listening.');
        console.error('   This usually means LibreOffice crashed during startup.');
        console.error('   Try starting LibreOffice manually to see error messages.');
        process.exit(1);
      }
    } catch (err) {
      console.error(`❌ ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`✓ LibreOffice is already running in socket mode (${CONFIG.host}:${CONFIG.port})\n`);
  }

  // Step 3: Load config and start proxy
  try {
    const config = await loadConfig();

    // Override server settings from env (mcp.config.js already reads these, but override for explicit env vars)
    if (process.env.MCP_PROXY_PORT) {
      config.server.port = parseInt(process.env.MCP_PROXY_PORT);
    }
    if (process.env.MCP_PROXY_HOST) {
      config.server.host = process.env.MCP_PROXY_HOST;
    }

    const proxy = new ProxyServer(config);
    proxy.start();

  } catch (err) {
    console.error(`❌ Failed to start proxy: ${err.message}`);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
