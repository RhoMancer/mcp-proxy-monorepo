# MCP Proxy Monorepo

A collection of HTTP proxies for stdio-based MCP (Model Context Protocol) servers, built with a shared generic proxy package.

---

## 🚀 **HERE FOR HEVY + CLAUDE CONNECTORS?**

**→ [Daily Quickstart Guide](packages/mcp-http-proxy/QUICKSTART.md)** — Full documentation

### Only Two Commands You Need

| Action | Command |
|--------|---------|
| **Start** | Double-click `START_HEVY_CONNECTOR.bat` |
| **Stop** | Double-click `STOP_HEVY_CONNECTOR.bat` |

Both files are in the repo root. That's it!

**What happens when you start:**
- MCP Proxy starts on port 8082 (handles OAuth authentication)
- Cloudflare Tunnel creates HTTPS from `hevy.angussoftware.dev` → your local machine
- Traffic routes: Claude → Cloudflare → Proxy → Hevy API

**Your OAuth Client Secret:** See `packages/mcp-http-proxy/.env` file → `OAUTH_CLIENT_SECRET`

---

## Overview

This monorepo contains:
- **`mcp-http-proxy`** - Generic HTTP-to-stdio proxy for any MCP server (used for Hevy)
- **`libreoffice-calc-mcp`** - HTTP proxy + MCP server for LibreOffice Calc automation
- **`libreoffice-calc-mcp-server`** - Python MCP server with 11 Calc tools

## Quick Start

**Requirements:**
- Node.js 18 or higher
- For LibreOffice: LibreOffice installed (optional for other packages)

```bash
# Clone and install
git clone https://github.com/RhoMancer/mcp-proxy-monorepo.git
cd mcp-proxy-monorepo
npm install

# Copy example environment files and configure
cp .env.example .env
# Edit .env with your API keys and secrets

# Start specific proxies
npm run start:hevy          # Hevy workout tracker
npm run start:libreoffice   # LibreOffice Calc
```

## Project Structure

```
mcp-proxy-monorepo/
├── START_HEVY_CONNECTOR.bat      # Start Hevy + Claude Connectors
├── STOP_HEVY_CONNECTOR.bat       # Stop Hevy + Claude Connectors
├── .env.example                   # Environment variables template
├── packages/
│   ├── mcp-http-proxy/            # Generic proxy package (for Hevy)
│   │   ├── start-tunnel.bat       # Proxy + Cloudflare Tunnel
│   │   ├── start.bat              # Proxy only (local testing)
│   │   ├── stop.bat               # Stop everything
│   │   └── START_HERE.bat         # Quick reference guide
│   ├── libreoffice-calc-mcp/      # LibreOffice Calc integration
│   │   ├── start-full.bat         # LibreOffice + proxy
│   │   ├── start.bat              # Proxy only
│   │   ├── start-libreoffice.bat  # LibreOffice only
│   │   └── stop.bat               # Stop everything
│   └── libreoffice-calc-mcp-server/ # Python MCP server
├── package.json                   # Monorepo root
└── README.md
```

## Configuration

Copy `.env.example` to `.env` and configure your settings:

```bash
cp .env.example .env
# Edit .env with your API keys and secrets
```

Required environment variables vary by package:
- **Hevy**: `HEVY_API_KEY`, `OAUTH_CLIENT_SECRET`
- **LibreOffice**: Usually auto-detected on Windows
- **OAuth Provider**: `OAUTH_CLIENT_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

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

### libreoffice-calc-mcp

Complete LibreOffice Calc integration with HTTP proxy and Python MCP server.

**Features:**
- 11 MCP tools: read/write cells, ranges, formulas; sheet management; search
- UNO-based integration with LibreOffice
- **Auto-starts LibreOffice in socket mode** — no manual configuration needed
- Windows auto-configured for LibreOffice's bundled Python
- HTTP proxy at http://127.0.0.1:8081
- Optional Cloudflare tunnel for remote access

**Quick Start (Windows — Easiest):**
```batch
REM From the libreoffice-calc-mcp directory:
cd packages\libreoffice-calc-mcp

REM Option 1: Start everything (LibreOffice + proxy)
start-full.bat

REM Option 2: Just the proxy (if LibreOffice already running)
start.bat

REM Option 3: Just LibreOffice (for manual setup)
start-libreoffice.bat
```

**Or use npm:**
```bash
cd packages/libreoffice-calc-mcp
npm start          # Automatically starts LibreOffice + proxy
```

**Troubleshooting:**
- **Error: "LibreOffice Calc connector isn't currently running"** → Run `npm start` which auto-starts LibreOffice
- See `packages/libreoffice-calc-mcp/README.md` for detailed setup

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
