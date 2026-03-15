# MCP Proxy Monorepo

[![Tests](https://github.com/RhoMancer/mcp-proxy-monorepo/actions/workflows/test.yml/badge.svg)](https://github.com/RhoMancer/mcp-proxy-monorepo/actions/workflows/test.yml)

A collection of HTTP proxies for stdio-based MCP (Model Context Protocol) servers, built with a shared generic proxy package.

---

## Showcase Examples

This monorepo includes example implementations demonstrating the proxy's versatility:

| Example | Description | Package |
|---------|-------------|---------|
| **Hevy** | Workout tracker API integration | [mcp-http-proxy](packages/mcp-http-proxy/QUICKSTART.md) |
| **LibreOffice** | Spreadsheet automation with 11 tools | [libreoffice-calc-mcp](packages/libreoffice-calc-mcp/) |

> **Note:** These are showcase examples. You can adapt the proxy for any stdio-based MCP server by following the configuration patterns shown.

---

## 🚀 Quick Start

### For Hevy (Showcase Example)

**→ [packages/mcp-http-proxy/QUICKSTART.md](packages/mcp-http-proxy/QUICKSTART.md)** — Full setup guide

**Startup Order (Important):**
1. Run `.\packages\mcp-http-proxy\START_HEVY_DUAL_MODE.bat` **first**
2. **THEN** start Claude Code CLI
3. Tools will be available immediately

### For LibreOffice (Showcase Example)

**→ [packages/libreoffice-calc-mcp/README.md](packages/libreoffice-calc-mcp/README.md)** — Complete setup guide

### For Any MCP Server

```bash
# Clone and install
git clone https://github.com/RhoMancer/mcp-proxy-monorepo.git
cd mcp-proxy-monorepo
npm install

# Configure your MCP server
cp packages/mcp-http-proxy/examples/echo-test.config.js my-config.js
# Edit my-config.js with your MCP server details

# Start the proxy
cd packages/mcp-http-proxy
npx mcp-proxy --config ../my-config.js
```

---

## Overview

This monorepo contains:

- **`mcp-http-proxy`** - Generic HTTP-to-stdio proxy for any MCP server
  - Configuration-driven MCP server spawning
  - OAuth 2.0 Provider mode for secure remote access
  - CORS support, health checks, Cloudflare tunnel support

- **`libreoffice-calc-mcp`** - HTTP proxy + MCP server for LibreOffice Calc
  - 11 MCP tools for spreadsheet automation
  - Auto-starts LibreOffice in socket mode

- **`libreoffice-calc-mcp-server`** - Python MCP server implementation
  - Demonstrates MCP server patterns

---

## Packages

### mcp-http-proxy

Generic HTTP-to-stdio proxy that works with any MCP server.

**Features:**
- Configuration-driven MCP server spawning
- HTTP/JSON-RPC to stdio bridging
- OAuth 2.0 Provider mode for secure remote access
- CORS support for browser clients
- Health check and tools listing endpoints
- Cloudflare tunnel configuration support

**Usage:**
```bash
cd packages/mcp-http-proxy
npm install

# Use the echo test server (great for OAuth testing!)
npx mcp-proxy --config examples/echo-test.config.js

# Or with Hevy:
npx mcp-proxy --config examples/hevy-mcp.config.js

# With OAuth Provider mode:
npx mcp-proxy --config examples/echo-oauth-test.config.js
```

**Documentation:**
- [QUICKSTART.md](packages/mcp-http-proxy/QUICKSTART.md) - Hevy example setup
- [DUAL_MODE_SETUP.md](packages/mcp-http-proxy/DUAL_MODE_SETUP.md) - Dual-mode configuration
- [README.md](packages/mcp-http-proxy/README.md) - Full package documentation

### libreoffice-calc-mcp

Complete LibreOffice Calc integration with HTTP proxy and Python MCP server.

**Features:**
- 11 MCP tools: read/write cells, ranges, formulas; sheet management; search
- UNO-based integration with LibreOffice
- Auto-starts LibreOffice in socket mode — no manual configuration needed
- Windows auto-configured for LibreOffice's bundled Python
- Optional Cloudflare tunnel for remote access

**Quick Start (Windows):**
```batch
cd packages\libreoffice-calc-mcp
START_LIBREOFFICE_AND_PROXY.bat
```

**Documentation:**
- [README.md](packages/libreoffice-calc-mcp/README.md) - Complete setup guide

### libreoffice-calc-mcp-server

Python MCP server with 11 LibreOffice Calc tools.

**Features:**
- Demonstrates MCP server implementation patterns
- Tools for cell/range operations, formula evaluation, sheet management

---

## OAuth Provider Mode

The proxy supports **OAuth 2.0 Provider mode** for secure remote access.

**Quick Start:** See [docs/OAUTH_QUICKSTART.md](docs/OAUTH_QUICKSTART.md) — 5-minute setup

**Full Guide:** See [docs/OAUTH_TESTING_GUIDE.md](docs/OAUTH_TESTING_GUIDE.md) — Complete OAuth testing

**Test Echo Server with OAuth:**
```bash
cd packages/mcp-http-proxy
npx mcp-proxy --config examples/echo-oauth-test.config.js
```

**Supported Providers:** GitHub, Google, Auth0, and any OAuth 2.0 provider

---

## Project Structure

```
mcp-proxy-monorepo/
├── docs/                              # Cross-cutting documentation
│   ├── OAUTH_QUICKSTART.md            # 5-minute OAuth setup
│   └── OAUTH_TESTING_GUIDE.md         # Complete OAuth testing
├── packages/
│   ├── mcp-http-proxy/                # Generic proxy package
│   │   ├── QUICKSTART.md              # Hevy example setup
│   │   ├── DUAL_MODE_SETUP.md         # Dual-mode guide
│   │   └── examples/                  # Configuration examples
│   ├── libreoffice-calc-mcp/          # LibreOffice integration
│   └── libreoffice-calc-mcp-server/   # Python MCP server
├── BATCH_FILES.md                     # Batch script reference
├── START_HEVY_CONNECTOR_WITH_TUNNEL.bat
├── START_LIBREOFFICE_CONNECTOR_WITH_TUNNEL.bat
└── package.json                       # Monorepo root
```

---

## Configuration

Each package has its own `.env.example` file:

```bash
# For mcp-http-proxy:
cp packages/mcp-http-proxy/.env.example packages/mcp-http-proxy/.env

# For LibreOffice:
cp packages/libreoffice-calc-mcp/.env.example packages/libreoffice-calc-mcp/.env
```

**Common Environment Variables:**
- `OAUTH_CLIENT_SECRET` — Generate with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- `YOUR_MCP_SERVER_API_KEY` — Varies by MCP server

---

## Development

### Workspace Structure

This monorepo uses **npm workspaces**:

```
mcp-proxy-monorepo/
├── packages/
│   ├── mcp-http-proxy/          # Generic proxy (workspace package)
│   ├── libreoffice-calc-mcp/    # Depends on mcp-http-proxy
│   └── libreoffice-calc-mcp-server/  # Python package (not in npm workspace)
```

**Workspace Commands:**
```bash
npm install                           # Install all dependencies
npm run dev -w packages/mcp-http-proxy
npm start -w packages/libreoffice-calc-mcp
npm run clean -ws --if-present        # Run in all workspaces
```

### Adding a New MCP Proxy

1. Create `packages/your-mcp-proxy/`
2. Add `package.json` depending on `mcp-http-proxy`
3. Create `mcp.config.js` with your MCP server configuration
4. Add `README.md` with setup instructions

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

---

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## License

MIT

---

## Related

- [MCP Protocol](https://modelcontextprotocol.io)
- [hevy-mcp](https://github.com/chrisdoc/hevy-mcp) - Hevy workout tracker MCP server
