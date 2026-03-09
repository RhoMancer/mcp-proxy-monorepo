# MCP HTTP Proxy

A generic HTTP-to-stdio proxy for any [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server. This allows stdio-based MCP servers to work with AI clients that require HTTP endpoints.

## Features

- 🔄 **Universal compatibility** - Works with any stdio-based MCP server
- 🌐 **HTTP endpoints** - Exposes MCP servers via HTTP/HTTPS
- 🔧 **Configuration-driven** - Simple config file for each MCP server
- 🚀 **Zero dependencies on the MCP server** - No need to modify server code
- 📡 **Cloudflare Tunnel ready** - Easy HTTPS tunneling support
- 🔒 **CORS enabled** - Works with browser-based clients

## Quick Start

### Installation

```bash
npm install mcp-http-proxy
```

### Create a Config File

Create `mcp.config.js` in your project:

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server'],
    env: {
      API_KEY: process.env.YOUR_API_KEY
    }
  },
  server: {
    port: 8080,
    host: '127.0.0.1'
  }
};
```

### Start the Proxy

```bash
npx mcp-proxy
# or with a custom config
npx mcp-proxy --config my-config.js
```

## Configuration

### Config File Structure

```js
export default {
  // MCP server configuration
  mcp: {
    command: string,      // Command to spawn (e.g., 'npx', 'node', 'python')
    args: string[],       // Arguments for the command
    env: object          // Environment variables (merged with process.env)
  },

  // HTTP server configuration
  server: {
    port: number,        // Port (default: 8080)
    host: string         // Host (default: '127.0.0.1')
  },

  // Cloudflare tunnel (optional)
  tunnel: {
    domain: string,      // Your custom domain
    tunnelId: string     // Cloudflare tunnel ID
  }
};
```

## Examples

### hevy-mcp

```js
// mcp.config.js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  }
};
```

### libreoffice-calc-mcp

```js
// mcp.config.js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'libreoffice-calc-mcp'],
    env: {
      LIBREOFFICE_PATH: 'C:/Program Files/LibreOffice/program/soffice.exe'
    }
  },
  server: {
    port: 8081  // Different port
  }
};
```

### Custom Node.js MCP Server

```js
// mcp.config.js
export default {
  mcp: {
    command: 'node',
    args: ['./my-mcp-server.js'],
    env: {
      CUSTOM_VAR: 'value'
    }
  }
};
```

### Python MCP Server

```js
// mcp.config.js
export default {
  mcp: {
    command: 'python',
    args: ['-m', 'my_mcp_server'],
    env: {
      API_KEY: process.env.API_KEY
    }
  }
};
```

## Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/tools` | GET | List available MCP tools |
| `/message` | POST | JSON-RPC endpoint |
| `/messages` | POST | JSON-RPC endpoint (alias) |
| `/sse` | GET | Server-Sent Events |

## Using with Claude

1. Start the proxy:
   ```bash
   npx mcp-proxy
   ```

2. Add to Claude Connectors:
   - **Name**: Your MCP Server
   - **Remote MCP server URL**: `http://127.0.0.1:8080/message`

## Cloudflare Tunnel Setup (Optional)

For HTTPS access, set up a Cloudflare tunnel:

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Create a tunnel
cloudflared tunnel create my-mcp-proxy

# Configure routing
cloudflared tunnel route dns my-mcp-proxy your-domain.example.com
```

Add tunnel config to `mcp.config.js`:
```js
tunnel: {
  domain: 'your-domain.example.com',
  tunnelId: 'your-tunnel-id'
}
```

## Troubleshooting

### Port already in use

```bash
# Find the process using the port
netstat -ano | findstr :8080  # Windows
lsof -i :8080                  # macOS/Linux

# Kill the process
taskkill /PID <PID> /F        # Windows
kill <PID>                     # macOS/Linux
```

### MCP process won't start

Check that:
1. The MCP server command is correct
2. Required environment variables are set
3. The MCP server is installed (`npx -y` helps here)

### Test the endpoint

```bash
# Health check
curl http://127.0.0.1:8080/health

# List tools
curl http://127.0.0.1:8080/tools
```

## License

MIT
