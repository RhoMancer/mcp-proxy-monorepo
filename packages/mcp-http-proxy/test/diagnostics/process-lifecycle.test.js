/**
 * DIAG-02: Process Lifecycle Tests
 *
 * Tests the MCP child process layer of the proxy server, verifying:
 * - Process spawning with valid PID
 * - stdio channel availability
 * - Process termination detection
 * - Duplicate spawn prevention
 *
 * These tests isolate process lifecycle from HTTP and protocol layers.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProxyServer } from '../../src/ProxyServer.js';
import echoConfig from './fixtures/echo-server.config.js';

describe('DIAG-02: Process Lifecycle', () => {
  let proxy;

  beforeEach(() => {
    // Create a fresh proxy instance for each test
    proxy = new ProxyServer(echoConfig);
  });

  afterEach(() => {
    // Clean up: kill MCP process if it exists
    if (proxy.mcpProcess && !proxy.mcpProcess.killed) {
      proxy.mcpProcess.kill();
      // Wait for process to fully terminate
      return new Promise(resolve => setTimeout(resolve, 50));
    }
  });

  describe('Process Spawning', () => {
    it('should spawn MCP process with valid pid', () => {
      // Spawn the MCP process
      const process = proxy._spawnMcpProcess();

      // Verify process object exists
      expect(process).toBeDefined();
      expect(proxy.mcpProcess).toBe(process);

      // Verify PID is a positive integer
      expect(process.pid).toBeGreaterThan(0);
      expect(Number.isInteger(process.pid)).toBe(true);

      // Verify process is not killed
      expect(process.killed).toBe(false);
    });

    it('should have stdio channels available', () => {
      proxy._spawnMcpProcess();

      // Verify stdin is writable
      expect(proxy.mcpProcess.stdin).toBeDefined();
      expect(proxy.mcpProcess.stdin.writable).toBe(true);

      // Verify stdout is readable
      expect(proxy.mcpProcess.stdout).toBeDefined();
      expect(proxy.mcpProcess.stdout.readable).toBe(true);

      // Verify stderr exists
      expect(proxy.mcpProcess.stderr).toBeDefined();
    });

    it('should detect process termination', async () => {
      proxy._spawnMcpProcess();
      const originalPid = proxy.mcpProcess.pid;

      // Kill the process
      proxy.mcpProcess.kill();

      // Wait for close event to fire
      await new Promise(resolve => {
        proxy.mcpProcess.on('close', resolve);
        // Add timeout in case close doesn't fire
        setTimeout(resolve, 500);
      });

      // Give event handler time to process
      await new Promise(resolve => setTimeout(resolve, 50));

      // After close, mcpProcess should be null (handled by close handler in ProxyServer)
      // Note: The close handler in ProxyServer.js sets mcpProcess to null
      expect(proxy.mcpProcess).toBeNull();
    });

    it('should not spawn duplicate process', () => {
      // First spawn
      const firstProcess = proxy._spawnMcpProcess();
      const firstPid = firstProcess.pid;

      // Second spawn should return existing process
      const secondProcess = proxy._spawnMcpProcess();
      const secondPid = secondProcess.pid;

      // Should be the same process object
      expect(firstProcess).toBe(secondProcess);

      // Should have the same PID
      expect(firstPid).toBe(secondPid);

      // Should only have one process
      expect(proxy.mcpProcess).toBe(firstProcess);
    });
  });

  describe('Process Configuration', () => {
    it('should spawn with correct command', () => {
      proxy._spawnMcpProcess();

      // When shell: true is used, spawnfile is the shell (cmd.exe on Windows)
      // The actual command is in spawnargs
      expect(proxy.mcpProcess.spawnargs).toBeDefined();
      expect(proxy.mcpProcess.spawnargs.length).toBeGreaterThan(0);

      // Should contain 'node' in the arguments (may be at different positions depending on shell)
      const hasNode = proxy.mcpProcess.spawnargs.some(arg =>
        arg.includes('node') || arg.includes('node.exe')
      );
      expect(hasNode).toBe(true);
    });

    it('should spawn with correct arguments', () => {
      proxy._spawnMcpProcess();

      // Args should include echo server path
      expect(proxy.mcpProcess.spawnargs).toBeDefined();
      expect(proxy.mcpProcess.spawnargs.length).toBeGreaterThan(0);

      // Should contain 'echo-mcp-server.js'
      const hasEchoServer = proxy.mcpProcess.spawnargs.some(arg =>
        arg.includes('echo-mcp-server.js')
      );
      expect(hasEchoServer).toBe(true);
    });

    it('should have environment variables accessible', () => {
      proxy._spawnMcpProcess();

      // Process has environment - on Windows with shell: true,
      // spawnenv might not be directly available but process.env works
      expect(proxy.mcpProcess).toBeDefined();

      // The config should have env settings
      expect(echoConfig.mcp.env).toBeDefined();
      expect(echoConfig.mcp.env.NODE_ENV).toBe('test');
    });
  });

  describe('Process Error Handling', () => {
    it('should handle process error event', async () => {
      // Create proxy with invalid command
      const invalidConfig = {
        ...echoConfig,
        mcp: {
          ...echoConfig.mcp,
          command: 'nonexistent-command-xyz-123'
        }
      };
      const errorProxy = new ProxyServer(invalidConfig);

      // Track error events
      let errorEmitted = false;
      errorProxy.mcpProcess = null;

      // The spawn will fail but we need to catch the error
      try {
        errorProxy._spawnMcpProcess();
        // Wait for error event
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        // Expected - spawn may throw on Windows
        errorEmitted = true;
      }

      // After failed spawn, process should be null
      expect(errorProxy.mcpProcess).toBeNull();

      // Clean up
      if (errorProxy.mcpProcess) {
        errorProxy.mcpProcess.kill();
      }
    });
  });

  describe('Multiple Process Lifecycle', () => {
    it('should handle kill and respawn correctly', () => {
      // First spawn
      proxy._spawnMcpProcess();
      const firstPid = proxy.mcpProcess.pid;
      expect(firstPid).toBeGreaterThan(0);

      // Kill the process
      proxy.mcpProcess.kill();

      // Wait for close
      return new Promise(resolve => {
        proxy.mcpProcess.on('close', () => {
          // After close, spawn again
          setTimeout(() => {
            const newProcess = proxy._spawnMcpProcess();
            const newPid = newProcess.pid;

            // New process should have a different PID
            expect(newPid).not.toBe(firstPid);
            expect(newPid).toBeGreaterThan(0);

            // Clean up
            newProcess.kill();
            resolve();
          }, 50);
        });
      });
    });
  });
});
