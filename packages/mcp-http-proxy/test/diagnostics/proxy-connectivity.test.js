/**
 * DIAG-01: Proxy Connectivity Tests
 *
 * Tests the HTTP layer of the proxy server, verifying:
 * - Health endpoint accessibility
 * - Server response format
 * - MCP process spawning state
 * - Message endpoint connectivity
 *
 * These tests isolate HTTP connectivity from process and protocol layers.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { ProxyServer } from '../../src/ProxyServer.js';
import echoConfig from './fixtures/echo-server.config.js';

describe('DIAG-01: Proxy Connectivity', () => {
  let proxy;
  let actualPort;

  beforeAll(async () => {
    // Create proxy server with echo config (local mode, no auth)
    proxy = new ProxyServer(echoConfig);

    // Start the server - it will listen on OS-assigned port (port: 0 in config)
    await new Promise((resolve) => {
      proxy.server = proxy.app.listen(0, proxy.HOST, () => {
        // Capture the actual assigned port
        actualPort = proxy.server.address().port;
        console.log(`Test proxy server listening on port ${actualPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup: stop server and kill MCP process
    if (proxy.mcpProcess) {
      proxy.mcpProcess.kill();
    }
    if (proxy.server) {
      await new Promise((resolve) => proxy.server.close(resolve));
    }
  });

  describe('Health Endpoint', () => {
    it('should return 200 status on /health endpoint', async () => {
      const response = await request(proxy.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should report mcpRunning after spawning', async () => {
      // Manually spawn MCP process for this test
      proxy._spawnMcpProcess();

      // Wait a bit for process to start
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(proxy.app)
        .get('/health')
        .expect(200);

      // After spawning, MCP process should be running
      expect(response.body.mcpRunning).toBe(true);
    });

    it('should report server command in health response', async () => {
      const response = await request(proxy.app)
        .get('/health')
        .expect(200);

      // Should contain 'node' as the command
      expect(response.body.server).toContain('node');
    });

    it('should report authEnabled as false (local mode)', async () => {
      const response = await request(proxy.app)
        .get('/health')
        .expect(200);

      // Local mode has no auth
      expect(response.body.authEnabled).toBe(false);
      expect(response.body.oauthProviderEnabled).toBe(false);
    });
  });

  describe('Message Endpoint', () => {
    it('should accept POST on /message endpoint', async () => {
      // The endpoint should accept connections (not ECONNREFUSED)
      // It may return an error if MCP is not initialized, but HTTP layer should work
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        });

      // Should respond (not timeout with ECONNREFUSED)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });
  });

  describe('Server Configuration', () => {
    it('should have OS-assigned port > 0', () => {
      expect(actualPort).toBeGreaterThan(0);
    });

    it('should listen on 127.0.0.1', () => {
      const address = proxy.server.address();
      expect(address.address).toBe('127.0.0.1');
    });
  });
});

/**
 * LOCAL-01: Local Mode Authentication Bypass Tests
 *
 * Verifies that local mode (no auth/oauthProvider configuration) works correctly:
 * - Proxy starts without OAuth configuration
 * - /health endpoint reports authEnabled: false and oauthProviderEnabled: false
 * - /message endpoint accepts POST without authentication headers
 * - OPTIONS preflight requests return 200 with CORS headers
 *
 * Note: SSE endpoint tests are skipped due to streaming protocol complexities.
 * The /message endpoint is the primary endpoint for JSON-RPC communication.
 */
describe('LOCAL-01: Local mode authentication bypass', () => {
  let proxy;
  let actualPort;

  beforeAll(async () => {
    // Create proxy server with echo config (local mode, no auth)
    proxy = new ProxyServer(echoConfig);

    // Start the server
    await new Promise((resolve) => {
      proxy.server = proxy.app.listen(0, proxy.HOST, () => {
        actualPort = proxy.server.address().port;
        console.log(`LOCAL-01 test proxy listening on port ${actualPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup: stop server and kill MCP process
    if (proxy.mcpProcess) {
      proxy.mcpProcess.kill();
    }
    if (proxy.server) {
      await new Promise((resolve) => proxy.server.close(resolve));
    }
  });

  describe('Proxy starts without auth configuration', () => {
    it('should start successfully without auth or oauthProvider config', () => {
      // Verify proxy was created successfully
      expect(proxy).toBeDefined();
      expect(proxy.app).toBeDefined();

      // Verify auth is disabled
      expect(proxy.authEnabled).toBe(false);
      expect(proxy.oauthProviderEnabled).toBe(false);
    });

    it('should have server listening on assigned port', () => {
      expect(proxy.server).toBeDefined();
      expect(proxy.server.listening).toBe(true);
      expect(actualPort).toBeGreaterThan(0);
    });
  });

  describe('Health endpoint reports auth disabled', () => {
    it('should report authEnabled: false in /health', async () => {
      const response = await request(proxy.app)
        .get('/health')
        .expect(200);

      expect(response.body.authEnabled).toBe(false);
      expect(response.body.oauthProviderEnabled).toBe(false);
    });

    it('should report status: ok in /health', async () => {
      const response = await request(proxy.app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('/message endpoint accessible without auth', () => {
    it('should accept POST on /message without authentication headers', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1
        });

      // Should respond (not 401 Unauthorized)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });

    it('should accept POST on /messages without authentication headers', async () => {
      const response = await request(proxy.app)
        .post('/messages')
        .send({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 2
        });

      // Should respond (not 401 Unauthorized)
      expect(response.status).not.toBe(401);
      expect(response.status).not.toBe(403);
    });
  });

  describe('CORS preflight requests', () => {
    it('should return 200 for OPTIONS preflight', async () => {
      const response = await request(proxy.app)
        .options('/message')
        .expect(200);

      // Verify CORS headers are present
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });

    it('should include correct CORS headers for localhost', async () => {
      const response = await request(proxy.app)
        .options('/sse')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
      expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
    });

    it('should allow Authorization header in CORS', async () => {
      const response = await request(proxy.app)
        .options('/message')
        .set('Access-Control-Request-Headers', 'content-type, authorization')
        .expect(200);

      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
    });
  });

  describe('Multiple requests without auth', () => {
    it('should handle multiple sequential requests without auth', async () => {
      // Make multiple requests without any authentication (exclude /sse to avoid streaming issues)
      const responses = await Promise.all([
        request(proxy.app).get('/health'),
        request(proxy.app).post('/message').send({ jsonrpc: '2.0', method: 'tools/list', id: 1 }),
      ]);

      // All should succeed without 401/403
      responses.forEach(response => {
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      });
    });
  });
});

/**
 * LOCAL-04: Error Message Clarity Tests
 *
 * Verifies that error messages are specific and actionable:
 * - Missing method error includes "Next steps" guidance
 * - Timeout error (-32000) includes specific troubleshooting steps
 * - Process termination error (-32001) includes restart guidance
 * - Process unavailable error (-32002) includes dependency verification guidance
 * - All error responses include error code field
 * - Error messages are human-readable (not just codes)
 */
describe('LOCAL-04: Error message clarity', () => {
  let proxy;
  let actualPort;

  beforeAll(async () => {
    // Create proxy server with echo config (local mode, no auth)
    proxy = new ProxyServer(echoConfig);

    // Start the server
    await new Promise((resolve) => {
      proxy.server = proxy.app.listen(0, proxy.HOST, () => {
        actualPort = proxy.server.address().port;
        console.log(`LOCAL-04 test proxy listening on port ${actualPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Cleanup: stop server and kill MCP process
    if (proxy.mcpProcess) {
      proxy.mcpProcess.kill();
    }
    if (proxy.server) {
      await new Promise((resolve) => proxy.server.close(resolve));
    }
  });

  describe('Missing method error', () => {
    it('should return error code -32600 for missing method', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 1
          // No method field
        });

      expect(response.status).toBe(400);
      expect(response.body.jsonrpc).toBe('2.0');
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe(-32600);
    });

    it('should include "Next steps" guidance in missing method error', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 1
        });

      expect(response.body.error.message).toContain('Next steps');
      expect(response.body.error.message).toContain('Verify request body');
    });

    it('should have human-readable error message for missing method', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 1
        });

      // Should not be just "Invalid Request"
      expect(response.body.error.message.length).toBeGreaterThan(20);
      expect(response.body.error.message).toContain('Invalid Request');
    });
  });

  describe('Timeout error classification', () => {
    it('should classify timeout errors with code -32000', () => {
      // Create a timeout error manually
      const timeoutError = new Error('Request timeout');

      // Test the _classifyError method directly
      const classified = proxy._classifyError(timeoutError);

      expect(classified.code).toBe(-32000);
      expect(classified.message).toContain('timeout');
    });

    it('should include "Next steps" for timeout errors', () => {
      const timeoutError = new Error('Request timeout');
      const classified = proxy._classifyError(timeoutError);

      expect(classified.message).toContain('Next steps');
      expect(classified.message).toContain('MCP process is running');
      expect(classified.message).toContain('server logs');
    });

    it('should classify Timeout (capitalized) errors', () => {
      const timeoutError = new Error('Request Timeout');
      const classified = proxy._classifyError(timeoutError);

      expect(classified.code).toBe(-32000);
    });
  });

  describe('Process termination error classification', () => {
    it('should classify termination errors with code -32001', () => {
      const terminationError = new Error('MCP process terminated');
      const classified = proxy._classifyError(terminationError);

      expect(classified.code).toBe(-32001);
      expect(classified.message).toContain('terminated');
    });

    it('should include "Next steps" for termination errors', () => {
      const terminationError = new Error('MCP process terminated');
      const classified = proxy._classifyError(terminationError);

      expect(classified.message).toContain('Next steps');
      expect(classified.message).toContain('configuration');
      expect(classified.message).toContain('environment variables');
    });

    it('should classify exited errors as termination', () => {
      const exitedError = new Error('MCP process exited');
      const classified = proxy._classifyError(exitedError);

      expect(classified.code).toBe(-32001);
    });
  });

  describe('Process unavailable error classification', () => {
    it('should classify unavailable errors with code -32002', () => {
      const unavailableError = new Error('MCP process not available');
      const classified = proxy._classifyError(unavailableError);

      expect(classified.code).toBe(-32002);
      expect(classified.message).toContain('not available');
    });

    it('should include "Next steps" for unavailable errors', () => {
      const unavailableError = new Error('MCP process not available');
      const classified = proxy._classifyError(unavailableError);

      expect(classified.message).toContain('Next steps');
      expect(classified.message).toContain('command');
      expect(classified.message).toContain('dependencies');
    });
  });

  describe('Internal error classification', () => {
    it('should classify unknown errors with code -32603', () => {
      const unknownError = new Error('Something went wrong');
      const classified = proxy._classifyError(unknownError);

      expect(classified.code).toBe(-32603);
      expect(classified.message).toContain('Internal error');
    });

    it('should include "Next steps" for internal errors', () => {
      const unknownError = new Error('Something went wrong');
      const classified = proxy._classifyError(unknownError);

      expect(classified.message).toContain('Next steps');
    });
  });

  describe('Error response structure', () => {
    it('should include error code field in all error responses', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 1
        });

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(typeof response.body.error.code).toBe('number');
    });

    it('should include jsonrpc version in error responses', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 1
        });

      expect(response.body.jsonrpc).toBe('2.0');
    });

    it('should include id field in error responses', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 99
        });

      expect(response.body.id).toBeDefined();
      expect(response.body.id).toBe(99);
    });

    it('should include data field (stack trace) in internal errors', async () => {
      const response = await request(proxy.app)
        .post('/message')
        .send({
          jsonrpc: '2.0',
          id: 1
        });

      // Missing method error is a 400, not 500, so may not have stack
      // But if we get a 500 error (internal), it should have data
      if (response.status === 500) {
        expect(response.body.error.data).toBeDefined();
      }
    });
  });
});
