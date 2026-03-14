#!/usr/bin/env node

/**
 * Generic HTTP-to-stdio proxy for MCP servers
 *
 * This proxy runs any MCP server as a child process and exposes it via HTTP,
 * allowing it to be used with clients that only support HTTP transport.
 */

import { spawn } from 'child_process';
import crypto from 'crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import { OAuth2Auth } from './auth/OAuth2Auth.js';
import { OAuthProviderAuth } from './auth/OAuthProviderAuth.js';

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

    // OAuth 2.0 Authentication (optional - for redirecting to GitHub, Google, etc.)
    this.auth = null;
    this.authEnabled = false;

    // OAuth Provider mode (optional - for Claude Connectors)
    this.oauthProvider = null;
    this.oauthProviderEnabled = false;

    if (config.auth) {
      try {
        this.auth = new OAuth2Auth(config.auth);
        this.authEnabled = true;
        console.log('✓ OAuth 2.0 authentication enabled (redirect mode)');
      } catch (error) {
        console.warn(`⚠ Failed to enable OAuth 2.0: ${error.message}`);
        console.warn('⚠ Running without authentication');
      }
    }

    if (config.oauthProvider) {
      try {
        this.oauthProvider = new OAuthProviderAuth(config.oauthProvider);
        this.oauthProviderEnabled = true;
        console.log('✓ OAuth Provider mode enabled (Claude Connectors)');
      } catch (error) {
        console.warn(`⚠ Failed to enable OAuth Provider: ${error.message}`);
        console.warn('⚠ Running without OAuth Provider');
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
      if (this.authEnabled || this.oauthProviderEnabled) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
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

    // OAuth Provider routes (if enabled - for Claude Connectors)
    if (this.oauthProviderEnabled) {
      this.app.use('/auth', this.oauthProvider.getAuthRoutes());
    }

    // Health check endpoint (always public)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        mcpRunning: this.mcpProcess !== null,
        mcpInitialized: this.isInitialized,
        server: this.config.mcp?.command || 'unknown',
        authEnabled: this.authEnabled,
        oauthProviderEnabled: this.oauthProviderEnabled
      });
    });

    // OAuth Provider authorize endpoint at top level for Claude Connectors
    // Claude calls /authorize directly (not /auth/authorize)
    if (this.oauthProviderEnabled) {
      const oauthProvider = this.oauthProvider;

      // Mount the authorize route at the top level
      this.app.get('/authorize', (req, res, next) => {
        console.log('[OAuth] /authorize request:', req.query);
        const authRouter = oauthProvider.getAuthRoutes();
        req.url = '/authorize';
        authRouter(req, res, next);
      });

      // Handle POST to /token at top level
      this.app.post('/token', (req, res) => {
        console.log('[OAuth] /token request (top-level):', {
          'content-type': req.headers['content-type'],
          body_keys: Object.keys(req.body),
          grant_type: req.body?.grant_type,
          raw_body: JSON.stringify(req.body)?.substring(0, 200)
        });
        const authRouter = oauthProvider.getAuthRoutes();
        req.url = '/token';
        // Manually handle the token endpoint to avoid body parsing issues
        const { grant_type, client_id, client_secret, code, redirect_uri, code_verifier } = req.body;

        if (grant_type === 'authorization_code') {
          // Authorization Code Flow with PKCE (for Claude Connectors)
          if (!code) {
            return res.status(400).json({
              error: 'invalid_request',
              error_description: 'Missing authorization code'
            });
          }

          if (!code_verifier) {
            return res.status(400).json({
              error: 'invalid_request',
              error_description: 'Missing code_verifier (PKCE required)'
            });
          }

          // Look up the authorization code
          const authCodeData = oauthProvider.authCodes.get(code);
          if (!authCodeData) {
            console.log('[OAuth] Invalid auth code:', code);
            return res.status(400).json({
              error: 'invalid_grant',
              error_description: 'Invalid or expired authorization code'
            });
          }

          // Check if code has expired
          if (authCodeData.expiresAt < Date.now()) {
            oauthProvider.authCodes.delete(code);
            return res.status(400).json({
              error: 'invalid_grant',
              error_description: 'Authorization code has expired'
            });
          }

          // Verify redirect URI matches
          if (redirect_uri && redirect_uri !== authCodeData.redirectUri) {
            return res.status(400).json({
              error: 'invalid_grant',
              error_description: 'Redirect URI mismatch'
            });
          }

          // Verify PKCE code challenge
          const expectedChallenge = crypto
            .createHash('sha256')
            .update(code_verifier)
            .digest('base64url');

          if (authCodeData.codeChallenge !== expectedChallenge) {
            return res.status(400).json({
              error: 'invalid_grant',
              error_description: 'Invalid code_verifier'
            });
          }

          // Delete the used authorization code (single use)
          oauthProvider.authCodes.delete(code);

          // Issue token
          const tokenResponse = oauthProvider.issueToken(authCodeData.clientId);
          console.log('[OAuth] Issued token via authorization_code for:', authCodeData.clientId);
          return res.json(tokenResponse);

        } else if (grant_type === 'client_credentials') {
          // Client Credentials Flow (simple mode)
          if (!client_id || !client_secret) {
            return res.status(400).json({
              error: 'invalid_request',
              error_description: 'client_id and client_secret are required'
            });
          }

          if (!oauthProvider.validateClient(client_id, client_secret)) {
            return res.status(401).json({
              error: 'invalid_client',
              error_description: 'Invalid client credentials'
            });
          }

          const tokenResponse = oauthProvider.issueToken(client_id);
          console.log('[OAuth] Issued token via client_credentials for:', client_id);
          return res.json(tokenResponse);

        } else {
          console.log('[OAuth] Unsupported grant_type:', grant_type);
          return res.status(400).json({
            error: 'unsupported_grant_type',
            error_description: 'Supported grant types: authorization_code, client_credentials'
          });
        }
      });
    }

    // Apply authentication middleware to protected routes (if enabled)
    // OAuth Provider mode takes precedence over OAuth 2.0 redirect mode
    const protectedMiddleware = this.oauthProviderEnabled
      ? this.oauthProvider.getAuthenticateMiddleware()
      : this.authEnabled
        ? this.auth.getAuthenticateMiddleware()
        : ((req, res, next) => next());

    // SSE endpoint at root path for MCP HTTP transport spec compliance
    // According to the spec, clients GET the base URL and expect an SSE stream
    // that sends an "endpoint" event pointing to the message endpoint
    this.app.get('/', protectedMiddleware, async (req, res) => {
      const requestId = crypto.randomBytes(8).toString('hex');
      console.log(`[ROOT-SSE ${requestId}] Connection established from`, req.ip, req.headers['user-agent']);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const endpointUrl = `${req.protocol}://${req.get('host')}/message`;
      console.log(`[ROOT-SSE ${requestId}] Sending endpoint event:`, endpointUrl);

      res.write('event: endpoint\n');
      res.write(`data: ${endpointUrl}\n\n`);
      // Flush immediately to send the endpoint event to the client
      if (typeof res.flush === 'function') {
        res.flush();
      }

      const keepAlive = setInterval(() => {
        try {
          res.write(': keep-alive\n\n');
          if (typeof res.flush === 'function') {
            res.flush();
          }
        } catch (err) {
          console.log(`[ROOT-SSE ${requestId}] Keep-alive error:`, err.message);
          clearInterval(keepAlive);
        }
      }, 15000);

      req.on('close', () => {
        console.log(`[ROOT-SSE ${requestId}] Connection closed`);
        clearInterval(keepAlive);
      });

      req.on('error', (err) => {
        console.error(`[ROOT-SSE ${requestId}] Connection error:`, err.message);
        clearInterval(keepAlive);
      });
    });

    // SSE endpoint for server-sent events (alternate path)
    this.app.get('/sse', protectedMiddleware, async (req, res) => {
      const requestId = crypto.randomBytes(8).toString('hex');
      console.log(`[SSE ${requestId}] Connection established from`, req.ip, req.headers['user-agent']);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const endpointUrl = `${req.protocol}://${req.get('host')}/message`;
      console.log(`[SSE ${requestId}] Sending endpoint event:`, endpointUrl);

      res.write('event: endpoint\n');
      res.write(`data: ${endpointUrl}\n\n`);
      // Flush immediately to send the endpoint event to the client
      if (typeof res.flush === 'function') {
        res.flush();
      }

      const keepAlive = setInterval(() => {
        try {
          res.write(': keep-alive\n\n');
          if (typeof res.flush === 'function') {
            res.flush();
          }
        } catch (err) {
          console.log(`[SSE ${requestId}] Keep-alive error:`, err.message);
          clearInterval(keepAlive);
        }
      }, 15000);

      req.on('close', () => {
        console.log(`[SSE ${requestId}] Connection closed`);
        clearInterval(keepAlive);
      });

      req.on('error', (err) => {
        console.error(`[SSE ${requestId}] Connection error:`, err.message);
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
   * Classify errors into specific MCP error codes with actionable messages
   * @private
   * @param {Error} error - The error to classify
   * @returns {Object} Object containing error code and message
   */
  _classifyError(error) {
    const errorMessage = error.message || error.toString();

    // Check for timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      return {
        code: -32000,
        message: 'Request timeout: MCP server did not respond within 30 seconds. Next steps: Check if MCP process is running, verify server logs for errors, confirm MCP server is not blocked by firewall.'
      };
    }

    // Check for process termination errors
    if (errorMessage.includes('terminated') || errorMessage.includes('exited')) {
      return {
        code: -32001,
        message: 'MCP process terminated: The underlying MCP server process exited unexpectedly. Next steps: Check MCP server configuration, verify required environment variables are set, review MCP server logs for crash details.'
      };
    }

    // Check for process not available errors
    if (errorMessage.includes('not available') || errorMessage.includes('stdin')) {
      return {
        code: -32002,
        message: 'MCP process not available: The MCP server process failed to start or its stdin is not accessible. Next steps: Verify MCP server command and arguments, check if required dependencies are installed, confirm command path is correct.'
      };
    }

    // Check for initialization errors
    if (errorMessage.includes('Initialize failed')) {
      return {
        code: -32003,
        message: `MCP initialization failed: ${errorMessage}. Next steps: Verify MCP server protocol compatibility, check if server supports protocol version 2024-11-05, review server configuration.`
      };
    }

    // Default internal error with original message
    return {
      code: -32603,
      message: `Internal error: ${errorMessage}. Next steps: Check proxy server logs for details, verify MCP server is running, confirm request format is valid.`
    };
  }

  /**
   * Handle JSON-RPC requests
   * @private
   */
  async _handleJsonRpcRequest(req, res) {
    const requestId = crypto.randomBytes(8).toString('hex');
    console.log(`[MESSAGE ${requestId}] === INCOMING REQUEST on`, req.path, '===');
    console.log(`[MESSAGE ${requestId}] From:`, req.ip, 'User-Agent:', req.headers['user-agent']);
    console.log(`[MESSAGE ${requestId}] Body:`, JSON.stringify(req.body, null, 2));

    // Ensure MCP process is running and initialized
    if (!this.mcpProcess) {
      console.log(`[MESSAGE ${requestId}] Spawning MCP process...`);
      this._spawnMcpProcess();
      await this._initializeMcp();
    }

    try {
      const { method, params, id } = req.body;

      if (!method) {
        console.log(`[MESSAGE ${requestId}] ERROR: Missing method in request`);
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: missing method. Next steps: Verify request body contains valid JSON-RPC method field, check request format matches JSON-RPC 2.0 specification.'
          },
          id: null
        });
      }

      console.log(`[MESSAGE ${requestId}] Forwarding to MCP:`, method, 'ID:', id);

      // Forward request to MCP process with original ID
      const response = await this._sendMcpRequest(method, params, id);

      console.log(`[MESSAGE ${requestId}] MCP Response:`, JSON.stringify(response).substring(0, 200) + '...');
      res.json(response);

    } catch (error) {
      console.error(`[MESSAGE ${requestId}] Error handling request:`, error);
      const classified = this._classifyError(error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: classified.code,
          message: classified.message,
          data: error.stack // Include stack for debugging
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

      const authStatus = this.oauthProviderEnabled
        ? 'OAuth Provider '
        : this.authEnabled
          ? 'OAuth 2.0     '
          : 'Disabled      ';
      console.log(`║  Auth: ${authStatus}${' '.repeat(18)}║`);
      console.log(`║  URL:    http://${this.HOST}:${this.PORT}                    ║`);
      console.log(`║  Health: http://${this.HOST}:${this.PORT}/health               ║`);

      if (this.authEnabled) {
        console.log(`║  Login:  http://${this.HOST}:${this.PORT}/auth/login           ║`);
      }
      if (this.oauthProviderEnabled) {
        console.log(`║  Token:  http://${this.HOST}:${this.PORT}/auth/token           ║`);
      }

      console.log(`║  Tools:  http://${this.HOST}:${this.PORT}/tools                ║`);
      console.log(`║  SSE:    http://${this.HOST}:${this.PORT}/sse                  ║`);
      console.log(`╚═══════════════════════════════════════════════════════╝\n`);

      if (this.oauthProviderEnabled) {
        console.log('✓ OAuth Provider mode enabled for Claude Connectors');
        console.log('\nIn Claude web app, add a custom connector with:');
        console.log(`  Name: Your Connector Name`);
        console.log(`  Remote MCP server URL: http://${this.HOST}:${this.PORT}/message`);
        console.log(`  OAuth Client ID: any-client-id`);
        console.log(`  OAuth Client Secret: (use the secret from your config)\n`);
      } else if (this.authEnabled) {
        console.log('Authentication is ENABLED (OAuth 2.0 redirect mode).');
        console.log('First login at:');
        console.log(`  http://${this.HOST}:${this.PORT}/auth/login\n`);
        console.log('Then enter this URL in Claude Connectors:');
      } else {
        console.log('Enter this URL in Claude Connectors:');
      }

      if (!this.oauthProviderEnabled) {
        console.log(`  http://${this.HOST}:${this.PORT}/message\n`);
      }
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
