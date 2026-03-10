# 🚀 Daily Quickstart Guide

**Start the Hevy MCP connector for Claude Connectors in ONE command.**

---

## 🎯 The Only Command You Need

```bash
.\start-tunnel.bat
```

**What this command does:**

1. **Starts the MCP Proxy** (port 8082) — Handles OAuth authentication and communicates with the Hevy API
2. **Starts the Cloudflare Tunnel** — Creates a secure HTTPS connection from `hevy.angussoftware.dev` to your local machine
3. **Routes traffic** — Forwards requests from Claude → Cloudflare → Your local proxy → Hevy API

> **Keep this window open** while using Claude Connectors.

---

## ✅ Verify It's Working

Once started, check health:
```bash
curl https://hevy.angussoftware.dev/health
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
| **Remote MCP server URL** | `https://hevy.angussoftware.dev/message` |
| **Authorization Endpoint** | `https://hevy.angussoftware.dev/oauth/authorize` |
| **Token Endpoint** | `https://hevy.angussoftware.dev/oauth/token` |
| **OAuth Client ID** | `claude-hevy-client` |
| **OAuth Client Secret** | **See `.env` file → `OAUTH_CLIENT_SECRET`** |

3. Click **Add** — you're connected!

> **💡 Finding your secret:** Open `.env` in this directory and copy the value after `OAUTH_CLIENT_SECRET=`

---

## 🛑 When Done

Close the terminal window, or run:
```bash
.\stop.bat
```

---

## 📋 What's Happening Behind the Scenes

The `start-tunnel.bat` script does three things:

1. **Starts MCP Proxy** (port 8082) - Handles OAuth and talks to Hevy API
2. **Starts Cloudflare Tunnel** - Bridges internet → your local machine
3. **Routes traffic** - `hevy.angussoftware.dev` → `localhost:8082`

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

**Fix:** Check your `.env` file in this directory and copy the `OAUTH_CLIENT_SECRET` value exactly into Claude.

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
