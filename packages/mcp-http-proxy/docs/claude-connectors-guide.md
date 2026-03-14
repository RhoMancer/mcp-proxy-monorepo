# Claude Connectors Setup Guide

This guide explains how to configure MCP servers with OAuth authentication for use with **Claude Connectors** in the Claude web app.

## Table of Contents

- [Overview](#overview)
- [OAuth Provider Mode](#oauth-provider-mode)
- [Configuration Examples](#configuration-examples)
- [Testing Your Setup](#testing-your-setup)
- [Troubleshooting](#troubleshooting)

## Overview

Claude Connectors allows you to connect Claude to custom MCP servers. The mcp-proxy supports two authentication modes:

| Mode | Configuration | Use Case |
|------|--------------|----------|
| **No Auth** | No `auth` or `oauthProvider` | Local development, trusted networks |
| **OAuth Provider** | `oauthProvider` config | Secure access with client credentials |
| **OAuth 2.0** | `auth` config | User authentication via GitHub/Google/etc |

For Claude Connectors, **OAuth Provider mode** is recommended as it provides secure authentication without requiring user login redirects.

> **Note: Local vs Tunnel Mode**
>
> This guide is for **OAuth Provider mode (tunnel access)** when using Claude.ai Connectors with external HTTPS access via Cloudflare Tunnel.
>
> If you're using **Claude Code CLI** for local development, you should use **Local Mode (no auth)** instead. See the main [README](../README.md#local-development-mode) for the Local Development Mode quick start.
>
> **Key differences:**
> - **Local Mode**: No authentication, localhost only, for Claude Code CLI
> - **Tunnel Mode (OAuth Provider)**: Client credentials authentication, external HTTPS access, for Claude.ai Connectors

## OAuth Provider Mode

OAuth Provider mode enables your mcp-proxy to validate OAuth client credentials and issue JWT access tokens. Claude Connectors will:

1. Send client credentials to `/auth/token`
2. Receive a JWT access token
3. Include the token in subsequent requests via `Authorization: Bearer` header

### Quick Setup

**Before you start: Decide if you need tunnel access**

- **Using Claude.ai Connectors (web app)**: You're in the right place — follow this guide for OAuth Provider mode
- **Using Claude Code CLI (local development)**: Use Local Mode instead — see [README Local Development Mode](../README.md#local-development-mode) for simpler setup without authentication

---

1. **Generate a secure OAuth client secret**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

2. **Add the secret to your `.env` file**:
   ```bash
   OAUTH_CLIENT_SECRET=<your-generated-secret-here>
   ```
   > **⚠️ SECURITY**: NEVER use placeholder values like `hevy-secret-key-change-me` or `libre-secret-key-change-me` in production. These are examples only.

3. **Create a configuration file** (`claude-connectors.config.js`):

   ```js
   export default {
     mcp: {
       command: 'npx',
       args: ['-y', 'your-mcp-server'],
       env: {
         // Environment variables for your MCP server
         API_KEY: process.env.YOUR_API_KEY
       }
     },
     server: {
       port: 8080,
       host: '127.0.0.1'
     },
     oauthProvider: {
       // Uses the secure secret from .env
       defaultSecret: process.env.OAUTH_CLIENT_SECRET
     }
   };
   ```

4. **Start the proxy**:
   ```bash
   cd packages/mcp-http-proxy
   node src/cli.js -c ../examples/claude-connectors-your-server.config.js
   ```

5. **Add to Claude Connectors**:
   - Open Claude web app
   - Go to "Add custom connector" (Beta feature)
   - Fill in:
     - **Name**: Your choice (e.g., "Hevy Workout Tracker")
     - **Remote MCP server URL**: `http://127.0.0.1:8080/message`
     - **OAuth Client ID**: Any identifier (e.g., "claude-client")
     - **OAuth Client Secret**: Must match your `OAUTH_CLIENT_SECRET` value from `.env`

### Tunnel vs Local Configuration Comparison

**LOCAL MODE (Claude Code CLI)** — No authentication, localhost only:

```js
// local.config.js
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
  // NO auth, NO oauthProvider, NO tunnel
};
```

**TUNNEL MODE (Claude.ai Connectors)** — OAuth Provider authentication, external HTTPS:

```js
// tunnel.config.js
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
  },
  tunnel: {
    domain: 'your-domain.dev',
    tunnelId: 'your-tunnel-id'
  },
  oauthProvider: {
    defaultSecret: process.env.OAUTH_CLIENT_SECRET
  }
};
```

**Key differences:**
| Aspect | Local Mode | Tunnel Mode |
|--------|------------|-------------|
| Authentication | None | OAuth Provider |
| Access | localhost only | External via HTTPS |
| Use case | Claude Code CLI | Claude.ai Connectors |
| Tunnel required | No | Yes (Cloudflare Tunnel) |

## Configuration Examples

### Hevy Workout Tracker

**Configuration**: `examples/claude-connectors-hevy.config.js`

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  },
  server: {
    port: 8082,
    host: '127.0.0.1'
  },
  tunnel: {
    domain: 'hevy.angussoftware.dev',
    tunnelId: 'e02235fc-0f81-42c7-b997-ec10be64c5ba'
  },
  oauthProvider: {
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'hevy-secret-key-change-me'
  }
};
```

**`.env` setup**:
```bash
HEVY_API_KEY=your_hevy_api_key
OAUTH_CLIENT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
```

**Quick start with tunnel**:
```bash
cd packages/mcp-http-proxy
.\START_HEVY_WITH_TUNNEL.bat
```

**Claude Connectors settings**:
| Field | Value |
|-------|-------|
| Name | Hevy Workout Tracker |
| Remote MCP server URL | `https://hevy.angussoftware.dev/message` (HTTPS with tunnel) |
| Authorization Endpoint | `https://hevy.angussoftware.dev/oauth/authorize` |
| Token Endpoint | `https://hevy.angussoftware.dev/oauth/token` |
| OAuth Client ID | `claude-hevy-client` (or any value) |
| OAuth Client Secret | Use your `OAUTH_CLIENT_SECRET` from `.env` |

### LibreOffice Calc

**Configuration**: `examples/claude-connectors-libreoffice.config.js`

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'libreoffice-calc-mcp'],
    env: {
      LIBREOFFICE_HOST: process.env.LIBREOFFICE_HOST || 'localhost',
      LIBREOFFICE_PORT: process.env.LIBREOFFICE_PORT || '2002'
    }
  },
  server: {
    port: 8081,
    host: '127.0.0.1'
  },
  oauthProvider: {
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'libre-secret-key-change-me'
  }
};
```

**`.env` setup**:
```bash
OAUTH_CLIENT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))">
```

**Claude Connectors settings**:
| Field | Value |
|-------|-------|
| Name | LibreOffice Calc |
| Remote MCP server URL | `http://127.0.0.1:8081/message` |
| OAuth Client ID | `claude-libreoffice-client` |
| OAuth Client Secret | Use your `OAUTH_CLIENT_SECRET` from `.env` |

### Multiple Clients

If you need different credentials for different applications:

```js
oauthProvider: {
  allowedClients: [
    {
      clientId: 'claude-connectors',
      clientSecret: 'secret-for-claude',
      name: 'Claude Connectors'
    },
    {
      clientId: 'my-other-app',
      clientSecret: 'different-secret',
      name: 'My Other Application'
    }
  ],
  tokenExpiration: 24 * 60 * 60 * 1000
}
```

## Testing Your Setup

### Starting with Cloudflare Tunnel (Recommended for External Access)

For HTTPS access (required for Claude Connectors from the web), use the provided batch scripts:

```bash
cd packages/mcp-http-proxy
.\START_HEVY_WITH_TUNNEL.bat
```

This script:
1. Starts the MCP HTTP Proxy with your configuration
2. Starts Cloudflare Tunnel using `config.yml`
3. Routes traffic from your domain to `localhost:8082`

The `config.yml` file contains:
- Your tunnel ID
- Credentials file location (gitignored)
- Ingress routing rules

> **Note**: The `config.yml` file is gitignored for security. Create your own by following the Cloudflare Tunnel setup guide in the main README.

To stop the tunnel:
```bash
.\STOP_PROXY_AND_TUNNEL.bat
```

### 1. Check Health Endpoint

```bash
curl http://127.0.0.1:8080/health
```

Expected response:
```json
{
  "status": "ok",
  "oauthProviderEnabled": true,
  "mcpRunning": true
}
```

### 2. Test Token Endpoint

```bash
curl -X POST http://127.0.0.1:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "test-client",
    "client_secret": "your-secret-key"
  }'
```

Expected response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "scope": "mcp:all"
}
```

### 3. Test Protected Endpoint with Token

```bash
# Replace ACCESS_TOKEN with the token from step 2
curl http://127.0.0.1:8080/tools \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

### 4. Test Token Introspection

```bash
curl -X POST http://127.0.0.1:8080/auth/introspect \
  -H "Content-Type: application/json" \
  -d '{"token": "ACCESS_TOKEN"}'
```

Expected response:
```json
{
  "active": true,
  "scope": "mcp:all",
  "client_id": "test-client",
  "exp": 1234567890,
  "iat": 1234567890
}
```

## Troubleshooting

### "Unauthorized" Error in Claude Connectors

1. **Verify the proxy is running**:
   ```bash
   curl http://127.0.0.1:8080/health
   ```

2. **Check OAuth credentials match**:
   - The `OAuth Client Secret` in Claude must match your `defaultSecret` or an `allowedClients` entry

3. **Test token endpoint manually**:
   ```bash
   curl -X POST http://127.0.0.1:8080/auth/token \
     -H "Content-Type: application/json" \
     -d '{"grant_type": "client_credentials", "client_id": "test", "client_secret": "your-secret"}'
   ```

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :8080

# macOS/Linux
lsof -i :8080
```

Use a different port in your configuration if needed.

### MCP Process Not Starting

Check that:
1. The MCP server is installed: `npx -y your-mcp-server`
2. Required environment variables are set
3. The command and args are correct

### Token Expired

Tokens expire after 24 hours by default. Claude Connectors should automatically request a new token when needed. If not, check the proxy logs for errors.

## Security Best Practices

1. **Use strong secrets** - Generate random secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
2. **NEVER use placeholder values** - Values like `hevy-secret-key-change-me` are for documentation only. Always use a generated secret in production.
3. **Use environment variables** - Never commit secrets to git (`.env` is gitignored)
4. **Use HTTPS in production** - Use Cloudflare Tunnel or similar for secure external access
5. **Set appropriate token expiration** - Balance security and user experience
6. **Rotate secrets periodically** - Change client secrets regularly

## Advanced Configuration

### Custom Token Expiration

```js
oauthProvider: {
  defaultSecret: 'your-secret',
  tokenExpiration: 12 * 60 * 60 * 1000  // 12 hours
}
```

### Multiple Connectors on Different Ports

You can run multiple MCP servers simultaneously by using different ports:

| Server | Port | Config File |
|--------|------|-------------|
| Hevy | 8082 | `claude-connectors-hevy.config.js` |
| LibreOffice | 8081 | `claude-connectors-libreoffice.config.js` |
| Custom | 8083 | Your config |

Start each proxy in a separate terminal.

## Additional Resources

- [Main README](../README.md)
- [OAuth 2.0 Setup Guide](oauth-setup-guide.md)
- [Example Configurations](../examples/)
