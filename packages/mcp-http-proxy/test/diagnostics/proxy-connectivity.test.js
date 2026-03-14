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
