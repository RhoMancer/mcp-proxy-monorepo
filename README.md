# MCP Proxy Monorepo

A collection of HTTP proxies for stdio-based MCP (Model Context Protocol) servers, built with a shared generic proxy package.

## Overview

This monorepo contains:
- **`mcp-http-proxy`** - Generic HTTP-to-stdio proxy for any MCP server
- **`hevy-mcp-proxy`** - HTTP proxy for [hevy-mcp](https://github.com/chrisdoc/hevy-mcp)
- **`libreoffice-calc-mcp`** - HTTP proxy + MCP server for LibreOffice Calc automation
- **`libreoffice-calc-mcp-server`** - Python MCP server with 11 Calc tools

## Quick Start

```bash
# Clone and install
git clone https://github.com/RhoMancer/mcp-proxy-monorepo.git
cd mcp-proxy-monorepo
npm install

# Start any proxy
npm start

# Start specific proxies
npm run start:hevy
npm run start:libreoffice
```

## Project Structure

```
mcp-proxy-monorepo/
├── packages/
│   ├── mcp-http-proxy/            # Generic proxy package
│   ├── hevy-mcp-proxy/            # Hevy-specific proxy
│   ├── libreoffice-calc-mcp/       # LibreOffice Calc proxy wrapper
│   └── libreoffice-calc-mcp-server/ # Python MCP server (UNO/Calc)
├── package.json                # Monorepo root (npm workspaces)
└── README.md
```

## Packages

### mcp-http-proxy

Generic HTTP-to-stdio proxy that can work with any MCP server.

**Features:**
- Configuration-driven MCP server spawning
- HTTP/JSON-RPC to stdio bridging
- CORS support for browser clients
- Health check and tools listing endpoints
- Cloudflare tunnel configuration support

**Usage:**
```bash
cd packages/mcp-http-proxy
npm install
npx mcp-proxy --config examples/hevy-mcp.config.js
```

### hevy-mcp-proxy

HTTP proxy for [hevy-mcp](https://github.com/chrisdoc/hevy-mcp), a fitness tracking MCP server.

**Features:**
- 20+ MCP tools for workouts, routines, exercises
- Ready to use with Claude Connectors
- Optional Cloudflare tunnel support for HTTPS

**Setup:**
```bash
cd packages/hevy-mcp-proxy
echo "HEVY_API_KEY=your_key" > .env
npm start
```

### libreoffice-calc-mcp

Complete LibreOffice Calc integration with HTTP proxy and Python MCP server.

**Features:**
- 11 MCP tools: read/write cells, ranges, formulas; sheet management; search
- UNO-based integration with LibreOffice
- Windows auto-configured for LibreOffice's bundled Python
- HTTP proxy at http://127.0.0.1:8081
- Optional Cloudflare tunnel for remote access

**Setup:**
```bash
# 1. Start LibreOffice with socket listening
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"

# 2. Start the proxy
cd packages/libreoffice-calc-mcp
npm start

# 3. Test
node test.js          # Direct MCP test
node test-proxy.js    # HTTP proxy test
```

**Note:** On Windows, the MCP SDK must be installed in LibreOffice's Python:
```bash
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
"C:/Program Files/LibreOffice/program/python.exe" get-pip.py
"C:/Program Files/LibreOffice/program/python-core-3.10.19/Scripts/pip.exe" install mcp
```

## Development

### Adding a New MCP Proxy

1. Create a new package in `packages/your-mcp-proxy/`
2. Add a `package.json` that depends on `mcp-http-proxy`
3. Create an `mcp.config.js` with your MCP server configuration
4. Add a `README.md` with setup instructions

Example `package.json`:
```json
{
  "name": "your-mcp-proxy",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "mcp-proxy"
  },
  "dependencies": {
    "mcp-http-proxy": "*"
  }
}
```

Example `mcp.config.js`:
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
    port: 8082,
    host: '127.0.0.1'
  }
};
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Related

- [MCP Protocol](https://modelcontextprotocol.io)
- [hevy-mcp](https://github.com/chrisdoc/hevy-mcp)
