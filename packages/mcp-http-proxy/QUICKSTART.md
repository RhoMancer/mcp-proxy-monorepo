# 🚀 Daily Quickstart Guide

**Start the Hevy MCP connector for Claude Connectors.**

## 📋 First-Time Setup

Before starting, create your `.env` file:

```bash
# From the repo root:
cp packages/mcp-http-proxy/.env.example packages/mcp-http-proxy/.env
```

Then edit `packages/mcp-http-proxy/.env` and add:
- Your **Hevy API Key** (get from [hevy.app](https://hevy.app/api))
- Generate an **OAuth Client Secret**: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- Your **Cloudflare Tunnel Domain** (e.g., `your-domain.example.com`)

> **📌 Note:** This guide uses `your-domain.example.com` as a placeholder. Replace it with your actual Cloudflare Tunnel domain. See [Cloudflare Tunnel Setup](#-cloudflare-tunnel-setup) below.

---

---

## 🎯 Easiest Way (From Anywhere)

Go to the repo root and double-click:
```
START_HEVY_CONNECTOR.bat    ← Start
STOP_HEVY_CONNECTOR.bat     ← Stop
```

---

## 🎯 From This Directory

```bash
.\start-tunnel.bat
```

**What this command does:**

1. **Starts the MCP Proxy** (port 8082) — Handles OAuth authentication and communicates with the Hevy API
2. **Starts the Cloudflare Tunnel** — Creates a secure HTTPS connection from `your-domain.example.com` to your local machine
3. **Routes traffic** — Forwards requests from Claude → Cloudflare → Your local proxy → Hevy API

> **Keep this window open** while using Claude Connectors.

---

## ✅ Verify It's Working

Once started, check health:
```bash
curl https://your-domain.example.com/health
```

Expected response:
```json
{
  "status": "ok",
  "oauthProviderEnabled": true,
  "mcpRunning": true
}
```

---

## 🔗 Connect in Claude Web App

1. Open **claude.ai** → **Add custom connector** (Beta feature)

2. Fill in these values:

| Field | Value |
|-------|-------|
| **Name** | Hevy Workout Tracker |
| **Remote MCP server URL** | `https://your-domain.example.com/message` |
| **Authorization Endpoint** | `https://your-domain.example.com/oauth/authorize` |
| **Token Endpoint** | `https://your-domain.example.com/oauth/token` |
| **OAuth Client ID** | `claude-hevy-client` |
| **OAuth Client Secret** | **See `.env` file → `OAUTH_CLIENT_SECRET`** |

3. Click **Add** — you're connected!

> **💡 Finding your secret:** The `.env` file is in this directory: `packages/mcp-http-proxy/.env`
>
> If it doesn't exist, copy it from the example:
> ```bash
> cp packages/mcp-http-proxy/.env.example packages/mcp-http-proxy/.env
> ```
>
> Then edit `.env` and copy the value after `OAUTH_CLIENT_SECRET=`

---

## 🛑 When Done

**Option 1:** Double-click `STOP_HEVY_CONNECTOR.bat` (from repo root)

**Option 2:** Run from this directory:
```bash
.\stop.bat
```

**Option 3:** Just close the terminal windows

---

## 📋 What's Happening Behind the Scenes

The `start-tunnel.bat` script does three things:

1. **Starts MCP Proxy** (port 8082) - Handles OAuth and talks to Hevy API
2. **Starts Cloudflare Tunnel** - Bridges internet → your local machine
3. **Routes traffic** - `your-domain.example.com` → `localhost:8082`

```
┌─────────────────┐     HTTPS      ┌──────────────┐     HTTP     ┌─────────┐
│ Claude Connectors│ ─────────────►│ Cloudflare   │ ───────────►│  Proxy  │
│  (claude.ai)     │                │   Tunnel     │              │ :8082   │
└─────────────────┘                └──────────────┘              └─────────┘
                                                                         │
                                                                         ▼
                                                                  ┌──────────┐
                                                                  │ Hevy API │
                                                                  └──────────┘
```

---

## 🔧 Troubleshooting

### "Connection refused" or "Tunnel error"

**Problem:** Tunnel isn't running.

**Fix:** Make sure you ran `.\start-tunnel.bat` and see the Cloudflare output.

---

### "Unauthorized" in Claude

**Problem:** OAuth secret doesn't match.

**Fix:** Check your `.env` file in `packages/mcp-http-proxy/.env` and copy the `OAUTH_CLIENT_SECRET` value exactly into Claude.

If the `.env` file doesn't exist, create it from the example:
```bash
cp packages/mcp-http-proxy/.env.example packages/mcp-http-proxy/.env
```

---

### Port 8082 already in use

**Problem:** Another instance is running.

**Fix:**
```bash
# Find what's using the port
netstat -ano | findstr :8082

# Kill it if needed (replace PID with actual process ID)
taskkill /PID <PID> /F
```

---

## 🌐 Cloudflare Tunnel Setup

This guide uses `your-domain.example.com` as a placeholder. To use your own domain:

### 1. Create a Cloudflare Tunnel

```bash
# Install cloudflared
# Windows: Download from https://github.com/cloudflare/cloudflared/releases

# Authenticate
cloudflared tunnel login

# Create a tunnel
cloudflared tunnel create hevy-mcp-tunnel

# Note your tunnel ID from the output
```

### 2. Configure the Tunnel

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: ~/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: your-domain.example.com
    service: http://localhost:8082
  - service: http_status:404
```

### 3. Add DNS Record

```bash
cloudflared tunnel route dns hevy-mcp-tunnel your-domain.example.com
```

### 4. Update Your Config

Replace `your-domain.example.com` throughout this guide with your actual domain.

---

## 📚 Additional Resources

- [Full Documentation](README.md)
- [OAuth Setup Guide](docs/oauth-setup-guide.md)
- [Claude Connectors Guide](docs/claude-connectors-guide.md)

---

## ⚠️ Important Reminders

- ✅ **Your OAuth secret is in:** `.env` file → `OAUTH_CLIENT_SECRET`
- ✅ **.env file is gitignored** — Your secrets are safe from git
- ✅ **Tunnel must stay running** — Don't close the window while using Claude
- ⚠️ **NEVER commit .env** — Contains your Hevy API key and OAuth secret
