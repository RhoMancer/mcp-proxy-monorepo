#!/usr/bin/env node

/**
 * Manual Testing Script for OAuth Provider Mode
 *
 * This script tests the OAuth Provider authentication mode for MCP HTTP Proxy.
 * It validates all endpoints and authentication flows that Claude Connectors uses.
 *
 * Usage:
 *   1. Start the proxy in a separate terminal:
 *      node src/cli.js -c ../examples/claude-connectors-hevy.config.js
 *
 *   2. Run this script:
 *      node test/manual/oauth-provider-test.js
 *
 * Environment variables:
 *   PROXY_URL - Default: http://127.0.0.1:8082
 *   CLIENT_ID - Default: claude-test-client
 *   CLIENT_SECRET - Default: hevy-secret-key-change-me
 */

import http from 'http';

const PROXY_URL = process.env.PROXY_URL || 'http://127.0.0.1:8082';
const CLIENT_ID = process.env.CLIENT_ID || 'claude-test-client';
const CLIENT_SECRET = process.env.CLIENT_SECRET || 'hevy-secret-key-change-me';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✓ ${message}`, 'green');
}

function error(message) {
  log(`✗ ${message}`, 'red');
}

function info(message) {
  log(`ℹ ${message}`, 'blue');
}

function section(title) {
  console.log('');
  log(`═══ ${title} ═══`, 'yellow');
}

/**
 * Make an HTTP request
 */
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PROXY_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Test 1: Health Check Endpoint
 */
async function testHealthCheck() {
  section('Test 1: Health Check Endpoint');

  try {
    const response = await request('GET', '/health');

    if (response.status === 200) {
      success('Health endpoint responded with 200');
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');

      if (response.data?.oauthProviderEnabled === true) {
        success('OAuth Provider mode is enabled');
      } else {
        error('OAuth Provider mode is NOT enabled!');
        return false;
      }

      if (response.data?.mcpRunning === true) {
        success('MCP process is running');
      } else {
        info('MCP process not running yet (will start on first request)');
      }

      return true;
    } else {
      error(`Health endpoint returned status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Health check failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 2: Token Endpoint - Valid Credentials
 */
async function testTokenValid() {
  section('Test 2: Token Endpoint - Valid Credentials');

  try {
    const response = await request('POST', '/auth/token', {
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    });

    if (response.status === 200) {
      success('Token endpoint responded with 200');
      log(`  Response: ${JSON.stringify(response.data, null, 2).substring(0, 200)}...`, 'gray');

      if (response.data?.access_token) {
        success('Received access_token');
      } else {
        error('No access_token in response!');
        return null;
      }

      if (response.data?.token_type === 'Bearer') {
        success('Token type is Bearer');
      }

      if (response.data?.expires_in) {
        success(`Token expires in ${response.data.expires_in} seconds`);
      }

      if (response.data?.scope === 'mcp:all') {
        success('Token scope is mcp:all');
      }

      return response.data.access_token;
    } else {
      error(`Token endpoint returned status ${response.status}`);
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');
      return null;
    }
  } catch (err) {
    error(`Token request failed: ${err.message}`);
    return null;
  }
}

/**
 * Test 3: Token Endpoint - Invalid Credentials
 */
async function testTokenInvalid() {
  section('Test 3: Token Endpoint - Invalid Credentials');

  try {
    const response = await request('POST', '/auth/token', {
      grant_type: 'client_credentials',
      client_id: 'invalid-client',
      client_secret: 'wrong-secret'
    });

    if (response.status === 401) {
      success('Invalid credentials correctly rejected with 401');
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');

      if (response.data?.error === 'invalid_client') {
        success('Error code is "invalid_client"');
      }

      return true;
    } else {
      error(`Expected 401 but got status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Invalid credentials test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 4: Token Endpoint - Missing Parameters
 */
async function testTokenMissingParams() {
  section('Test 4: Token Endpoint - Missing Parameters');

  const tests = [
    { name: 'Missing client_id', body: { grant_type: 'client_credentials', client_secret: 'secret' } },
    { name: 'Missing client_secret', body: { grant_type: 'client_credentials', client_id: 'test' } },
    { name: 'Missing grant_type', body: { client_id: 'test', client_secret: 'secret' } }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const response = await request('POST', '/auth/token', test.body);

      if (response.status === 400) {
        success(`${test.name}: Correctly rejected with 400`);
      } else {
        error(`${test.name}: Expected 400 but got ${response.status}`);
        allPassed = false;
      }
    } catch (err) {
      error(`${test.name}: Request failed - ${err.message}`);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Test 5: Token Introspection
 */
async function testTokenIntrospect(token) {
  section('Test 5: Token Introspection');

  if (!token) {
    error('No token available for introspection test');
    return false;
  }

  try {
    const response = await request('POST', '/auth/introspect', {
      token: token
    });

    if (response.status === 200) {
      success('Introspection endpoint responded with 200');
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');

      if (response.data?.active === true) {
        success('Token is active');
      } else {
        error('Token is not active!');
        return false;
      }

      if (response.data?.client_id) {
        success(`Client ID: ${response.data.client_id}`);
      }

      if (response.data?.scope) {
        success(`Scope: ${response.data.scope}`);
      }

      return true;
    } else {
      error(`Introspection returned status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Introspection failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 6: Protected Endpoint - Without Token
 */
async function testProtectedWithoutToken() {
  section('Test 6: Protected Endpoint - Without Token');

  try {
    const response = await request('POST', '/message', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    });

    if (response.status === 401) {
      success('Protected endpoint correctly rejected request without token');
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');
      return true;
    } else {
      error(`Expected 401 but got status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Protected endpoint test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 7: Protected Endpoint - With Valid Token
 */
async function testProtectedWithToken(token) {
  section('Test 7: Protected Endpoint - With Valid Token');

  if (!token) {
    error('No token available for protected endpoint test');
    return false;
  }

  try {
    const response = await request('POST', '/message', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'oauth-provider-test',
          version: '1.0.0'
        }
      }
    }, {
      Authorization: `Bearer ${token}`
    });

    if (response.status === 200) {
      success('Protected endpoint accepted request with valid token');
      log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}...`, 'gray');

      if (response.data?.result) {
        success('MCP initialize call successful');
      }

      return true;
    } else {
      error(`Expected 200 but got status ${response.status}`);
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');
      return false;
    }
  } catch (err) {
    error(`Protected endpoint test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 8: Protected Endpoint - With Invalid Token
 */
async function testProtectedWithInvalidToken() {
  section('Test 8: Protected Endpoint - With Invalid Token');

  try {
    const response = await request('POST', '/message', {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {}
    }, {
      Authorization: 'Bearer invalid-token-here'
    });

    if (response.status === 401) {
      success('Protected endpoint correctly rejected request with invalid token');
      return true;
    } else {
      error(`Expected 401 but got status ${response.status}`);
      return false;
    }
  } catch (err) {
    error(`Invalid token test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 9: Tools List Endpoint (requires auth)
 */
async function testToolsList(token) {
  section('Test 9: Tools List Endpoint');

  if (!token) {
    error('No token available for tools list test');
    return false;
  }

  try {
    const response = await request('GET', '/tools', null, {
      Authorization: `Bearer ${token}`
    });

    if (response.status === 200) {
      success('Tools endpoint responded with 200');
      log(`  Response: ${JSON.stringify(response.data).substring(0, 300)}...`, 'gray');
      return true;
    } else {
      error(`Tools endpoint returned status ${response.status}`);
      log(`  Response: ${JSON.stringify(response.data, null, 2)}`, 'gray');
      return false;
    }
  } catch (err) {
    error(`Tools list test failed: ${err.message}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function main() {
  log('\n╔═══════════════════════════════════════════════════════════════╗', 'blue');
  log('║   OAuth Provider Mode - Manual Testing Suite                  ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════════╝\n', 'blue');

  info(`Proxy URL: ${PROXY_URL}`);
  info(`Client ID: ${CLIENT_ID}`);
  info(`Client Secret: ${CLIENT_SECRET}`);

  const results = {
    healthCheck: false,
    tokenValid: false,
    tokenInvalid: false,
    tokenMissingParams: false,
    tokenIntrospect: false,
    protectedWithoutToken: false,
    protectedWithToken: false,
    protectedWithInvalidToken: false,
    toolsList: false
  };

  // Run tests
  results.healthCheck = await testHealthCheck();
  const token = await testTokenValid();
  results.tokenValid = !!token;
  results.tokenInvalid = await testTokenInvalid();
  results.tokenMissingParams = await testTokenMissingParams();
  results.tokenIntrospect = await testTokenIntrospect(token);
  results.protectedWithoutToken = await testProtectedWithoutToken();
  results.protectedWithToken = await testProtectedWithToken(token);
  results.protectedWithInvalidToken = await testProtectedWithInvalidToken();
  results.toolsList = await testToolsList(token);

  // Summary
  section('Test Summary');

  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;

  for (const [test, result] of Object.entries(results)) {
    const status = result ? 'PASS' : 'FAIL';
    const color = result ? 'green' : 'red';
    log(`  ${test.padEnd(30)} ${status}`, color);
  }

  console.log('');
  if (failed === 0) {
    success(`All tests passed! (${passed}/${total})`);
    log('\n✓ OAuth Provider mode is working correctly!', 'green');
    log('✓ The proxy is ready for use with Claude Connectors', 'green');
  } else {
    error(`${failed} test(s) failed (${passed}/${total} passed)`);
    log('\n✗ Some tests failed. Check the output above for details.', 'red');
  }

  console.log('');
}

main().catch(err => {
  error(`Test suite failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});
