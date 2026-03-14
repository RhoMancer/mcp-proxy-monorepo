# Codebase Structure

**Analysis Date:** 2026-03-13

## Directory Layout

```
mcp-proxy-monorepo/
├── .github/                    # GitHub workflows
│   └── workflows/
│       └── test.yml           # CI pipeline for OAuth/LibreOffice tests
├── .validation/                # Integration tests for example implementations
│   ├── oauth-e2e.test.js      # OAuth end-to-end tests
│   ├── oauth-validation.test.js
│   ├── libreoffice-validation.test.js
│   ├── run-tests.js           # Test runner
│   └── setup-oauth.js         # OAuth test setup
├── docs/                       # Additional documentation
│   ├── OAUTH_QUICKSTART.md
│   └── OAUTH_TESTING_GUIDE.md
├── packages/                   # Monorepo packages (npm workspace)
│   ├── mcp-http-proxy/        # Generic HTTP-to-stdio proxy
│   ├── libreoffice-calc-mcp/  # LibreOffice integration (depends on mcp-http-proxy)
│   └── libreoffice-calc-mcp-server/  # Python MCP server (not in npm workspace)
├── .env.example                # Environment variables template
├── CHANGELOG.md                # Version history
├── package.json                # Root package.json (workspaces config)
├── pnpm-workspace.yaml         # pnpm workspace definition
├── README.md                   # Main README
├── START_HEVY_CONNECTOR_WITH_TUNNEL.bat
├── START_LIBREOFFICE_CONNECTOR_WITH_TUNNEL.bat
├── STOP_HEVY_CONNECTOR_WITH_TUNNEL.bat
└── BATCH_FILES.md              # Batch file reference
```

## Directory Purposes

**`.github/workflows/`:**
- Purpose: CI/CD pipeline configuration
- Contains: GitHub Actions workflow files
- Key files: `test.yml` - runs OAuth and LibreOffice validation tests

**`.validation/`:**
- Purpose: Integration tests for example OAuth and LibreOffice implementations
- Contains: E2E tests for OAuth flows, LibreOffice proxy validation
- Key files: `oauth-e2e.test.js`, `libreoffice-validation.test.js`, `run-tests.js`

**`docs/`:**
- Purpose: User-facing documentation beyond README
- Contains: OAuth setup and testing guides
- Key files: `OAUTH_QUICKSTART.md`, `OAUTH_TESTING_GUIDE.md`

**`packages/mcp-http-proxy/`:**
- Purpose: Generic HTTP-to-stdio proxy for MCP servers
- Contains: Core proxy server, authentication modules, example configs, tests
- Key files: `src/ProxyServer.js`, `src/cli.js`, `src/auth/*.js`

**`packages/libreoffice-calc-mcp/`:**
- Purpose: LibreOffice Calc integration package (consumer of mcp-http-proxy)
- Contains: Startup scripts, config files, batch files for Windows
- Key files: `start.js`, `mcp.config.js`, `package.json`

**`packages/libreoffice-calc-mcp-server/`:**
- Purpose: Python MCP server with LibreOffice Calc tools
- Contains: MCP server implementation, Calc tool functions, UNO connection layer
- Key files: `src/libreoffice_calc_mcp/__init__.py`, `calc_tools.py`, `uno_connection.py`

## Key File Locations

**Entry Points:**
- `packages/mcp-http-proxy/src/cli.js`: CLI entry point for `mcp-proxy` command
- `packages/mcp-http-proxy/src/ProxyServer.js`: Main proxy server class
- `packages/libreoffice-calc-mcp/start.js`: LibreOffice integration launcher
- `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/__main__.py`: Python MCP entry

**Configuration:**
- `package.json`: Monorepo root with npm workspaces config
- `pnpm-workspace.yaml`: pnpm workspace definition
- `.env.example`: Environment variable template
- `packages/mcp-http-proxy/examples/*.config.js`: Example configuration files

**Core Logic:**
- `packages/mcp-http-proxy/src/ProxyServer.js`: HTTP server, MCP process spawning, JSON-RPC forwarding
- `packages/mcp-http-proxy/src/auth/OAuth2Auth.js`: OAuth 2.0 client authentication
- `packages/mcp-http-proxy/src/auth/OAuthProviderAuth.js`: OAuth 2.0 provider authentication
- `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/calc_tools.py`: Calc operations (read/write cells, sheets, formulas)
- `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/uno_connection.py`: UNO/LibreOffice connection management

**Testing:**
- `packages/mcp-http-proxy/test/integration/*.test.js`: OAuth integration tests
- `packages/libreoffice-calc-mcp-server/tests/test_integration.py`: pytest tests for Calc tools
- `.validation/*.test.js`: E2E tests for example implementations

**Examples:**
- `packages/mcp-http-proxy/examples/hevy-mcp.config.js`: Hevy MCP server configuration
- `packages/mcp-http-proxy/examples/echo-test.config.js`: Built-in echo test server
- `packages/mcp-http-proxy/examples/echo-oauth-test.config.js`: Echo server with OAuth
- `packages/mcp-http-proxy/examples/test-server/echo-mcp-server.js`: Minimal MCP server for testing

## Naming Conventions

**Files:**
- `.config.js`: Configuration files that export default config object
- `.test.js`: Vitest test files
- `.e2e.test.js`: End-to-end integration tests
- `.py`: Python source files using snake_case module names
- `.bat`: Windows batch scripts (kebab-case or SCREAMING_SNAKE_CASE)

**Directories:**
- `src/`: Source code for packages
- `test/` or `tests/`: Test files
- `examples/`: Example configuration files and test servers
- `auth/`: Authentication-related modules

**Classes/Functions:**
- JavaScript: PascalCase classes (`ProxyServer`, `OAuth2Auth`)
- JavaScript: camelCase methods and functions (`_spawnMcpProcess`, `getAuthenticateMiddleware`)
- Python: snake_case modules and functions (`uno_connection.py`, `read_cell`, `get_connection`)
- Python: PascalCase classes (`UNOConnection`, `LibreOfficeConnectionError`, `CalcError`)

## Where to Add New Code

**New Feature (HTTP Proxy):**
- Primary code: `packages/mcp-http-proxy/src/`
- Tests: `packages/mcp-http-proxy/test/integration/`
- Example config: `packages/mcp-http-proxy/examples/your-feature.config.js`

**New MCP Server Integration:**
- Implementation: Create new directory `packages/your-mcp-server/`
- Proxy config: `packages/your-mcp-server/mcp.config.js`
- Tests: `.validation/your-mcp-validation.test.js`
- Update root: Add npm script in `package.json`

**New Authentication Provider:**
- Implementation: `packages/mcp-http-proxy/src/auth/YourAuthProvider.js`
- Export from: Add to `ProxyServer.js` imports
- Config example: `packages/mcp-http-proxy/examples/your-auth-provider.config.js`

**New MCP Tool (Python):**
- Implementation: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/your_tools.py`
- Register in: `packages/libreoffice-calc-mcp-server/src/libreoffice_calc_mcp/__init__.py` (add to `@app.call_tool()` and `@app.list_tools()`)
- Tests: `packages/libreoffice-calc-mcp-server/tests/test_your_tools.py`

**Utilities:**
- Shared helpers: `packages/mcp-http-proxy/src/utils/` (create if needed)

**Configuration Validation:**
- Validation rules: `packages/mcp-http-proxy/src/auth/validateConfig.js`

## Special Directories

**`packages/mcp-http-proxy/packages/mcp-http-proxy/`:**
- Purpose: Nested package structure (likely from npm pack testing)
- Generated: Yes
- Committed: Yes (artifact of build process)

**`node_modules/` in each package:**
- Purpose: Installed dependencies
- Generated: Yes
- Committed: No

**`.planning/`:**
- Purpose: Planning and codebase documentation
- Generated: Yes
- Committed: Yes

**`.chainlink/` in various locations:**
- Purpose: Chainlink (AI orchestration tool) cache and rules
- Generated: Yes
- Committed: Partially (rules may be committed, cache ignored)

**`coverage/`:**
- Purpose: Vitest coverage reports
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-13*
