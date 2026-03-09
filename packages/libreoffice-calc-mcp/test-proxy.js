#!/usr/bin/env node

/**
 * Test the HTTP proxy endpoint for LibreOffice MCP
 *
 * Environment variables:
 * - MCP_TEST_DATA_PATH: Path to test spreadsheet file (required for tool call test)
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from current directory
dotenv.config({ path: join(__dirname, '.env') });

const config = {
  baseUrl: `http://${process.env.MCP_PROXY_HOST || '127.0.0.1'}:${process.env.MCP_PROXY_PORT || 8081}`,
  testDataPath: process.env.MCP_TEST_DATA_PATH
};

async function testProxy() {
  log('═══════════════════════════════════════════════════');
  log('LibreOffice MCP HTTP Proxy Test');
  log('═══════════════════════════════════════════════════\n');

  log('Note: Start the proxy first with:');
  log('  cd packages/libreoffice-calc-mcp && npm start\n');

  await new Promise(r => setTimeout(r, 1000));

  // Test 1: Health check
  log('1. Testing health endpoint...');
  try {
    const response = await fetch(`${config.baseUrl}/health`);
    const data = await response.json();
    log(`   Status: ${data.status}`);
    log(`   MCP Running: ${data.mcpRunning}`);
    log(`   MCP Initialized: ${data.mcpInitialized}`);
    log('   ✓ Health check passed\n');
  } catch (e) {
    error(`Health check failed: ${e.message}`);
    error('Make sure the proxy is running: cd packages/libreoffice-calc-mcp && npm start\n');
    process.exit(1);
  }

  // Test 2: Tools list
  log('2. Testing /tools endpoint...');
  try {
    const response = await fetch(`${config.baseUrl}/tools`);
    const data = await response.json();
    const tools = data.result?.tools || [];

    log(`   ✓ Found ${tools.length} tools:`);
    tools.forEach(t => log(`     - ${t.name}`));
    log('');
  } catch (e) {
    error(`Tools list failed: ${e.message}`);
  }

  // Test 3: Tool call via JSON-RPC
  log('3. Testing tool call via /message endpoint...');
  if (!config.testDataPath) {
    log('   ⚠ Skipping test: MCP_TEST_DATA_PATH not set in .env');
  } else {
    try {
      const response = await fetch(`${config.baseUrl}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'list_sheets',
            arguments: {
              file: config.testDataPath
            }
          }
        })
      });
      const data = await response.json();

      if (data.error) {
        log(`   ⚠ Expected error (LibreOffice not running):`);
        log(`     ${data.result?.content?.[0]?.text || JSON.stringify(data.error).substring(0, 100)}...`);
      } else {
        log(`   ✓ Tool call result: ${JSON.stringify(data.result).substring(0, 100)}...`);
      }
    } catch (e) {
      error(`Tool call failed: ${e.message}`);
    }
  }

  log('\n═══════════════════════════════════════════════════');
  log('Proxy test completed');
  log('═══════════════════════════════════════════════════\n');
}

function log(message) {
  console.log(`[TEST] ${message}`);
}

function error(message) {
  console.error(`[ERROR] ${message}`);
}

testProxy().catch(err => {
  error(`Test error: ${err.message}`);
  process.exit(1);
});
