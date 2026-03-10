# MCP Proxy Validation Tests

This directory contains **integration tests for example implementations** in the MCP Proxy monorepo.

## Purpose

The **`mcp-http-proxy` package is a generic proxy framework** that can work with any stdio-based MCP server.

These tests validate **specific example implementations** that demonstrate the proxy's capabilities:
- **OAuth 2.0 Provider Mode** — Example: Hevy MCP with GitHub OAuth
- **LibreOffice Calc Integration** — Example: Full automation setup with UNO

These are **not** tests for the generic proxy itself — they validate complete end-to-end implementations using the proxy.

---

> **Note:** This directory contains integration tests for **example implementations** (OAuth, LibreOffice), not tests for the generic `mcp-http-proxy` package itself. The generic proxy is framework-agnostic and can be used with any MCP server.

---

```bash
# Run all validation tests
npm test

# Run specific test suites
npm run test:oauth        # OAuth 2.0 flow validation
npm run test:libreoffice  # LibreOffice connection validation

# Interactive OAuth setup
npm run setup:oauth
```

## Documentation

| File | Description |
|------|-------------|
| `END_TO_END_TESTING.md` | Complete end-to-end testing procedures |
| `MANUAL_TESTING.md` | Validation results and manual test procedures |
| `README.md` | This file - test suite overview |

## Test Suites

## Test Suites

### OAuth 2.0 Flow Validation (`oauth-validation.test.js`)

Tests the OAuth 2.0 authentication implementation:

- ✓ `/health` endpoint remains public (no auth required)
- ✓ Protected routes (`/sse`, `/message`, `/tools`) return 401 without auth
- ✓ Auth endpoints (`/auth/login`, `/auth/me`) exist and respond correctly
- ✓ Session management and logout functionality

**Prerequisites:**
- OAuth app configured (GitHub, Google, etc.)
- Environment variables in `.env`:
  ```
  GITHUB_CLIENT_ID=your_client_id
  GITHUB_CLIENT_SECRET=your_client_secret
  SESSION_SECRET=a_long_random_string
  ```

**Run:**
```bash
node .validation/run-tests.js oauth
# or directly:
node .validation/oauth-validation.test.js
```

### LibreOffice Connection Validation (`libreoffice-validation.test.js`)

Tests LibreOffice integration:

- ✓ LibreOffice installation detection
- ✓ `start-libreoffice.bat` script validation
- ✓ `soffice.exe` process detection
- ✓ Socket connection test (port 2002)
- ✓ Test spreadsheet availability
- ✓ README.md quick start verification

**Prerequisites:**
- LibreOffice installed (standard Windows locations)
- Test spreadsheet in `packages/libreoffice-calc-mcp/test-data/`

**Run:**
```bash
node .validation/run-tests.js libreoffice
# or directly:
node .validation/libreoffice-validation.test.js
```

## Run All Tests

```bash
node .validation/run-tests.js all
```

## Adding Tests

Create a new test file following this pattern:

```javascript
#!/usr/bin/env node
import { spawn } from 'child_process';

const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`),
  fail: (msg) => console.log(`\x1b[31m[FAIL]\x1b[0m ${msg}`)
};

// Your test functions here...
```

Then register it in `run-tests.js`:

```javascript
const tests = {
  yourtest: {
    name: 'Your Test Name',
    file: 'your-test.test.js',
    description: 'What it tests'
  }
};
```

## Test Results

Tests produce exit codes:
- `0` = All tests passed
- `1` = Some tests failed

Tests that require manual intervention are marked as `[MANUAL]` and don't cause failure.

## Helper Scripts

### OAuth Setup Helper (`setup-oauth.js`)

Interactive script to configure OAuth 2.0 credentials:

```bash
npm run setup:oauth
# or directly:
node .validation/setup-oauth.js
```

This script will:
1. Check for existing `.env` file
2. Prompt for GitHub OAuth credentials
3. Generate a secure `SESSION_SECRET` if needed
4. Update `.env` file with your credentials

### Test Runner (`run-tests.js`)

Runs all or specific test suites:

```bash
node .validation/run-tests.js [test-name]
```

Available tests:
- `all` - Run all tests (default)
- `oauth` - OAuth 2.0 flow validation
- `libreoffice` - LibreOffice connection validation

## Configuration Examples

| Example Config | Description |
|----------------|-------------|
| `packages/mcp-http-proxy/examples/oauth-github.config.js` | GitHub OAuth for Hevy MCP |
| `packages/mcp-http-proxy/examples/oauth-libreoffice.config.js` | GitHub OAuth for LibreOffice MCP |
| `packages/mcp-http-proxy/examples/oauth-google.config.js` | Google OAuth template |
| `packages/mcp-http-proxy/examples/oauth-auth0.config.js` | Auth0 OAuth template |
