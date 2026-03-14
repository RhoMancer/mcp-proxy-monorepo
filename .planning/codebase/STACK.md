# Technology Stack

**Analysis Date:** 2026-03-13

## Languages

**Primary:**
- JavaScript (ES Modules, Node.js) - Backend proxy server, CLI tools, monorepo orchestration
- Python 3.10+ - LibreOffice MCP server implementation

**Secondary:**
- Batch Script (Windows) - Platform-specific LibreOffice startup scripts

## Runtime

**Environment:**
- Node.js >=18.0.0 - Required for all packages
- Python 3.10, 3.11, 3.12 - Supported for LibreOffice MCP server

**Package Manager:**
- npm (workspaces) - Primary monorepo manager
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Express 4.18.2 - HTTP server for MCP proxy (`packages/mcp-http-proxy`)
- MCP SDK 1.0.0+ (Python) - Model Context Protocol server framework
- Passport 0.7.0 - OAuth 2.0 authentication middleware
- passport-oauth2 1.8.0 - Generic OAuth 2.0 strategy

**Testing:**
- Vitest 2.0.0 - JavaScript test runner for mcp-http-proxy
- @vitest/ui 2.0.0 - Test UI for Vitest
- @vitest/coverage-v8 2.0.0 - Code coverage reporting
- supertest 7.0.0 - HTTP assertion library
- pytest 7.0.0+ - Python test framework
- pytest-asyncio 0.21.0+ - Async test support for Python

**Build/Dev:**
- dotenv 16.3.1 - Environment variable loading
- express-session 1.18.0 - Session management for OAuth
- cookie-parser 1.4.6 - Cookie parsing middleware
- Hatchling - Python build backend

## Key Dependencies

**Critical:**
- `mcp` (Python) >=1.0.0 - Official MCP SDK for implementing stdio servers
- `express` - HTTP server foundation for the proxy
- `passport` + `passport-oauth2` - OAuth 2.0 authentication flow
- `uno` (pyuno) - LibreOffice UNO bindings for Calc automation

**Infrastructure:**
- `express-session` - Session storage for authenticated users
- `cookie-parser` - Session cookie handling
- Node.js `child_process` (built-in) - Spawning MCP server processes
- Node.js `crypto` (built-in) - PKCE code challenge generation

## Configuration

**Environment:**
- dotenv - Loads `.env` files in each package
- Key configs required:
  - `SESSION_SECRET` - For OAuth session encryption
  - Provider-specific credentials (GitHub, Google, Auth0, etc.)
  - LibreOffice paths and socket configuration
  - API keys for downstream services (e.g., HEVY_API_KEY)

**Build:**
- `package.json` (npm workspaces) - Monorepo configuration
- `pnpm-workspace.yaml` - Alternative workspace definition
- `pyproject.toml` - Python project build config (Hatchling)
- JavaScript config files - `.config.js` files for proxy startup

## Platform Requirements

**Development:**
- Node.js 18+ for JavaScript packages
- Python 3.10+ for LibreOffice MCP server
- LibreOffice installation with pyuno (Python UNO bindings)
- Windows-specific: `soffice.exe` path detection

**Production:**
- Any Node.js 18+ hosting platform
- LibreOffice headless mode for server environments
- Optional: Cloudflare Tunnel for external HTTPS access
- Optional: OAuth providers (GitHub, Google, Auth0, etc.)

---

*Stack analysis: 2026-03-13*
