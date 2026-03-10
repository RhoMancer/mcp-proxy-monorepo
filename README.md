# MCP Proxy Monorepo

A collection of HTTP proxies for stdio-based MCP (Model Context Protocol) servers, built with a shared generic proxy package.

---
<!-- DO NOT DELETE: Hevy MCP integration is actively used. The mcp-http-proxy package provides generic proxy functionality, with Hevy as a primary use case. -->
## 🚀 **HERE FOR HEVY + CLAUDE CONNECTORS?**

**→ [packages/mcp-http-proxy/QUICKSTART.md](packages/mcp-http-proxy/QUICKSTART.md)** — Full Hevy + OAuth documentation

### Quick Start for Hevy

| Action | Command |
|:-------|:--------|
| **Start** | `cd packages/mcp-http-proxy && npx mcp-proxy --config examples/hevy-mcp.config.js` |
| **With OAuth** | `npx mcp-proxy --config examples/oauth-hevy.config.js` |

**Setup:**
1. Create `packages/mcp-http-proxy/.env` with your `HEVY_API_KEY`
2. The proxy runs on `http://127.0.0.1:8080`
3. Configure Claude to connect to: `http://127.0.0.1:8080/mcp`

**What this does:**
- Runs the `hevy-mcp` npm package (installed via npx)
- Exposes it as an HTTP endpoint that Claude can connect to
- Optional OAuth authentication for secure remote access

---

## Overview

This monorepo contains:
- **`mcp-http-proxy`** - Generic HTTP-to-stdio proxy for any MCP server
  - Supports **Hevy** workout tracker, **LibreOffice**, and any stdio-based MCP server
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
npm run start:libreoffice   # LibreOffice Calc
```

## Project Structure

```
mcp-proxy-monorepo/
├── .env.example                   # Environment variables template
├── .validation/                   # Integration tests for example implementations
├── packages/
│   ├── mcp-http-proxy/            # Generic proxy package
│   ├── libreoffice-calc-mcp/      # LibreOffice Calc integration
│   │   ├── start-full.bat         # LibreOffice + proxy
│   │   ├── start.bat              # Proxy only
│   │   ├── start-libreoffice.bat  # LibreOffice only
│   │   └── stop.bat               # Stop everything
│   └── libreoffice-calc-mcp-server/ # Python MCP server
├── package.json                   # Monorepo root
└── README.md
```

**Note:** The `.validation/` directory contains integration tests for **example implementations** (OAuth, LibreOffice), not tests for the generic proxy itself.

## Configuration

Each package has its own `.env.example` file. Copy the example for the package you're using:

```bash
# For Hevy (mcp-http-proxy):
cp packages/mcp-http-proxy/.env.example packages/mcp-http-proxy/.env

# For LibreOffice:
cp packages/libreoffice-calc-mcp/.env.example packages/libreoffice-calc-mcp/.env

# Or copy the root .env.example for a monorepo-wide template:
cp .env.example .env
```

Required environment variables vary by package:
- **Hevy** (via `mcp-http-proxy/.env`): `HEVY_API_KEY` - Get from [hevy.app](https://hevy.app)
- **LibreOffice** (via `libreoffice-calc-mcp/.env`): Usually auto-detected on Windows
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
    port: 8080,
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
- [hevy-mcp](https://github.com/chrisdoc/hevy-mcp) - Hevy workout tracker MCP server
