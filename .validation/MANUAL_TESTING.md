# OAuth 2.0 and LibreOffice Validation Results

This document contains validation results and manual testing procedures for the MCP Proxy.

## Automated Tests

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:oauth        # OAuth 2.0 flow validation
npm run test:libreoffice  # LibreOffice connection validation
```

## Current Test Results

### LibreOffice Connection Tests
| Test | Status | Notes |
|------|--------|-------|
| LibreOffice installed | ✓ PASS | Found at C:\Program Files\LibreOffice\program\soffice.exe |
| start-libreoffice.bat valid | ✓ PASS | Contains correct socket mode parameters |
| Test spreadsheet exists | ✓ PASS | test.ods found in test-data/ |
| README.md has quickstart | ✓ PASS | Quick start instructions present |
| soffice.exe running | ⚠ MANUAL | Requires LibreOffice to be started |
| Port 2002 listening | ⚠ MANUAL | Requires LibreOffice socket mode |
| Socket connection | ⚠ MANUAL | Requires LibreOffice to be running |

### OAuth 2.0 Flow Tests
| Test | Status | Notes |
|------|--------|-------|
| /health endpoint public | ✓ PASS | Returns 200 without auth |
| Protected routes require auth | ✓ PASS | /sse, /message return 401 |
| /auth/login endpoint exists | ✓ PASS | Redirects to OAuth provider |
| /auth/me endpoint exists | ✓ PASS | Returns 401 when not logged in |
| Full OAuth flow | ⚠ MANUAL | Requires real OAuth credentials |

## Manual Testing Procedures

### Quick OAuth Test with Echo Server

**Recommended for first-time OAuth testing!** Use the built-in echo test server:

1. **Set up OAuth App (GitHub example):**
   ```
   1. Go to https://github.com/settings/developers
   2. Click "New OAuth App"
   3. Set Homepage URL: http://127.0.0.1:8080
   4. Set Authorization callback: http://127.0.0.1:8080/auth/callback
   5. Copy Client ID and create Client Secret
   ```

2. **Configure Environment:**
   ```bash
   # Create .env file in packages/mcp-http-proxy/:
   cd packages/mcp-http-proxy
   cat > .env << EOF
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   OAUTH_CLIENT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
   EOF
   ```

3. **Start Proxy with Echo Server and OAuth:**
   ```bash
   npx mcp-proxy --config examples/echo-oauth-test.config.js
   ```

4. **Test the Flow:**
   - Visit http://127.0.0.1:8080/health → Should return `{"authEnabled":true}`
   - Visit http://127.0.0.1:8080/auth/login → Should redirect to GitHub
   - After auth, visit http://127.0.0.1:8080/tools → Should show echo, ping, get_time, sum tools
   - Visit http://127.0.0.1:8080/auth/me → Should show user info

**See `packages/mcp-http-proxy/examples/test-server/README.md` for more details.**

### OAuth 2.0 End-to-End Test with Hevy

1. **Set up OAuth App (GitHub example):**
   ```
   1. Go to https://github.com/settings/developers
   2. Click "New OAuth App"
   3. Set Homepage URL: http://127.0.0.1:8080
   4. Set Authorization callback: http://127.0.0.1:8080/auth/callback
   5. Copy Client ID and create Client Secret
   ```

2. **Configure Environment:**
   ```bash
   # Create .env file in project root:
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=random_long_string_for_encryption
   ```

3. **Start Proxy with OAuth:**
   ```bash
   cd packages/mcp-http-proxy
   node src/cli.js -c ../examples/oauth-github.config.js
   ```

4. **Test the Flow:**
   - Visit http://127.0.0.1:8080/health → Should return JSON with `authEnabled: true`
   - Visit http://127.0.0.1:8080/auth/login → Should redirect to GitHub
   - After auth, should redirect back to /auth/callback
   - Visit http://127.0.0.1:8080/auth/me → Should show user info
   - Try http://127.0.0.1:8080/tools → Should return tools (protected route)
   - POST to http://127.0.0.1:8080/message → Should work (authenticated)

5. **Test Logout:**
   ```bash
   curl -X POST http://127.0.0.1:8080/auth/logout
   ```

### LibreOffice End-to-End Test

**IMPORTANT:** Close any open LibreOffice windows before starting socket mode.

1. **Start LibreOffice in Socket Mode:**
   ```bash
   cd packages/libreoffice-calc-mcp
   start-libreoffice.bat
   ```

2. **Verify it's Running:**
   - Open Task Manager (Ctrl+Shift+Esc)
   - Look for `soffice.exe` in Processes
   - Or run: `npm run test:libreoffice`

3. **Start the Proxy:**
   ```bash
   start.bat
   ```

4. **Verify Connection:**
   - You should see "✓ LibreOffice detected (localhost:2002)"
   - Visit http://127.0.0.1:8081/health
   - Should see: `{"status":"ok","mcpRunning":true,"mcpInitialized":true}`

5. **Test MCP Functionality:**
   - Add the connector to Claude with URL: `http://127.0.0.1:8081/messages`
   - Ask: "Read C:\Users\...\test.ods and tell me what's in cell A1"

6. **Stop Everything:**
   - Press Ctrl+C in proxy window
   - Use Task Manager to end soffice.exe, or run: `stop.bat`

## Known Issues and Notes

1. **LibreOffice Socket Mode:**
   - Cannot start if LibreOffice is already open normally
   - Must close all LibreOffice windows before using socket mode
   - The start-libreoffice.bat script runs in background (flashes and closes)

2. **OAuth Configuration:**
   - GitHub OAuth apps require the callback URL to match exactly
   - SESSION_SECRET must be set for session encryption
   - Protected routes return 401 without valid session

3. **Testing Without Credentials:**
   - Run `npm run test:libreoffice` for non-auth tests
   - OAuth tests are skipped when credentials not found

## Test Coverage Summary

- ✓ Automated tests: Infrastructure, configuration validation
- ✓ Semi-automated tests: Process detection, port checking
- ⚠ Manual tests: Full OAuth flow, full MCP integration

The validation tests provide a solid foundation for ensuring the MCP Proxy works correctly. Manual testing is recommended for:
- First-time setup verification
- After major code changes
- Before deploying to production
