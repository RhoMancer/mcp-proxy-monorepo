#!/usr/bin/env node

/**
 * LibreOffice Connection Validation Tests
 *
 * Tests the LibreOffice Calc MCP connection and startup process.
 * Run with: node .validation/libreoffice-validation.test.js
 *
 * Prerequisites:
 * - LibreOffice installed
 * - Test spreadsheet file available
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEST_PORT = 8081;
const PROXY_PATH = path.join(__dirname, '..', 'packages', 'libreoffice-calc-mcp');
const START_BAT = path.join(PROXY_PATH, 'start-libreoffice.bat');
const TEST_SPREADSHEET = path.join(PROXY_PATH, 'test-data', 'test.ods');

// Color output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`)
};

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  manual: 0
};

// Check if LibreOffice is installed
const checkLibreOfficeInstalled = () => {
  log.info('Checking if LibreOffice is installed...');

  const possiblePaths = [
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    path.join(process.env.PROGRAMFILES || '', 'LibreOffice', 'program', 'soffice.exe'),
    path.join(process.env['PROGRAMFILES(X86)'] || '', 'LibreOffice', 'program', 'soffice.exe')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      log.success(`LibreOffice found at: ${p}`);
      testResults.passed++;
      return p;
    }
  }

  log.fail('LibreOffice not found in standard locations');
  testResults.failed++;
  return null;
};

// Check if start-libreoffice.bat exists and is valid
const checkStartScript = () => {
  log.info('Checking start-libreoffice.bat script...');

  if (!fs.existsSync(START_BAT)) {
    log.fail(`start-libreoffice.bat not found at: ${START_BAT}`);
    testResults.failed++;
    return false;
  }

  const content = fs.readFileSync(START_BAT, 'utf-8');

  // Check for required elements
  const hasAccept = content.includes('--accept=');
  const hasHeadless = content.includes('--headless');
  const hasSocket = content.includes('socket,host=localhost,port=2002');

  if (hasAccept && hasHeadless && hasSocket) {
    log.success('start-libreoffice.bat has correct socket mode parameters');
    testResults.passed++;
    return true;
  } else {
    log.fail('start-libreoffice.bat missing required parameters');
    if (!hasAccept) log.warn('  Missing: --accept parameter');
    if (!hasHeadless) log.warn('  Missing: --headless parameter');
    if (!hasSocket) log.warn('  Missing: socket configuration');
    testResults.failed++;
    return false;
  }
};

// Test: Check if soffice.exe is running
const checkSofficeRunning = async () => {
  log.info('Checking if soffice.exe is running...');

  return new Promise((resolve) => {
    // Use tasklist on Windows to check for soffice.exe
    const tasklist = spawn('tasklist', ['/FI', 'IMAGENAME eq soffice.exe', '/FO', 'CSV']);

    let output = '';

    tasklist.stdout.on('data', (data) => {
      output += data.toString();
    });

    tasklist.on('close', (code) => {
      if (output.includes('soffice.exe')) {
        log.success('soffice.exe is running');
        testResults.passed++;
        resolve(true);
      } else {
        log.warn('soffice.exe is NOT running (start it with start-libreoffice.bat)');
        testResults.manual++;
        resolve(false);
      }
    });

    tasklist.on('error', () => {
      log.warn('Could not check for soffice.exe (Windows only)');
      testResults.skipped++;
      resolve(null);
    });
  });
};

// Test: Check if port 2002 is listening (LibreOffice socket)
const checkSocketListening = async () => {
  log.info('Checking if LibreOffice socket (port 2002) is listening...');

  return new Promise((resolve) => {
    // Use netstat to check for port 2002
    const netstat = spawn('netstat', ['-an']);

    let output = '';

    netstat.stdout.on('data', (data) => {
      output += data.toString();
    });

    netstat.on('close', (code) => {
      if (output.includes(':2002') && output.includes('LISTENING')) {
        log.success('Port 2002 is listening (LibreOffice socket active)');
        testResults.passed++;
        resolve(true);
      } else {
        log.warn('Port 2002 is NOT listening');
        testResults.manual++;
        resolve(false);
      }
    });

    netstat.on('error', () => {
      log.warn('Could not check socket status');
      testResults.skipped++;
      resolve(null);
    });
  });
};

// Test: Check if test spreadsheet exists
const checkTestSpreadsheet = () => {
  log.info('Checking for test spreadsheet...');

  if (fs.existsSync(TEST_SPREADSHEET)) {
    const stats = fs.statSync(TEST_SPREADSHEET);
    log.success(`Test spreadsheet found: ${TEST_SPREADSHEET} (${stats.size} bytes)`);
    testResults.passed++;
    return true;
  } else {
    log.warn(`Test spreadsheet not found: ${TEST_SPREADSHEET}`);
    testResults.manual++;
    return false;
  }
};

// Test: Verify README.md instructions are accurate
const verifyQuickStartInstructions = () => {
  log.info('Verifying README.md has quick start instructions...');

  const readmePath = path.join(PROXY_PATH, 'README.md');
  if (!fs.existsSync(readmePath)) {
    log.fail('README.md not found');
    testResults.failed++;
    return false;
  }

  const content = fs.readFileSync(readmePath, 'utf-8');

  // Check for key instructions
  const checks = [
    { name: 'Mentions start-libreoffice.bat', pattern: /start-libreoffice\.bat/ },
    { name: 'Mentions Task Manager check', pattern: /Task Manager/i },
    { name: 'Mentions soffice.exe', pattern: /soffice\.exe/ },
    { name: 'Has troubleshooting section', pattern: /## Troubleshooting/i },
    { name: 'Includes health check URL', pattern: /\/health/ }
  ];

  let allPassed = true;
  for (const check of checks) {
    if (!check.pattern.test(content)) {
      log.warn(`README.md: ${check.name} - not found`);
      allPassed = false;
    }
  }

  if (allPassed) {
    log.success('README.md contains all key instructions');
    testResults.passed++;
  } else {
    log.warn('README.md may be missing some instructions');
    testResults.manual++;
  }

  return allPassed;
};

// Test: Try to connect to LibreOffice socket
const testSocketConnection = async () => {
  log.info('Testing socket connection to LibreOffice...');

  const net = await import('net');

  return new Promise((resolve) => {
    const client = new net.Socket();

    const timeout = setTimeout(() => {
      client.destroy();
      log.warn('Socket connection timeout (LibreOffice not running in socket mode?)');
      testResults.manual++;
      resolve(false);
    }, 3000);

    client.connect(2002, '127.0.0.1', () => {
      clearTimeout(timeout);
      log.success('Successfully connected to LibreOffice socket on port 2002');
      testResults.passed++;
      client.destroy();
      resolve(true);
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      log.warn(`Socket connection failed: ${err.message}`);
      testResults.manual++;
      resolve(false);
    });
  });
};

// Run all tests
const runTests = async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  LibreOffice Connection Validation Tests                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Run tests
  checkLibreOfficeInstalled();
  checkStartScript();
  checkTestSpreadsheet();
  verifyQuickStartInstructions();
  await checkSofficeRunning();
  await checkSocketListening();
  await testSocketConnection();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Test Summary                                              ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  Passed:   ${testResults.passed.toString().padStart(20)} ║`);
  console.log(`║  Failed:   ${testResults.failed.toString().padStart(20)} ║`);
  console.log(`║  Manual:   ${testResults.manual.toString().padStart(20)} ║`);
  console.log(`║  Skipped:  ${testResults.skipped.toString().padStart(20)} ║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (testResults.manual > 0) {
    console.log('Some tests require manual verification:');
    console.log('1. Start LibreOffice: double-click packages/libreoffice-calc-mcp/start-libreoffice.bat');
    console.log('2. Check Task Manager for soffice.exe');
    console.log('3. Run these tests again\n');
  }

  if (testResults.failed > 0) {
    process.exit(1);
  }
};

runTests().catch(err => {
  log.fail(`Test runner failed: ${err.message}`);
  process.exit(1);
});
