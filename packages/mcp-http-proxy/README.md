# MCP HTTP Proxy

A generic HTTP-to-stdio proxy for any [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server. This allows stdio-based MCP servers to work with AI clients that require HTTP endpoints.

## Features

- 🔄 **Universal compatibility** - Works with any stdio-based MCP server
- 🌐 **HTTP endpoints** - Exposes MCP servers via HTTP/HTTPS
- 🔧 **Configuration-driven** - Simple config file for each MCP server
- 🚀 **Zero dependencies on the MCP server** - No need to modify server code
- 📡 **Cloudflare Tunnel ready** - Easy HTTPS tunneling support
- 🔒 **OAuth 2.0 authentication** - Secure access with OAuth providers (GitHub, Google, etc.)
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

  // OAuth 2.0 authentication (optional)
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
| `/auth/login` | GET | Initiate OAuth login | - |
| `/auth/callback` | GET | OAuth callback | - |
| `/auth/me` | GET | Current user info | - |
| `/auth/logout` | POST | Logout | - |
| `/tools` | GET | List available MCP tools | Yes* |
| `/message` | POST | JSON-RPC endpoint | Yes* |
| `/messages` | POST | JSON-RPC endpoint (alias) | Yes* |
| `/sse` | GET | Server-Sent Events | Yes* |

*Authentication required only when OAuth is enabled in config.

## Using with Claude

1. Start the proxy:
   ```bash
   npx mcp-proxy
   ```

2. Add to Claude Connectors:
   - **Name**: Your MCP Server
   - **Remote MCP server URL**: `http://127.0.0.1:8080/message`

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
