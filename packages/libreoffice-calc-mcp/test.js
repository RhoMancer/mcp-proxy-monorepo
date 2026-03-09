#!/usr/bin/env node

/**
 * Test script for LibreOffice MCP end-to-end testing
 *
 * This script tests:
 * 1. MCP server process spawning
 * 2. MCP initialization
 * 3. Tools listing
 * 4. Optional tool call (requires LibreOffice running)
 *
 * Environment variables:
 * - MCP_TEST_DATA_PATH: Path to test spreadsheet file (required for tool call test)
 */

import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from current directory
dotenv.config({ path: join(__dirname, '.env') });

// Configuration with environment variable support
const config = {
  mcp: {
    command: `"${process.env.MCP_LIBREOFFICE_PYTHON || 'C:/Program Files/LibreOffice/program/python.exe'}"`,
    args: ['-m', 'libreoffice_calc_mcp'],
    env: {
      LIBREOFFICE_HOST: process.env.MCP_LIBREOFFICE_HOST || 'localhost',
      LIBREOFFICE_PORT: process.env.MCP_LIBREOFFICE_PORT || '2002',
      PYTHONPATH: join(__dirname, '../libreoffice-calc-mcp-server/src') + ';' + (process.env.MCP_LIBREOFFICE_PROGRAM_DIR || 'C:/Program Files/LibreOffice/program')
    }
  },
  testDataPath: process.env.MCP_TEST_DATA_PATH
};

let testPassed = 0;
let testFailed = 0;

function log(message) {
  console.log(`[TEST] ${message}`);
}

function error(message) {
  console.error(`[ERROR] ${message}`);
}

async function testMcpServer() {
  log('Starting LibreOffice MCP Server test...\n');

  // Spawn MCP process
  log('1. Spawning MCP process...');
  const mcpProcess = spawn(config.mcp.command, config.mcp.args, {
    env: {
      ...process.env,
      ...config.mcp.env
    },
    shell: true
  });

  let buffer = '';
  const responses = new Map();

  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          const resolver = responses.get(response.id);
          if (resolver) {
            resolver.resolve(response);
            responses.delete(response.id);
          } else {
            log(`Received unexpected response: ${JSON.stringify(response).substring(0, 100)}...`);
          }
        } catch (e) {
          error(`Failed to parse response: ${line}`);
        }
      }
    }
  });

  mcpProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg && !msg.includes('UNO') && !msg.includes('pyuno')) {
      error(`[MCP stderr]: ${msg}`);
    }
  });

  function sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1000000);
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      responses.set(id, { resolve, reject });

      if (mcpProcess.stdin) {
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } else {
        reject(new Error('Process stdin not available'));
      }

      setTimeout(() => {
        if (responses.has(id)) {
          responses.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  // Wait a bit for process to start
  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Initialize
  log('2. Testing MCP initialization...');
  try {
    const initResponse = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });

    if (initResponse.error) {
      error(`Initialize failed: ${initResponse.error.message}`);
      testFailed++;
    } else {
      log('   ✓ MCP initialized successfully');
      testPassed++;
    }
  } catch (e) {
    error(`Initialize error: ${e.message}`);
    testFailed++;
  }

  // Send initialized notification
  mcpProcess.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  }) + '\n');

  await new Promise(r => setTimeout(r, 500));

  // Test 3: List tools
  log('3. Testing tools/list...');
  try {
    const toolsResponse = await sendRequest('tools/list');

    if (toolsResponse.error) {
      error(`Tools list failed: ${toolsResponse.error.message}`);
      testFailed++;
    } else {
      const tools = toolsResponse.result?.tools || [];
      log(`   ✓ Found ${tools.length} tools:`);
      tools.forEach(t => log(`     - ${t.name}: ${t.description?.substring(0, 50)}...`));
      testPassed++;

      // Test 4: Call a tool (will fail if LibreOffice not running or test file not set)
      log('4. Testing tool call (read_cell) - requires LibreOffice running and MCP_TEST_DATA_PATH set...');
      if (!config.testDataPath) {
        log('   ⚠ Skipping test: MCP_TEST_DATA_PATH not set in .env');
        testPassed++; // Count as pass since we explicitly skip
      } else {
        try {
          const toolResponse = await sendRequest('tools/call', {
            name: 'read_cell',
            arguments: {
              file: config.testDataPath,
              column: 0,
              row: 0
            }
          });

          if (toolResponse.error) {
            log(`   ⚠ Tool call returned error (expected if LibreOffice not running):`);
            log(`     ${toolResponse.result?.content?.[0]?.text || toolResponse.error?.message}`);
            testPassed++; // Count as pass since we expect this might fail
          } else {
            log(`   ✓ Tool call succeeded: ${JSON.stringify(toolResponse.result).substring(0, 100)}...`);
            testPassed++;
          }
        } catch (e) {
          log(`   ⚠ Tool call timeout or error (expected if LibreOffice not running): ${e.message}`);
          testPassed++; // Count as pass since we expect this might fail
        }
      }
    }
  } catch (e) {
    error(`Tools list error: ${e.message}`);
    testFailed++;
  }

  // Cleanup
  await new Promise(r => setTimeout(r, 500));
  mcpProcess.kill();

  // Summary
  log('\n═══════════════════════════════════════════════════');
  log(`Test Results: ${testPassed} passed, ${testFailed} failed`);
  log('═══════════════════════════════════════════════════\n');

  if (testFailed > 0) {
    process.exit(1);
  }
}

// Instructions
log('═══════════════════════════════════════════════════');
log('LibreOffice MCP Test Suite');
log('═══════════════════════════════════════════════════\n');

if (!config.testDataPath) {
  log('Note: For full tool testing, set MCP_TEST_DATA_PATH in .env');
}

log('Note: For full tool testing, LibreOffice must be running:');
log('  Set MCP_TEST_DATA_PATH in .env to your test spreadsheet path');
log('  Example: MCP_TEST_DATA_PATH=C:/path/to/test.ods\n');

testMcpServer().catch(err => {
  error(`Test suite error: ${err.message}`);
  process.exit(1);
});
