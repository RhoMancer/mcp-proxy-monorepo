# MCP HTTP Proxy

A generic HTTP-to-stdio proxy for any [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server. This allows stdio-based MCP servers to work with AI clients that require HTTP endpoints.

---

## 🚀 **NEW HERE? START HERE** 🚀

**→ [QUICKSTART.md](QUICKSTART.md)** — Daily setup guide for Hevy MCP connector

**One command to run everything:**
```bash
.\start-tunnel.bat
```

---

- 🔄 **Universal compatibility** - Works with any stdio-based MCP server
- 🌐 **HTTP endpoints** - Exposes MCP servers via HTTP/HTTPS
- 🔧 **Configuration-driven** - Simple config file for each MCP server
- 🚀 **Zero dependencies on the MCP server** - No need to modify server code
- 📡 **Cloudflare Tunnel ready** - Easy HTTPS tunneling support
- 🔒 **OAuth 2.0 authentication** - Secure access with OAuth providers (GitHub, Google, etc.)
- 🔑 **OAuth Provider mode** - Act as an OAuth provider for Claude Connectors
- 🔐 **User/domain restrictions** - Limit access to specific users or email domains
- 🔒 **CORS enabled** - Works with browser-based clients

## Quick Start

### Installation

```bash
npm install mcp-http-proxy
```

### Create a Config File

Create `mcp.config.js` in your project:

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

### Start the Proxy

```bash
npx mcp-proxy
# or with a custom config
npx mcp-proxy --config my-config.js
```

## Authentication Modes

The proxy supports **three mutually exclusive authentication modes**. The mode is automatically determined by which configuration section you include:

### Decision Tree: Which Mode Should I Use?

```
┌─────────────────────────────────────────────────────────────────┐
│                    Do you need authentication?                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
               NO                          YES
                │                           │
                │                           ▼
                │              ┌─────────────────────────────────┐
                │              │ Using Claude Connectors (Beta)? │
                │              └─────────────────────────────────┘
                │                           │
                │              ┌─────────────┴─────────────┐
                │              │                           │
                │             YES                          NO
                │              │                           │
                │              ▼                           ▼
                │    ┌──────────────────┐      ┌──────────────────┐
                │    │ OAuth Provider   │      │ OAuth 2.0        │
                │    │ Mode             │      │ Redirect Mode    │
                │    │ (oauthProvider)  │      │ (auth)           │
                │    └──────────────────┘      └──────────────────┘
                │              │                           │
                ▼              ▼                           ▼
    ┌───────────────┐  Clients use           Users redirect to
    │ No Auth Mode  │  client_id/secret      GitHub/Google/etc
    │ (no config)   │  to get JWT token      to authenticate
    └───────────────┘
```

### Mode 1: No Authentication (Default)

**Use when:** Development, local testing, or running in a trusted network.

**Config:** No `auth` or `oauthProvider` section needed.

```js
export default {
  mcp: { /* ... */ },
  server: { port: 8080 }
  // No auth section = open access
};
```

### Mode 2: OAuth 2.0 Redirect Mode (`auth`)

**Use when:** You want users to authenticate via GitHub, Google, Auth0, etc.

**How it works:** Users visit `/auth/login`, get redirected to OAuth provider, then back to your proxy with a session.

**Config:**

```js
export default {
  mcp: { /* ... */ },
  server: { port: 8080 },
  auth: {
    provider: {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8080/auth/callback',
      scope: 'user:email'
    },
    session: {
      secret: process.env.SESSION_SECRET
    },
    allowedUsers: ['user@example.com'],  // Optional
    allowedDomains: ['example.com']      // Optional
  }
};
```

**Examples:** `examples/oauth-github.config.js`, `examples/oauth-google.config.js`, `examples/oauth-auth0.config.js`

### Mode 3: OAuth Provider Mode (`oauthProvider`)

**Use when:** Using Claude Connectors (Beta feature) which requires OAuth client credentials flow.

**How it works:** Clients (like Claude) send `client_id` and `client_secret` to receive a JWT token for API access.

**Config:**

```js
export default {
  mcp: { /* ... */ },
  server: { port: 8080 },
  oauthProvider: {
    // Simple mode: any client_id works with this shared secret
    defaultSecret: process.env.OAUTH_CLIENT_SECRET,
    tokenExpiration: 24 * 60 * 60 * 1000  // 24 hours

    // OR multiple clients mode:
    // allowedClients: [
    //   { clientId: 'claude-connectors', clientSecret: 'secret123' },
    //   { clientId: 'another-app', clientSecret: 'secret456' }
    // ]
  }
};
```

**Examples:** `examples/claude-connectors-hevy.config.js`, `examples/claude-connectors-libreoffice.config.js`

### Important: Modes Are Mutually Exclusive

- Use **only one** of: `auth`, `oauthProvider`, or neither
- Do **not** include both `auth` and `oauthProvider` in the same config
- The proxy detects which mode to use based on which section exists

## Configuration

### Config File Structure

```js
export default {
  // MCP server configuration
  mcp: {
    command: string,      // Command to spawn (e.g., 'npx', 'node', 'python')
    args: string[],       // Arguments for the command
    env: object          // Environment variables (merged with process.env)
  },

  // HTTP server configuration
  server: {
    port: number,        // Port (default: 8080)
    host: string         // Host (default: '127.0.0.1')
  },

  // Cloudflare tunnel (optional)
  tunnel: {
    domain: string,      // Your custom domain
    tunnelId: string     // Cloudflare tunnel ID
  },

  // OAuth 2.0 authentication (optional - redirects to GitHub, Google, etc.)
  auth: {
    provider: {
      authorizationURL: string,  // OAuth authorization URL
      tokenURL: string,          // OAuth token URL
      clientID: string,          // OAuth client ID
      clientSecret: string,      // OAuth client secret
      callbackURL: string,       // OAuth callback URL
      scope?: string             // OAuth scope (optional)
    },
    session: {
      secret?: string,           // Session secret (or use secretEnvVar)
      secretEnvVar?: string,     // Env var containing session secret
      maxAge?: number            // Session max age in ms (default: 24h)
    },
    allowedUsers?: string[],     // Allowed user emails (optional)
    allowedDomains?: string[]    // Allowed email domains (optional)
  },

  // OAuth Provider mode (optional - for Claude Connectors)
  oauthProvider: {
    defaultSecret?: string,      // Shared secret for all clients (simple mode)
    allowedClients?: [           // Multiple clients with different secrets
      {
        clientId: string,        // Client ID
        clientSecret: string,    // Client secret
        name?: string            // Client name (optional)
      }
    ],
    tokenExpiration?: number     // Token expiration in ms (default: 24h)
  }
};
```

## Examples

### hevy-mcp

```js
// mcp.config.js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'hevy-mcp'],
    env: {
      HEVY_API_KEY: process.env.HEVY_API_KEY
    }
  }
};
```

### libreoffice-calc-mcp

```js
// mcp.config.js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'libreoffice-calc-mcp'],
    env: {
      LIBREOFFICE_PATH: 'C:/Program Files/LibreOffice/program/soffice.exe'
    }
  },
  server: {
    port: 8081  // Different port
  }
};
```

### Custom Node.js MCP Server

```js
// mcp.config.js
export default {
  mcp: {
    command: 'node',
    args: ['./my-mcp-server.js'],
    env: {
      CUSTOM_VAR: 'value'
    }
  }
};
```

### Python MCP Server

```js
// mcp.config.js
export default {
  mcp: {
    command: 'python',
    args: ['-m', 'my_mcp_server'],
    env: {
      API_KEY: process.env.API_KEY
    }
  }
};
```

## Endpoints

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/health` | GET | Health check | No |
| `/auth/login` | GET | Initiate OAuth login (OAuth 2.0 mode) | - |
| `/auth/callback` | GET | OAuth callback (OAuth 2.0 mode) | - |
| `/auth/token` | POST | Get access token (OAuth Provider mode) | - |
| `/auth/introspect` | POST | Validate token (OAuth Provider mode) | - |
| `/auth/me` | GET | Current user info | Yes* |
| `/auth/logout` | POST | Logout | Yes* |
| `/tools` | GET | List available MCP tools | Yes* |
| `/message` | POST | JSON-RPC endpoint | Yes* |
| `/messages` | POST | JSON-RPC endpoint (alias) | Yes* |
| `/sse` | GET | Server-Sent Events | Yes* |

*Authentication required only when OAuth is enabled in config.

## Using with Claude

### Without Authentication

1. Start the proxy:
   ```bash
   npx mcp-proxy
   ```

2. Add to Claude Connectors:
   - **Name**: Your MCP Server
   - **Remote MCP server URL**: `http://127.0.0.1:8080/message`

### With OAuth Provider Mode (Recommended for Claude Connectors)

OAuth Provider mode allows you to secure your MCP connector with OAuth credentials that you configure in Claude Connectors.

1. **Create a config with OAuth Provider mode** (`claude-connectors.config.js`):

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
     },
     oauthProvider: {
       // Simple mode: use a shared secret
       defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'your-secret-key-change-me',
       tokenExpiration: 24 * 60 * 60 * 1000  // 24 hours
     }
   };
   ```

2. **Start the proxy**:
   ```bash
   node src/cli.js -c claude-connectors.config.js
   ```

3. **Add to Claude Connectors**:
   - **Name**: Your MCP Server
   - **Remote MCP server URL**: `http://127.0.0.1:8080/message`
   - **OAuth Client ID**: `any-client-id` (or your preferred identifier)
   - **OAuth Client Secret**: `your-secret-key-change-me` (must match your config)

> **📖 See examples**: Complete configuration examples for Hevy and LibreOffice are available in `examples/claude-connectors-hevy.config.js` and `examples/claude-connectors-libreoffice.config.js`.

## Cloudflare Tunnel Setup (Optional)

For HTTPS access, set up a Cloudflare tunnel:

```bash
# Install cloudflared
# https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

# Create a tunnel
cloudflared tunnel create my-mcp-proxy

# Configure routing
cloudflared tunnel route dns my-mcp-proxy your-domain.example.com
```

Add tunnel config to `mcp.config.js`:
```js
tunnel: {
  domain: 'your-domain.example.com',
  tunnelId: 'your-tunnel-id'
}
```

## OAuth 2.0 Authentication

The proxy supports OAuth 2.0 authentication to secure access to your MCP servers. When enabled, users must authenticate before accessing MCP endpoints.

### Quick Setup with GitHub OAuth

1. **Create a GitHub OAuth App**:
   - Go to https://github.com/settings/developers
   - Click "New OAuth App"
   - Set:
     - Application name: `MCP Proxy`
     - Homepage URL: `http://127.0.0.1:8080`
     - Authorization callback URL: `http://127.0.0.1:8080/auth/callback`
   - Copy the Client ID and generate a Client Secret

2. **Create a `.env` file**:
   ```bash
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   SESSION_SECRET=a_long_random_string_use_openssl_rand_base64_32
   ```

3. **Update `mcp.config.js`**:
   ```js
   export default {
     mcp: {
       command: 'npx',
       args: ['-y', 'your-mcp-server']
     },
     server: {
       port: 8080
     },
     auth: {
       provider: {
         authorizationURL: 'https://github.com/login/oauth/authorize',
         tokenURL: 'https://github.com/login/oauth/access_token',
         clientID: process.env.GITHUB_CLIENT_ID,
         clientSecret: process.env.GITHUB_CLIENT_SECRET,
         callbackURL: 'http://127.0.0.1:8080/auth/callback',
         scope: 'user:email read:user'
       },
       session: {
         secretEnvVar: 'SESSION_SECRET'
       },
       // Optional: Restrict access to specific users
       allowedUsers: [
         'user@example.com'
       ]
     }
   };
   ```

4. **Start the proxy and authenticate**:
   ```bash
   npx mcp-proxy
   # Visit http://127.0.0.1:8080/auth/login to authenticate
   ```

### Supported OAuth Providers

The proxy works with any OAuth 2.0 provider. Example configurations are included for:

- **GitHub** - See `examples/oauth-github.config.js`
- **Google** - See `examples/oauth-google.config.js`
- **GitLab** - Similar to GitHub
- **Auth0** - See `examples/oauth-auth0.config.js`
- **Any OAuth 2.0 provider** - Provide the authorization/token URLs

> **📖 Detailed Setup Guide**: For step-by-step instructions on configuring OAuth with GitHub, Google, Auth0, GitLab, Azure AD, and more, see the [OAuth Provider Setup Guide](docs/oauth-setup-guide.md).

### Authentication Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/auth/login` | Initiate OAuth login |
| `/auth/callback` | OAuth callback handler |
| `/auth/me` | Get current user info |
| `/auth/logout` | Logout (POST) |

### Security Options

#### Restrict by Email Domain

```js
auth: {
  // ... provider config ...
  allowedDomains: ['example.com', 'mycompany.com']
}
```

#### Restrict by Specific Users

```js
auth: {
  // ... provider config ...
  allowedUsers: ['user@example.com', 'admin@example.com']
}
```

### Production Considerations

1. **Use HTTPS** - Always use HTTPS in production with `secure: true` cookies
2. **Strong Session Secret** - Use a cryptographically random secret (32+ bytes)
3. **Environment Variables** - Never commit secrets to git
4. **Session Expiration** - Set appropriate `maxAge` for your use case

```js
auth: {
  session: {
    secretEnvVar: 'SESSION_SECRET',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    secure: true  // Force secure cookies (HTTPS only)
  }
}
```

## OAuth Provider Mode (for Claude Connectors)

OAuth Provider mode enables the mcp-proxy to act as an OAuth provider, allowing clients like Claude Connectors to authenticate using OAuth client credentials. This is different from OAuth 2.0 redirect mode:

- **OAuth 2.0 mode** (`auth`): Users are redirected to GitHub, Google, etc. to authenticate
- **OAuth Provider mode** (`oauthProvider`): Clients send client_id/client_secret directly to get a JWT access token

### Quick Setup

1. **Create a config with OAuth Provider mode**:

   ```js
   // mcp.config.js
   export default {
     mcp: {
       command: 'npx',
       args: ['-y', 'your-mcp-server']
     },
     server: {
       port: 8080
     },
     oauthProvider: {
       // Simple mode: any client_id works with this secret
       defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'change-me-in-production'
     }
   };
   ```

2. **Start the proxy**:
   ```bash
   npx mcp-proxy --config mcp.config.js
   ```

3. **Configure Claude Connectors**:
   - **Name**: Your MCP Server
   - **Remote MCP server URL**: `http://127.0.0.1:8080/message`
   - **OAuth Client ID**: `any-identifier` (your choice)
   - **OAuth Client Secret**: `change-me-in-production` (must match config)

### Configuration Options

#### Simple Mode (Shared Secret)

All clients use the same secret:

```js
oauthProvider: {
  defaultSecret: 'shared-secret-key',
  tokenExpiration: 24 * 60 * 60 * 1000  // 24 hours
}
```

#### Multiple Clients Mode

Each client has unique credentials:

```js
oauthProvider: {
  allowedClients: [
    {
      clientId: 'claude-connectors',
      clientSecret: 'secret-for-claude',
      name: 'Claude Connectors'
    },
    {
      clientId: 'another-app',
      clientSecret: 'different-secret',
      name: 'Another Application'
    }
  ],
  tokenExpiration: 12 * 60 * 60 * 1000  // 12 hours
}
```

### OAuth Provider Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/token` | POST | Exchange client credentials for access token |
| `/auth/introspect` | POST | Validate an access token |
| `/auth/me` | GET | Get info about authenticated client |
| `/auth/logout` | POST | Revoke an access token |

#### Token Request Example

```bash
curl -X POST http://127.0.0.1:8080/auth/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "client_credentials",
    "client_id": "claude-connectors",
    "client_secret": "shared-secret-key"
  }'
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400,
  "scope": "mcp:all"
}
```

#### Using the Access Token

```bash
curl http://127.0.0.1:8080/tools \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Complete Example: Hevy MCP with OAuth Provider

See `examples/claude-connectors-hevy.config.js` for a complete configuration:

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
  oauthProvider: {
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'hevy-secret-key-change-me',
    tokenExpiration: 24 * 60 * 60 * 1000
  }
};
```

### Complete Example: LibreOffice Calc MCP with OAuth Provider

See `examples/claude-connectors-libreoffice.config.js` for a complete configuration:

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
    defaultSecret: process.env.OAUTH_CLIENT_SECRET || 'libre-secret-key-change-me',
    tokenExpiration: 24 * 60 * 60 * 1000
  }
};
```

## Troubleshooting

### Port already in use

```bash
# Find the process using the port
netstat -ano | findstr :8080  # Windows
lsof -i :8080                  # macOS/Linux

# Kill the process
taskkill /PID <PID> /F        # Windows
kill <PID>                     # macOS/Linux
```

### MCP process won't start

Check that:
1. The MCP server command is correct
2. Required environment variables are set
3. The MCP server is installed (`npx -y` helps here)

### Test the endpoint

```bash
# Health check
curl http://127.0.0.1:8080/health

# List tools
curl http://127.0.0.1:8080/tools
```

## License

MIT
