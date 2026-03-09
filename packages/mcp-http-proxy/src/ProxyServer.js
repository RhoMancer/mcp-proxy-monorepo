#!/usr/bin/env node

/**
 * Generic HTTP-to-stdio proxy for MCP servers
 *
 * This proxy runs any MCP server as a child process and exposes it via HTTP,
 * allowing it to be used with clients that only support HTTP transport.
 */

import { spawn } from 'child_process';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { OAuth2Auth } from './auth/OAuth2Auth.js';

dotenv.config();

/**
 * MCP HTTP Proxy Server
 *
 * Proxies HTTP requests to a stdio-based MCP server process.
 */
export class ProxyServer {
  /**
   * @param {Object} config - Configuration object
   * @param {Object} config.mcp - MCP server configuration
   * @param {string} config.mcp.command - Command to spawn MCP server (e.g., 'npx', 'node')
   * @param {string[]} config.mcp.args - Arguments for the MCP server command
   * @param {Object} config.mcp.env - Environment variables for the MCP server
   * @param {Object} config.server - HTTP server configuration
   * @param {number} config.server.port - HTTP port (default: 8080)
   * @param {string} config.server.host - HTTP host (default: '127.0.0.1')
   * @param {Object} config.tunnel - Cloudflare tunnel configuration (optional)
   * @param {string} config.tunnel.domain - Custom domain for the tunnel
   * @param {string} config.tunnel.tunnelId - Cloudflare tunnel ID
   * @param {Object} config.auth - OAuth 2.0 authentication configuration (optional)
   * @param {Object} config.auth.provider - OAuth provider configuration
   * @param {Object} config.auth.session - Session configuration
   */
  constructor(config) {
    this.config = config;
    this.app = express();
    this.PORT = config.server?.port || process.env.PORT || 8080;
    this.HOST = config.server?.host || '127.0.0.1';

    // MCP child process reference
    this.mcpProcess = null;
    this.messageId = 1;
    this.pendingRequests = new Map();
    this.isInitialized = false;

    // OAuth 2.0 Authentication (optional)
    this.auth = null;
    this.authEnabled = false;

    if (config.auth) {
      try {
        this.auth = new OAuth2Auth(config.auth);
        this.authEnabled = true;
        console.log('✓ OAuth 2.0 authentication enabled');
      } catch (error) {
        console.warn(`⚠ Failed to enable OAuth 2.0: ${error.message}`);
        console.warn('⚠ Running without authentication');
      }
    }

    this._setupMiddleware();
    this._setupRoutes();
  }

  /**
   * Setup Express middleware
   * @private
   */
  _setupMiddleware() {
    // Cookie parser (required for session management)
    this.app.use(cookieParser());

    // OAuth 2.0 session and passport middleware (if enabled)
    if (this.authEnabled) {
      this.app.use(session(this.auth.getSessionConfig()));
      this.app.use(this.auth.getInitializeMiddleware());
      this.app.use(this.auth.getSessionMiddleware());
    }

    // CORS support for browser-based clients
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      // Allow credentials for authenticated requests
      if (this.authEnabled) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    this.app.use(express.json());
  }

  /**
   * Setup HTTP routes
   * @private
   */
  _setupRoutes() {
    // Auth routes (if enabled)
    if (this.authEnabled) {
      this.app.use('/auth', this.auth.getAuthRoutes());
    }

    // Health check endpoint (always public)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        mcpRunning: this.mcpProcess !== null,
        mcpInitialized: this.isInitialized,
        server: this.config.mcp?.command || 'unknown',
        authEnabled: this.authEnabled
      });
    });

    // Apply authentication middleware to protected routes (if enabled)
    const protectedMiddleware = this.authEnabled
      ? this.auth.getAuthenticateMiddleware()
      : ((req, res, next) => next());

    // SSE endpoint for server-sent events
    this.app.get('/sse', protectedMiddleware, async (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write('event: endpoint\n');
      res.write(`data: ${req.protocol}://${req.get('host')}/message\n\n`);

      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 15000);

      req.on('close', () => {
        clearInterval(keepAlive);
      });
    });

    // Main message endpoints for JSON-RPC requests (protected)
    this.app.post('/message', protectedMiddleware, this._handleJsonRpcRequest.bind(this));
    this.app.post('/messages', protectedMiddleware, this._handleJsonRpcRequest.bind(this));

    // List available tools (protected)
    this.app.get('/tools', protectedMiddleware, async (req, res) => {
      try {
        if (!this.mcpProcess) {
          this._spawnMcpProcess();
          await this._initializeMcp();
        }
        const response = await this._sendMcpRequest('tools/list');
        res.json(response);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  /**
   * Handle JSON-RPC requests
   * @private
   */
  async _handleJsonRpcRequest(req, res) {
    console.log('=== INCOMING REQUEST on', req.path, '===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Ensure MCP process is running and initialized
    if (!this.mcpProcess) {
      this._spawnMcpProcess();
      await this._initializeMcp();
    }

    try {
      const { method, params, id } = req.body;

      if (!method) {
        console.log('ERROR: Missing method in request');
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: missing method'
          },
          id: null
        });
      }

      console.log('Forwarding to MCP:', method, 'ID:', id);

      // Forward request to MCP process with original ID
      const response = await this._sendMcpRequest(method, params, id);

      console.log('MCP Response:', JSON.stringify(response).substring(0, 200) + '...');
      res.json(response);

    } catch (error) {
      console.error('Error handling request:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error.message
        },
        id: req.body.id || null
      });
    }
  }

  /**
   * Spawn the MCP server process
   * @private
   */
  _spawnMcpProcess() {
    if (this.mcpProcess) {
      return this.mcpProcess;
    }

    const mcpConfig = this.config.mcp || {};
    const command = mcpConfig.command || 'npx';
    const args = mcpConfig.args || [];
    const env = {
      ...process.env,
      ...(mcpConfig.env || {})
    };

    console.log(`Starting MCP process: ${command} ${args.join(' ')}`);

    this.mcpProcess = spawn(command, args, {
      env: {
        ...env,
        NODE_ENV: 'production'
      },
      shell: true
    });

    let buffer = '';

    // Handle stdout from MCP process (JSON-RPC responses)
    this.mcpProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            this._handleMcpResponse(response);
          } catch (e) {
            console.error('Failed to parse MCP response:', line, e);
          }
        }
      }
    });

    // Handle stderr from MCP process
    this.mcpProcess.stderr.on('data', (data) => {
      console.error('[MCP stderr]:', data.toString());
    });

    // Handle process exit
    this.mcpProcess.on('close', (code) => {
      console.log(`MCP process exited with code ${code}`);
      this.mcpProcess = null;
      this.isInitialized = false;
      // Reject all pending requests
      for (const [id, resolver] of this.pendingRequests) {
        resolver.reject(new Error('MCP process terminated'));
      }
      this.pendingRequests.clear();
    });

    // Handle process error
    this.mcpProcess.on('error', (err) => {
      console.error('MCP process error:', err);
      this.mcpProcess = null;
    });

    return this.mcpProcess;
  }

  /**
   * Handle responses from the MCP process
   * @private
   */
  _handleMcpResponse(response) {
    const id = response.id;
    const resolver = this.pendingRequests.get(id);

    if (resolver) {
      this.pendingRequests.delete(id);
      resolver.resolve(response);
    } else {
      console.log('Received response for unknown request:', response);
    }
  }

  /**
   * Send a JSON-RPC request to the MCP process
   * @private
   */
  _sendMcpRequest(method, params = {}, id = null) {
    return new Promise((resolve, reject) => {
      const requestId = id !== null ? id : this.messageId++;

      this.pendingRequests.set(requestId, { resolve, reject });

      const request = {
        jsonrpc: '2.0',
        id: requestId,
        method,
        params
      };

      console.log('→ Sending to MCP:', JSON.stringify(request));

      if (this.mcpProcess && this.mcpProcess.stdin) {
        this.mcpProcess.stdin.write(JSON.stringify(request) + '\n');
      } else {
        reject(new Error('MCP process not available'));
        return;
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Initialize the MCP connection
   * @private
   */
  async _initializeMcp() {
    if (this.isInitialized) return;

    try {
      const response = await this._sendMcpRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'mcp-http-proxy',
          version: '1.0.0'
        }
      });

      if (response.error) {
        throw new Error(`Initialize failed: ${response.error.message}`);
      }

      // Send initialized notification
      this.mcpProcess.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      }) + '\n');

      this.isInitialized = true;
      console.log('MCP connection initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP:', error);
      throw error;
    }
  }

  /**
   * Start the proxy server
   */
  start() {
    this.server = this.app.listen(this.PORT, this.HOST, () => {
      console.log(`\n╔═══════════════════════════════════════════════════════╗`);
      console.log(`║  MCP HTTP Proxy Server                                ║`);
      console.log(`╠═══════════════════════════════════════════════════════╣`);
      console.log(`║  Status: Running                                     ║`);
      console.log(`║  Auth: ${this.authEnabled ? 'Enabled ' : 'Disabled'}${' '.repeat(18)}║`);
      console.log(`║  URL:    http://${this.HOST}:${this.PORT}                    ║`);
      console.log(`║  Health: http://${this.HOST}:${this.PORT}/health               ║`);
      if (this.authEnabled) {
        console.log(`║  Login:  http://${this.HOST}:${this.PORT}/auth/login           ║`);
      }
      console.log(`║  Tools:  http://${this.HOST}:${this.PORT}/tools                ║`);
      console.log(`║  SSE:    http://${this.HOST}:${this.PORT}/sse                  ║`);
      console.log(`╚═══════════════════════════════════════════════════════╝\n`);
      if (this.authEnabled) {
        console.log('Authentication is ENABLED. First login at:');
        console.log(`  http://${this.HOST}:${this.PORT}/auth/login\n`);
        console.log('Then enter this URL in Claude Connectors:');
      } else {
        console.log('Enter this URL in Claude Connectors:');
      }
      console.log(`  http://${this.HOST}:${this.PORT}/message\n`);
      console.log('Press Ctrl+C to stop\n');

      // Pre-spawn MCP process
      this._spawnMcpProcess();
      // Initialize after a short delay
      setTimeout(() => {
        this._initializeMcp().catch(err => {
          console.error('Initial MCP initialization failed:', err.message);
        });
      }, 1000);
    });

    // Setup graceful shutdown
    this._setupShutdownHandlers();
  }

  /**
   * Setup graceful shutdown handlers
   * @private
   */
  _setupShutdownHandlers() {
    const shutdown = () => {
      console.log('\nShutting down proxy...');
      if (this.mcpProcess) {
        this.mcpProcess.kill();
      }
      if (this.server) {
        this.server.close();
      }
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

export default ProxyServer;
