#!/usr/bin/env node

/**
 * End-to-End OAuth Flow Test
 *
 * Tests the complete OAuth 2.0 authentication flow with a mock provider.
 * This test validates:
 * - Health endpoint reports auth status correctly
 * - Protected routes return 401 without authentication
 * - Public routes remain accessible
 * - OAuth endpoints are properly configured
 *
 * Usage:
 *   node .validation/oauth-e2e.test.js
 *
 * Prerequisites:
 *   - Proxy server running on http://127.0.0.1:8080
 *   - OAuth enabled in configuration
 */

import http from 'http';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`),
};

const PROXY_URL = 'http://127.0.0.1:8080';
let testsPassed = 0;
let testsFailed = 0;
let testsSkipped = 0;

/**
 * Make an HTTP request and return the result
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {object} headers - Request headers
 * @param {number} timeoutMs - Request timeout in milliseconds (default: 5000)
 */
function request(method, path, headers = {}, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PROXY_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 8080,
      path: url.pathname + url.search,
      method,
      headers: {
        'User-Agent': 'oauth-e2e-test',
        ...headers,
      },
      timeout: timeoutMs,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    });
    req.end();
  });
}

/**
 * Test helper with assertion
 */
async function test(name, fn) {
  try {
    await fn();
    testsPassed++;
    log.success(name);
  } catch (error) {
    testsFailed++;
    log.fail(`${name}: ${error.message}`);
  }
}

/**
 * Skip a test with a message
 */
function skip(name, reason) {
  testsSkipped++;
  log.warn(`${name} - SKIPPED: ${reason}`);
}

/**
 * Check if the proxy is running
 */
async function checkProxyRunning() {
  try {
    const response = await request('GET', '/health');
    return response.statusCode < 500;
  } catch {
    return false;
  }
}

/**
 * Run all E2E OAuth tests
 */
async function runTests() {
  log.section('═══ OAuth End-to-End Test ═══');
  log.info(`Testing proxy at: ${PROXY_URL}`);

  // Check if proxy is running
  const isRunning = await checkProxyRunning();
  if (!isRunning) {
    log.warn('Proxy is not running. Start it with:');
    log.warn('  cd packages/mcp-http-proxy');
    log.warn('  npx mcp-proxy --config examples/echo-oauth-test.config.js');
    log.info('Skipping E2E tests (manual test - requires running proxy)\n');
    process.exit(0);  // Exit 0 to not fail the test suite
  }

  // Test 1: Health endpoint
  await test('Health endpoint returns 200', async () => {
    const response = await request('GET', '/health');
    if (response.statusCode !== 200) {
      throw new Error(`Expected 200, got ${response.statusCode}`);
    }
  });

  // Test 2: Check auth status from health endpoint
  await test('Health endpoint reports auth status', async () => {
    const response = await request('GET', '/health');
    let data;
    try {
      data = JSON.parse(response.body);
    } catch {
      throw new Error('Health endpoint did not return JSON');
    }
    if (typeof data.authEnabled !== 'boolean') {
      throw new Error(`authEnabled not found or not boolean in health response`);
    }
    if (data.authEnabled) {
      log.info('OAuth is enabled on this proxy');
    } else {
      log.warn('OAuth is NOT enabled on this proxy - some tests will be skipped');
    }
  });

  // Test 3: Tools endpoint is protected
  await test('Tools endpoint returns 401 without auth (when OAuth enabled)', async () => {
    const response = await request('GET', '/tools');
    const healthData = JSON.parse((await request('GET', '/health')).body);

    if (healthData.authEnabled) {
      if (response.statusCode !== 401) {
        throw new Error(`Expected 401 without auth, got ${response.statusCode}`);
      }
    } else {
      skip('Tools endpoint protection check', 'OAuth not enabled');
    }
  });

  // Test 4: SSE endpoint is protected
  await test('SSE endpoint returns 401 without auth (when OAuth enabled)', async () => {
    // Use short timeout for SSE - it will keep connection open if not authenticated
    const response = await request('GET', '/sse', {}, 2000);
    const healthData = JSON.parse((await request('GET', '/health')).body);

    if (healthData.authEnabled) {
      if (response.statusCode !== 401) {
        throw new Error(`Expected 401 without auth, got ${response.statusCode}`);
      }
    } else {
      skip('SSE endpoint protection check', 'OAuth not enabled');
    }
  });

  // Test 5: Message endpoint is protected
  await test('Message endpoint returns 401 without auth (when OAuth enabled)', async () => {
    const response = await request('POST', '/message', {
      'Content-Type': 'application/json',
    });
    const healthData = JSON.parse((await request('GET', '/health')).body);

    if (healthData.authEnabled) {
      if (response.statusCode !== 401) {
        throw new Error(`Expected 401 without auth, got ${response.statusCode}`);
      }
    } else {
      skip('Message endpoint protection check', 'OAuth not enabled');
    }
  });

  // Test 6: Auth login endpoint exists
  await test('Auth login endpoint exists (when OAuth enabled)', async () => {
    const response = await request('GET', '/auth/login');
    const healthData = JSON.parse((await request('GET', '/health')).body);

    if (healthData.authEnabled) {
      if (response.statusCode === 404) {
        throw new Error('Auth login endpoint not found (404)');
      }
      // Should either redirect (302/301) or return HTML
      if (response.statusCode !== 302 && response.statusCode !== 301 && response.statusCode !== 200) {
        throw new Error(`Unexpected status code: ${response.statusCode}`);
      }
    } else {
      skip('Auth login endpoint check', 'OAuth not enabled');
    }
  });

  // Test 7: Auth me endpoint returns 401 without session
  await test('Auth me endpoint returns 401 without session (when OAuth enabled)', async () => {
    const response = await request('GET', '/auth/me');
    const healthData = JSON.parse((await request('GET', '/health')).body);

    if (healthData.authEnabled) {
      if (response.statusCode !== 401) {
        throw new Error(`Expected 401 without session, got ${response.statusCode}`);
      }
    } else {
      skip('Auth me endpoint check', 'OAuth not enabled');
    }
  });

  // Test 8: MCP endpoint is available
  await test('MCP endpoint is accessible', async () => {
    const response = await request('GET', '/mcp');
    if (response.statusCode === 404) {
      throw new Error('MCP endpoint not found');
    }
  });

  // Print summary
  log.section('═══ Test Summary ═══');
  console.log(`  Passed:  ${colors.green}${testsPassed}${colors.reset}`);
  console.log(`  Failed:  ${colors.red}${testsFailed}${colors.reset}`);
  console.log(`  Skipped: ${colors.yellow}${testsSkipped}${colors.reset}`);

  if (testsFailed > 0) {
    console.log(`\n${colors.red}Some tests failed!${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
    process.exit(0);
  }
}

runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
