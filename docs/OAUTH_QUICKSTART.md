# OAuth Quick Start

Fastest way to test OAuth Provider mode with MCP Proxy.

## 5-Minute Setup

```bash
# 1. Create GitHub OAuth App (30 seconds)
#    Go to: https://github.com/settings/developers
#    Homepage: http://127.0.0.1:8080
#    Callback: http://127.0.0.1:8080/auth/callback

# 2. Configure environment (30 seconds)
cd packages/mcp-http-proxy
cat > .env << 'EOF'
GITHUB_CLIENT_ID=<your_client_id>
GITHUB_CLIENT_SECRET=<your_client_secret>
OAUTH_CLIENT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
EOF

# 3. Start proxy (1 minute)
npx mcp-proxy --config examples/echo-oauth-test.config.js

# 4. Test in browser (2 minutes)
#    - Open: http://127.0.0.1:8080/health
#    - Open: http://127.0.0.1:8080/auth/login
#    - Complete GitHub OAuth
#    - Open: http://127.0.0.1:8080/tools (should see tools!)
```

## That's It!

You now have OAuth-protected MCP proxy running with the Echo Test Server.

**What this gives you:**
- ✅ OAuth authentication via GitHub
- ✅ Protected MCP endpoints
- ✅ Test tools: echo, ping, get_time, sum
- ✅ Ready for Claude Connectors integration

**For detailed testing, see:** `docs/OAUTH_TESTING_GUIDE.md`
