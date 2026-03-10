# MCP Proxy End-to-End Testing Guide

This guide provides complete procedures for testing the MCP Proxy with OAuth 2.0 authentication and LibreOffice Calc MCP integration.

## Table of Contents

1. [Quick Start](#quick-start)
2. [OAuth 2.0 Authentication Testing](#oauth-20-authentication-testing)
3. [LibreOffice Calc MCP Testing](#libreoffice-calc-mcp-testing)
4. [Combined OAuth + LibreOffice Testing](#combined-oauth--libreoffice-testing)
5. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Run All Validation Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
npm run test:oauth        # OAuth 2.0 flow validation
npm run test:libreoffice  # LibreOffice connection validation
```

---

## OAuth 2.0 Authentication Testing

### Step 1: Set Up GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: `MCP Proxy Test`
   - **Homepage URL**: `http://127.0.0.1:8080`
   - **Authorization callback URL**: `http://127.0.0.1:8080/auth/callback`
4. Click **"Register application"**
5. Copy the **Client ID**
6. Click **"Generate a new client secret"** and copy it

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env
```

Edit `.env` and add your GitHub OAuth credentials:

```env
GITHUB_CLIENT_ID=your_actual_client_id_here
GITHUB_CLIENT_SECRET=your_actual_client_secret_here
SESSION_SECRET=generate_a_random_string_at_least_32_chars_long
```

**Generate a SESSION_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

### Step 3: Start the Proxy with OAuth

```bash
cd packages/mcp-http-proxy
node src/cli.js -c ../examples/oauth-github.config.js
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║  MCP HTTP Proxy Server                                ║
╠═══════════════════════════════════════════════════════╣
║  Status: Running                                     ║
║  Auth: Enabled                                        ║
║  URL:    http://127.0.0.1:8080                        ║
║  Health: http://127.0.0.1:8080/health                ║
║  Login:  http://127.0.0.1:8080/auth/login             ║
╚═══════════════════════════════════════════════════════╝

Authentication is ENABLED. First login at:
  http://127.0.0.1:8080/auth/login
```

### Step 4: Test the OAuth Flow

Open a browser or use curl:

**1. Test Health Endpoint (Public - No Auth Required)**
```bash
curl http://127.0.0.1:8080/health
```
Expected response:
```json
{"status":"ok","mcpRunning":true,"mcpInitialized":true,"authEnabled":true}
```

**2. Test Protected Route Without Auth (Should Return 401)**
```bash
curl http://127.0.0.1:8080/tools
```
Expected response:
```json
{"error":"Unauthorized","message":"Authentication required"}
```

**3. Start OAuth Login Flow**
```bash
# This redirects to GitHub
curl -L http://127.0.0.1:8080/auth/login
```

Or visit in browser: `http://127.0.0.1:8080/auth/login`

**4. After GitHub Authorization**
- GitHub will redirect back to `http://127.0.0.1:8080/auth/callback`
- You'll be redirected to `/` with a valid session

**5. Test Authenticated Endpoints**
```bash
# Get current user info
curl http://127.0.0.1:8080/auth/me
```
Expected response:
```json
{"authenticated":true,"user":{"id":"...","email":"your@email.com","displayName":"Your Name"}}
```

**6. Test Logout**
```bash
curl -X POST http://127.0.0.1:8080/auth/logout
```

### Step 5: Run Automated OAuth Tests

```bash
npm run test:oauth
```

---

## LibreOffice Calc MCP Testing

### Prerequisites

- LibreOffice installed (https://www.libreoffice.org/download/)
- No LibreOffice windows currently open
- Test spreadsheet file available

### Step 1: Start LibreOffice in Socket Mode

**Option A: Use the helper script (Windows)**
```bash
cd packages/libreoffice-calc-mcp
START_LIBREOFFICE_HEADLESS.bat
```

**Option B: Manual start**
```bash
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck
```

### Step 2: Verify LibreOffice is Running

```bash
npm run test:libreoffice
```

Or check manually:
```bash
# Windows
tasklist | findstr soffice

# Check port 2002
netstat -an | findstr :2002
```

### Step 3: Start the LibreOffice MCP Proxy

```bash
cd packages/libreoffice-calc-mcp
START_LIBREOFFICE_PROXY.bat
```

You should see:
```
================================
  LibreOffice Calc MCP Proxy
  Local:  http://127.0.0.1:8081
================================

✓ LibreOffice detected (localhost:2002)
MCP HTTP Proxy listening on http://127.0.0.1:8081
```

### Step 4: Test the Connection

```bash
curl http://127.0.0.1:8081/health
```

Expected response:
```json
{"status":"ok","mcpRunning":true,"mcpInitialized":true,"authEnabled":false}
```

### Step 5: Test with Claude

1. Open Claude → **Settings** → **Connectors**
2. Add a new connector:
   - **Name**: `libreoffice-calc-mcp`
   - **URL**: `http://127.0.0.1:8081/messages`
3. Test with a prompt:
   > "Read C:\Users\YOUR_USERNAME\Documents\test.ods and tell me what's in cell A1"

### Step 6: Stop Everything

```bash
# Press Ctrl+C in the proxy window

# Stop LibreOffice
cd packages/libreoffice-calc-mcp
stop.bat
# Or use Task Manager to end soffice.exe
```

---

## Combined OAuth + LibreOffice Testing

### Setup: Secure LibreOffice MCP with OAuth

**1. Configure environment variables** (see OAuth section above)

**2. Start LibreOffice in socket mode**
```bash
cd packages/libreoffice-calc-mcp
START_LIBREOFFICE_HEADLESS.bat
```

**3. Start the proxy with OAuth enabled**
```bash
cd packages/mcp-http-proxy
node src/cli.js -c ../examples/oauth-libreoffice.config.js
```

**4. Test the secured flow**
- Visit `http://127.0.0.1:8081/health` → Should work (public endpoint)
- Visit `http://127.0.0.1:8081/auth/login` → GitHub OAuth flow
- After login, LibreOffice MCP tools are accessible

**5. Add to Claude with authentication**
- URL: `http://127.0.0.1:8081/messages`
- First request will be redirected to login
- After authentication, requests work normally

---

## Troubleshooting

### LibreOffice Won't Start in Socket Mode

**Problem**: `START_LIBREOFFICE_HEADLESS.bat` flashes and closes, LibreOffice doesn't run.

**Solutions**:
1. Close all LibreOffice windows first
2. Check if soffice.exe is already running:
   ```bash
   tasklist | findstr soffice
   ```
3. If running, end the process and try again
4. Verify LibreOffice is installed in the default location

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE: address already in use`

**Solutions**:
```bash
# Find what's using the port
netstat -ano | findstr :8080

# Kill the process (replace <PID> with actual PID)
taskkill /PID <PID> /F
```

### OAuth Callback Fails

**Problem**: Redirect doesn't work after GitHub authorization

**Solutions**:
1. Verify callback URL in GitHub OAuth app matches exactly
2. Check that SESSION_SECRET is set in `.env`
3. Ensure the proxy is running on the expected port

### "LibreOffice Not Detected"

**Problem**: Proxy says LibreOffice not detected

**Solutions**:
1. Verify soffice.exe is running (Task Manager)
2. Check port 2002 is listening:
   ```bash
   netstat -an | findstr :2002
   ```
3. Try restarting LibreOffice with the batch file
4. Check firewall isn't blocking the connection

### Tests Skip OAuth

**Problem**: `npm run test:oauth` skips all tests

**Solutions**:
1. Verify `.env` file exists in project root
2. Check that GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and SESSION_SECRET are set
3. Ensure values are not placeholders

---

## Test Checklist

Use this checklist when testing:

### OAuth 2.0 Tests
- [ ] GitHub OAuth app created
- [ ] `.env` file configured with credentials
- [ ] Proxy starts with `authEnabled: true`
- [ ] `/health` endpoint is public (works without auth)
- [ ] Protected routes return 401 without auth
- [ ] `/auth/login` redirects to GitHub
- [ ] Callback redirects and creates session
- [ ] `/auth/me` returns user info when logged in
- [ ] `/auth/logout` clears the session
- [ ] Automated OAuth tests pass

### LibreOffice Tests
- [ ] LibreOffice is installed
- [ ] `START_LIBREOFFICE_HEADLESS.bat` starts soffice.exe
- [ ] soffice.exe visible in Task Manager
- [ ] Port 2002 is listening
- [ ] Proxy detects LibreOffice connection
- [ ] `/health` returns `mcpRunning: true`
- [ ] Can read spreadsheet cells via Claude
- [ ] Can write spreadsheet cells via Claude
- [ ] Automated LibreOffice tests pass

### Combined Tests
- [ ] LibreOffice + OAuth both enabled
- [ ] Health endpoint remains public
- [ ] MCP endpoints require authentication
- [ ] Can use LibreOffice tools after login
- [ ] Session persists across requests
- [ ] Logout prevents access to MCP tools

---

## Additional Resources

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [GitHub OAuth Apps Guide](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Passport.js Documentation](http://www.passportjs.org/)
- [LibreOffice Scripting Framework](https://wiki.documentfoundation.org/Documentation/DevGuide)
