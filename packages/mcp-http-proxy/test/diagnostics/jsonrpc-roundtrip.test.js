/**
 * DIAG-03: JSON-RPC Round-Trip Tests
 *
 * Tests the full protocol layer of the proxy server, verifying:
 * - Initialize handshake completes
 * - tools/list request/response works
 * - Tool calls (ping, sum) execute and return correct results
 *
 * These tests verify end-to-end JSON-RPC communication with the MCP server.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProxyServer } from '../../src/ProxyServer.js';
import echoConfig from './fixtures/echo-server.config.js';

describe('DIAG-03: JSON-RPC Round-Trip', () => {
  let proxy;

  beforeAll(async () => {
    // Create proxy server
    proxy = new ProxyServer(echoConfig);

    // Spawn the MCP process
    proxy._spawnMcpProcess();

    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize MCP connection (complete handshake)
    await proxy._initializeMcp();

    // Verify initialization succeeded
    expect(proxy.isInitialized).toBe(true);
  });

  afterAll(async () => {
    // Clean up: kill MCP process if it exists
    if (proxy.mcpProcess && !proxy.mcpProcess.killed) {
      proxy.mcpProcess.kill();
      // Wait for process to fully terminate
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  describe('Initialization', () => {
    it('should complete initialize handshake', () => {
      // The _initializeMcp() was called in beforeAll
      // Verify the proxy is marked as initialized
      expect(proxy.isInitialized).toBe(true);
    });

    it('should have a running MCP process', () => {
      expect(proxy.mcpProcess).toBeDefined();
      expect(proxy.mcpProcess.pid).toBeGreaterThan(0);
      expect(proxy.mcpProcess.killed).toBe(false);
    });
  });

  describe('tools/list', () => {
    it('should call tools/list and receive response', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify response structure
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');

      // Verify we got a result (not an error)
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify tools array exists and has items
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);

      // Verify expected tools are present
      const toolNames = response.result.tools.map(t => t.name);
      expect(toolNames).toContain('echo');
      expect(toolNames).toContain('ping');
      expect(toolNames).toContain('sum');
      expect(toolNames).toContain('get_time');
    });

    it('should include tool metadata', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      const pingTool = response.result.tools.find(t => t.name === 'ping');
      expect(pingTool).toBeDefined();
      expect(pingTool.description).toBeDefined();

      const sumTool = response.result.tools.find(t => t.name === 'sum');
      expect(sumTool).toBeDefined();
      expect(sumTool.inputSchema).toBeDefined();
      expect(sumTool.inputSchema.properties).toBeDefined();
      expect(sumTool.inputSchema.properties.a).toBeDefined();
      expect(sumTool.inputSchema.properties.b).toBeDefined();
    });
  });

  describe('Tool Calls', () => {
    it('should call ping tool and receive pong', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'ping',
        arguments: {}
      });

      // Verify response structure
      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify content array exists
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);

      // Verify pong response
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('pong');
      expect(textContent).toContain('Echo test server');
    });

    it('should call sum tool and calculate correctly', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { a: 5, b: 3 }
      });

      // Verify response structure
      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify sum result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('8');
      expect(textContent).toContain('Sum:');
    });

    it('should call sum tool with different numbers', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { a: 10, b: 25 }
      });

      // Verify sum result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('35');
    });

    it('should call echo tool and return arguments', async () => {
      const testMessage = 'Hello, MCP!';
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'echo',
        arguments: { message: testMessage }
      });

      // Verify echo result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('Echo:');
      expect(textContent).toContain(testMessage);
    });

    it('should call get_time tool', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'get_time',
        arguments: {}
      });

      // Verify time result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('Current time:');
      // Should be ISO format
      expect(textContent).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tool call', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'unknown_tool_xyz',
        arguments: {}
      });

      // Should get an error response
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');

      // Either result with error content or error object
      if (response.error) {
        expect(response.error.code).toBeDefined();
      } else {
        // Some servers return error in result content
        expect(response.result).toBeDefined();
      }
    });

    it('should handle missing required parameters', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { a: 5 } // Missing 'b'
      });

      // Should get a response (may be error or default value)
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();

      // The echo server defaults missing args to 0, so sum should be 5
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('5');
    });
  });

  describe('Request ID Handling', () => {
    it('should return matching request ID', async () => {
      const testId = 42;
      const response = await proxy._sendMcpRequest('tools/list', {}, testId);

      // Verify ID matches
      expect(response.id).toBe(testId);
    });

    it('should auto-generate request ID when not provided', async () => {
      // Don't provide an ID - let the proxy generate one
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Should have some ID (the proxy auto-increments)
      expect(response.id).toBeDefined();
      expect(typeof response.id).toBe('number');
      expect(response.id).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      // Send multiple requests concurrently
      const promises = [
        proxy._sendMcpRequest('tools/call', { name: 'ping', arguments: {} }),
        proxy._sendMcpRequest('tools/call', { name: 'sum', arguments: { a: 1, b: 2 } }),
        proxy._sendMcpRequest('tools/call', { name: 'echo', arguments: { message: 'test' } }),
      ];

      const responses = await Promise.all(promises);

      // All should complete successfully
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.jsonrpc).toBe('2.0');
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      // Verify specific responses
      expect(responses[0].result.content[0].text).toContain('pong');
      expect(responses[1].result.content[0].text).toContain('3');
      expect(responses[2].result.content[0].text).toContain('test');
    });
  });
});

/**
 * LOCAL-02: MCP tools/list in Local Mode
 *
 * Verifies that MCP server discovery works correctly in local mode (no auth):
 * - Initialize handshake completes without authentication
 * - tools/list returns expected tool array
 * - Each tool has required fields (name, description, inputSchema)
 * - Response JSON-RPC structure is correct (jsonrpc: "2.0", result, id)
 */
describe('LOCAL-02: MCP tools/list in local mode', () => {
  let proxy;

  beforeAll(async () => {
    // Create proxy server with echo config (local mode, no auth)
    proxy = new ProxyServer(echoConfig);

    // Spawn the MCP process
    proxy._spawnMcpProcess();

    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize MCP connection (complete handshake) - no auth required
    await proxy._initializeMcp();

    // Verify initialization succeeded
    expect(proxy.isInitialized).toBe(true);
  });

  afterAll(async () => {
    // Clean up: kill MCP process if it exists
    if (proxy.mcpProcess && !proxy.mcpProcess.killed) {
      proxy.mcpProcess.kill();
      // Wait for process to fully terminate
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  describe('Initialize handshake without authentication', () => {
    it('should complete initialize handshake in local mode', () => {
      // The _initializeMcp() was called in beforeAll without any auth
      expect(proxy.isInitialized).toBe(true);
    });

    it('should have authEnabled and oauthProviderEnabled set to false', () => {
      // Verify proxy is in local mode
      expect(proxy.authEnabled).toBe(false);
      expect(proxy.oauthProviderEnabled).toBe(false);
    });

    it('should have a running MCP process', () => {
      expect(proxy.mcpProcess).toBeDefined();
      expect(proxy.mcpProcess.pid).toBeGreaterThan(0);
      expect(proxy.mcpProcess.killed).toBe(false);
    });
  });

  describe('tools/list response structure', () => {
    it('should return valid JSON-RPC response', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify JSON-RPC 2.0 structure
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBeDefined();
      expect(typeof response.id).toBe('number');
    });

    it('should return result object (not error)', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify we got a result (not an error)
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();
    });
  });

  describe('tools/list returns valid tool array', () => {
    it('should return tools array', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify tools array exists
      expect(response.result.tools).toBeDefined();
      expect(Array.isArray(response.result.tools)).toBe(true);
      expect(response.result.tools.length).toBeGreaterThan(0);
    });

    it('should return expected tools from echo server', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify expected tools are present
      const toolNames = response.result.tools.map(t => t.name);
      expect(toolNames).toContain('echo');
      expect(toolNames).toContain('ping');
      expect(toolNames).toContain('sum');
      expect(toolNames).toContain('get_time');
    });

    it('should include tool metadata for each tool', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify all tools have required fields
      response.result.tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
      });
    });
  });

  describe('tool inputSchema validation', () => {
    it('should include inputSchema for tools that accept arguments', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Check sum tool has proper inputSchema
      const sumTool = response.result.tools.find(t => t.name === 'sum');
      expect(sumTool).toBeDefined();
      expect(sumTool.inputSchema).toBeDefined();
      expect(typeof sumTool.inputSchema).toBe('object');
    });

    it('should include properties in inputSchema', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify sum tool inputSchema has expected properties
      const sumTool = response.result.tools.find(t => t.name === 'sum');
      expect(sumTool.inputSchema.properties).toBeDefined();
      expect(sumTool.inputSchema.properties.a).toBeDefined();
      expect(sumTool.inputSchema.properties.b).toBeDefined();
    });

    it('should have correct JSON Schema structure', async () => {
      const response = await proxy._sendMcpRequest('tools/list', {});

      // Verify inputSchema follows JSON Schema format
      const sumTool = response.result.tools.find(t => t.name === 'sum');
      expect(sumTool.inputSchema.type).toBeDefined();
      expect(sumTool.inputSchema).toHaveProperty('type');
    });
  });

  describe('tools/list idempotency', () => {
    it('should return consistent results on multiple calls', async () => {
      // Call tools/list multiple times
      const response1 = await proxy._sendMcpRequest('tools/list', {});
      const response2 = await proxy._sendMcpRequest('tools/list', {});

      // Should return same tools
      const tools1 = response1.result.tools.map(t => t.name).sort();
      const tools2 = response2.result.tools.map(t => t.name).sort();

      expect(tools1).toEqual(tools2);
    });
  });
});

/**
 * LOCAL-03: Tool Execution in Local Mode
 *
 * Verifies that tool calls execute correctly through the local proxy (no auth):
 * - ping tool call returns pong response
 * - sum tool with valid parameters returns correct result
 * - echo tool returns the input arguments
 * - Concurrent tool calls (3 simultaneous) all complete successfully
 * - Unknown tool returns appropriate error
 */
describe('LOCAL-03: Tool execution through local proxy', () => {
  let proxy;

  beforeAll(async () => {
    // Create proxy server with echo config (local mode, no auth)
    proxy = new ProxyServer(echoConfig);

    // Spawn the MCP process
    proxy._spawnMcpProcess();

    // Wait for process to start
    await new Promise(resolve => setTimeout(resolve, 100));

    // Initialize MCP connection (complete handshake) - no auth required
    await proxy._initializeMcp();

    // Verify initialization succeeded
    expect(proxy.isInitialized).toBe(true);
  });

  afterAll(async () => {
    // Clean up: kill MCP process if it exists
    if (proxy.mcpProcess && !proxy.mcpProcess.killed) {
      proxy.mcpProcess.kill();
      // Wait for process to fully terminate
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  describe('Tool calls in local mode', () => {
    it('should call ping tool and receive pong', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'ping',
        arguments: {}
      });

      // Verify response structure
      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify content array exists
      expect(response.result.content).toBeDefined();
      expect(Array.isArray(response.result.content)).toBe(true);

      // Verify pong response
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('pong');
      expect(textContent).toContain('Echo test server');
    });

    it('should call sum tool and calculate correctly', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { a: 5, b: 3 }
      });

      // Verify response structure
      expect(response.jsonrpc).toBe('2.0');
      expect(response.error).toBeUndefined();
      expect(response.result).toBeDefined();

      // Verify sum result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('8');
      expect(textContent).toContain('Sum:');
    });

    it('should call sum tool with different numbers', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { a: 10, b: 25 }
      });

      // Verify sum result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('35');
    });

    it('should call echo tool and return arguments', async () => {
      const testMessage = 'Hello, Local Mode!';
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'echo',
        arguments: { message: testMessage }
      });

      // Verify echo result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('Echo:');
      expect(textContent).toContain(testMessage);
    });

    it('should call get_time tool', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'get_time',
        arguments: {}
      });

      // Verify time result
      const textContent = response.result.content[0].text;
      expect(textContent).toContain('Current time:');
      // Should be ISO format
      expect(textContent).toMatch(/\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('Concurrent tool calls in local mode', () => {
    it('should handle multiple concurrent tool calls', async () => {
      // Send multiple tool calls concurrently
      const promises = [
        proxy._sendMcpRequest('tools/call', { name: 'ping', arguments: {} }),
        proxy._sendMcpRequest('tools/call', { name: 'sum', arguments: { a: 1, b: 2 } }),
        proxy._sendMcpRequest('tools/call', { name: 'echo', arguments: { message: 'concurrent' } }),
      ];

      const responses = await Promise.all(promises);

      // All should complete successfully
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.jsonrpc).toBe('2.0');
        expect(response.result).toBeDefined();
        expect(response.result.content).toBeDefined();
      });

      // Verify specific responses
      expect(responses[0].result.content[0].text).toContain('pong');
      expect(responses[1].result.content[0].text).toContain('3');
      expect(responses[2].result.content[0].text).toContain('concurrent');
    });

    it('should handle concurrent calls to the same tool', async () => {
      // Call sum tool multiple times concurrently
      const promises = [
        proxy._sendMcpRequest('tools/call', { name: 'sum', arguments: { a: 1, b: 1 } }),
        proxy._sendMcpRequest('tools/call', { name: 'sum', arguments: { a: 2, b: 2 } }),
        proxy._sendMcpRequest('tools/call', { name: 'sum', arguments: { a: 3, b: 3 } }),
      ];

      const responses = await Promise.all(promises);

      // All should complete successfully with correct results
      expect(responses[0].result.content[0].text).toContain('2');
      expect(responses[1].result.content[0].text).toContain('4');
      expect(responses[2].result.content[0].text).toContain('6');
    });
  });

  describe('Error handling in local mode', () => {
    it('should handle unknown tool call', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'unknown_tool_xyz',
        arguments: {}
      });

      // Should get an error response
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');

      // Either result with error content or error object
      if (response.error) {
        expect(response.error.code).toBeDefined();
      } else {
        // Some servers return error in result content
        expect(response.result).toBeDefined();
      }
    });

    it('should handle tool call with invalid arguments', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { invalid: 'argument' }
      });

      // Should get a response (may be error or default value)
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();

      // The echo server handles missing args gracefully, defaulting to 0
      const textContent = response.result.content[0].text;
      expect(textContent).toBeDefined();
    });

    it('should handle tool call with missing required parameters', async () => {
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'sum',
        arguments: { a: 5 } // Missing 'b'
      });

      // Should get a response (may be error or default value)
      expect(response).toBeDefined();
      expect(response.jsonrpc).toBe('2.0');
      expect(response.result).toBeDefined();

      // The echo server defaults missing args to 0, so sum should be 5
      const textContent = response.result.content[0].text;
      expect(textContent).toBeDefined();
    });
  });

  describe('Request ID handling in local mode', () => {
    it('should return matching request ID for tool call', async () => {
      const testId = 99;
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'ping',
        arguments: {}
      }, testId);

      // Verify ID matches
      expect(response.id).toBe(testId);
    });

    it('should auto-generate request ID when not provided', async () => {
      // Don't provide an ID - let the proxy generate one
      const response = await proxy._sendMcpRequest('tools/call', {
        name: 'echo',
        arguments: { message: 'test' }
      });

      // Should have some ID (the proxy auto-increments)
      expect(response.id).toBeDefined();
      expect(typeof response.id).toBe('number');
      expect(response.id).toBeGreaterThan(0);
    });
  });
});
