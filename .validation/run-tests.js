#!/usr/bin/env node

/**
 * Validation Test Runner
 *
 * Runs all validation tests for the MCP Proxy monorepo.
 * Usage: node .validation/run-tests.js [test-name]
 *
 * Available tests:
 *   - all: Run all tests (default)
 *   - oauth: OAuth 2.0 flow validation
 *   - libreoffice: LibreOffice connection validation
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

// Available tests
const tests = {
  oauth: {
    name: 'OAuth 2.0 Flow Validation',
    file: 'oauth-validation.test.js',
    description: 'Tests OAuth authentication, protected routes, and session management'
  },
  'oauth-e2e': {
    name: 'OAuth End-to-End Test',
    file: 'oauth-e2e.test.js',
    description: 'End-to-end OAuth flow test with protected route validation'
  },
  libreoffice: {
    name: 'LibreOffice Connection Validation',
    file: 'libreoffice-validation.test.js',
    description: 'Tests LibreOffice startup, socket connection, and configuration'
  }
};

// Run a single test file
const runTest = (testKey) => {
  return new Promise((resolve) => {
    const test = tests[testKey];
    if (!test) {
      log.fail(`Unknown test: ${testKey}`);
      resolve(1);
      return;
    }

    log.header(`Running: ${test.name}`);
    log.info(test.description);

    const testPath = path.join(__dirname, test.file);
    const testProcess = spawn('node', [testPath], {
      stdio: 'inherit',
      env: { ...process.env }
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        log.success(`${test.name} passed`);
      } else {
        log.fail(`${test.name} failed with exit code ${code}`);
      }
      resolve(code);
    });

    testProcess.on('error', (err) => {
      log.fail(`Failed to run test: ${err.message}`);
      resolve(1);
    });
  });
};

// Main runner
const main = async () => {
  const args = process.argv.slice(2);
  const testToRun = args[0] || 'all';

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  MCP Proxy Validation Test Runner                         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  let exitCode = 0;

  if (testToRun === 'all') {
    log.header('Running all validation tests...\n');

    for (const key of Object.keys(tests)) {
      const code = await runTest(key);
      if (code !== 0) exitCode = code;
    }
  } else {
    exitCode = await runTest(testToRun);
  }

  // Final summary
  if (exitCode === 0) {
    log.header('\n✓ All validation tests passed!');
  } else {
    log.header('\n✗ Some validation tests failed');
  }

  process.exit(exitCode);
};

main();
