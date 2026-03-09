#!/usr/bin/env node

/**
 * HTTP-to-stdio proxy for hevy-mcp
 *
 * This proxy runs hevy-mcp as a child process and exposes it via HTTP,
 * allowing it to be used with clients that only support HTTP transport.
 */

import { spawn } from 'child_process';
import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const HEVY_API_KEY = process.env.HEVY_API_KEY;

// Restrict to localhost only for security
const HOST = '127.0.0.1';

// CORS support for browser-based clients (like Claude web UI)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// MCP child process reference
let mcpProcess = null;
let messageId = 1;
const pendingRequests = new Map();
let isInitialized = false;

/**
 * Spawn the hevy-mcp process
 */
function spawnMcpProcess() {
  if (mcpProcess) {
    return mcpProcess;
  }

  console.log('Starting hevy-mcp process...');

  // Use shell mode for Windows compatibility
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npx' : 'npx';
  const args = ['-y', 'hevy-mcp'];

  mcpProcess = spawn(command, args, {
    env: {
      ...process.env,
      HEVY_API_KEY: HEVY_API_KEY,
      NODE_ENV: 'production'
    },
    shell: true  // Required for Windows to find npx
  });

  let buffer = '';

  // Handle stdout from MCP process (JSON-RPC responses)
  mcpProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          handleMcpResponse(response);
        } catch (e) {
          console.error('Failed to parse MCP response:', line, e);
        }
      }
    }
  });

  // Handle stderr from MCP process
  mcpProcess.stderr.on('data', (data) => {
    console.error('[hevy-mcp stderr]:', data.toString());
  });

  // Handle process exit
  mcpProcess.on('close', (code) => {
    console.log(`hevy-mcp process exited with code ${code}`);
    mcpProcess = null;
    isInitialized = false;
    // Reject all pending requests
    for (const [id, resolver] of pendingRequests) {
      resolver.reject(new Error('MCP process terminated'));
    }
    pendingRequests.clear();
  });

  // Handle process error
  mcpProcess.on('error', (err) => {
    console.error('hevy-mcp process error:', err);
    mcpProcess = null;
  });

  return mcpProcess;
}

/**
 * Handle responses from the MCP process
 */
function handleMcpResponse(response) {
  const id = response.id;
  const resolver = pendingRequests.get(id);

  if (resolver) {
    pendingRequests.delete(id);
    resolver.resolve(response);
  } else {
    console.log('Received response for unknown request:', response);
  }
}

/**
 * Send a JSON-RPC request to the MCP process
 */
function sendMcpRequest(method, params = {}, id = null) {
  return new Promise((resolve, reject) => {
    // Use provided ID, or generate one for internal requests
    const requestId = id !== null ? id : messageId++;

    pendingRequests.set(requestId, { resolve, reject });

    const request = {
      jsonrpc: '2.0',
      id: requestId,
      method,
      params
    };

    console.log('→ Sending to hevy-mcp:', JSON.stringify(request));

    if (mcpProcess && mcpProcess.stdin) {
      mcpProcess.stdin.write(JSON.stringify(request) + '\n');
    } else {
      reject(new Error('MCP process not available'));
      return;
    }

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

/**
 * Initialize the MCP connection
 */
async function initializeMcp() {
  if (isInitialized) return;

  try {
    const response = await sendMcpRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'hevy-mcp-http-proxy',
        version: '1.0.0'
      }
    });

    if (response.error) {
      throw new Error(`Initialize failed: ${response.error.message}`);
    }

    // Send initialized notification
    mcpProcess.stdin.write(JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    }) + '\n');

    isInitialized = true;
    console.log('MCP connection initialized successfully');
  } catch (error) {
    console.error('Failed to initialize MCP:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mcpRunning: mcpProcess !== null,
    mcpInitialized: isInitialized
  });
});

// SSE endpoint for server-sent events (for future use with streaming)
app.get('/sse', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send endpoint event
  res.write('event: endpoint\n');
  res.write(`data: ${req.protocol}://${req.get('host')}/message\n\n`);

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// JSON-RPC message handler - shared by /message and /messages endpoints
async function handleJsonRpcRequest(req, res) {
  // Debug logging
  console.log('=== INCOMING REQUEST on', req.path, '===');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Ensure MCP process is running and initialized
  if (!mcpProcess) {
    spawnMcpProcess();
    await initializeMcp();
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
    const response = await sendMcpRequest(method, params, id);

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

// Main message endpoint for JSON-RPC requests (MCP standard)
app.post('/message', handleJsonRpcRequest);

// Alias endpoint /messages (plural) - some MCP clients use this
app.post('/messages', handleJsonRpcRequest);

// List available tools
app.get('/tools', async (req, res) => {
  try {
    if (!mcpProcess) {
      spawnMcpProcess();
      await initializeMcp();
    }

    const response = await sendMcpRequest('tools/list');
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`\n╔═══════════════════════════════════════════════════════╗`);
  console.log(`║  hevy-mcp HTTP Proxy Server                          ║`);
  console.log(`╠═══════════════════════════════════════════════════════╣`);
  console.log(`║  Status: Running                                     ║`);
  console.log(`║  URL:    http://${HOST}:${PORT}                    ║`);
  console.log(`║  Health: http://${HOST}:${PORT}/health               ║`);
  console.log(`║  Tools:  http://${HOST}:${PORT}/tools                ║`);
  console.log(`║  SSE:    http://${HOST}:${PORT}/sse                  ║`);
  console.log(`╚═══════════════════════════════════════════════════════╝\n`);
  console.log('Enter this URL in Claude Connectors:');
  console.log(`  http://${HOST}:${PORT}/message\n`);
  console.log('Press Ctrl+C to stop\n');

  // Pre-spawn MCP process
  spawnMcpProcess();
  // Initialize after a short delay
  setTimeout(() => {
    initializeMcp().catch(err => {
      console.error('Initial MCP initialization failed:', err.message);
    });
  }, 1000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down proxy...');
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit(0);
});
