#!/usr/bin/env node

/**
 * Echo MCP Server — Simple Test Server for OAuth Testing
 *
 * A minimal MCP server that echoes back received messages.
 * Useful for testing OAuth Provider mode without external dependencies.
 *
 * Usage:
 *   node echo-mcp-server.js
 *
 * With mcp-proxy:
 *   npx mcp-proxy --config ../examples/echo-test.config.js
 *
 * This server implements:
 * - Basic MCP protocol (stdio transport)
 * - Two simple tools: `echo` and `ping`
 * - Resource listing
 * - Prompt support
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Create the MCP server
const server = new Server(
  {
    name: 'echo-test-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Register the echo tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'echo':
      return {
        content: [{
          type: 'text',
          text: `Echo: ${JSON.stringify(args ?? {})}`,
        }],
      };

    case 'ping':
      return {
        content: [{
          type: 'text',
          text: 'pong! Echo test server is running.',
        }],
      };

    case 'get_time':
      return {
        content: [{
          type: 'text',
          text: `Current time: ${new Date().toISOString()}`,
        }],
      };

    case 'sum':
      const a = args?.a ?? 0;
      const b = args?.b ?? 0;
      return {
        content: [{
          type: 'text',
          text: `Sum: ${Number(a) + Number(b)}`,
        }],
      };

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'echo',
        description: 'Echo back the provided arguments as JSON',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Message to echo back',
            },
          },
        },
      },
      {
        name: 'ping',
        description: 'Check if the server is responding',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_time',
        description: 'Get the current server time',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'sum',
        description: 'Add two numbers together',
        inputSchema: {
          type: 'object',
          properties: {
            a: {
              type: 'number',
              description: 'First number',
            },
            b: {
              type: 'number',
              description: 'Second number',
            },
          },
          required: ['a', 'b'],
        },
      },
    ],
  };
});

// List resources (empty for this test server)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'test://server/info',
        name: 'Server Information',
        description: 'Basic information about this test server',
        mimeType: 'text/plain',
      },
    ],
  };
});

// List prompts (empty for this test server)
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'test_prompt',
        description: 'A simple test prompt',
        arguments: [],
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup to stderr (doesn't interfere with stdio protocol)
  console.error('Echo Test MCP Server started');
  console.error('Available tools: echo, ping, get_time, sum');
  console.error('Waiting for MCP messages...');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
