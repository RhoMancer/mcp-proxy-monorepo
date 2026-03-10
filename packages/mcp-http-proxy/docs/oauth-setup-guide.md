# OAuth 2.0 Provider Setup Guide

This guide provides detailed step-by-step instructions for configuring OAuth 2.0 authentication with the MCP HTTP Proxy using common identity providers.

## Authentication Modes Overview

The MCP HTTP Proxy supports two authentication modes:

1. **OAuth 2.0 Mode** (`auth` config) - Users are redirected to GitHub, Google, etc. to authenticate. Use this for user-facing applications where you want to restrict access based on user identity.

2. **OAuth Provider Mode** (`oauthProvider` config) - The proxy acts as an OAuth provider, validating client credentials directly. Use this for [Claude Connectors](claude-connectors-guide.md) where Claude authenticates with client credentials.

> **For Claude Connectors setup**, see the [Claude Connectors Guide](claude-connectors-guide.md) instead of this guide.

This guide covers **OAuth 2.0 Mode** for user authentication.

## Table of Contents

- [GitHub OAuth](#github-oauth)
- [Google OAuth](#google-oauth)
- [Auth0](#auth0)
- [GitLab](#gitlab)
- [Azure Active Directory](#azure-active-directory)
- [Troubleshooting](#troubleshooting)

---

## GitHub OAuth

### Step 1: Create a GitHub OAuth App

1. Navigate to **Settings** → **Developer settings** → **OAuth Apps**
   - Direct link: https://github.com/settings/developers

2. Click **New OAuth App**

3. Fill in the application details:
   | Field | Value |
   |-------|-------|
   | Application name | `MCP Proxy` (or your preferred name) |
   | Homepage URL | `http://127.0.0.1:8080` |
   | Application description | Optional |
   | Authorization callback URL | `http://127.0.0.1:8080/auth/callback` |

4. Click **Register application**

5. On the next page, copy your **Client ID**

6. Click **Generate a new client secret** and copy it immediately (you won't see it again)

### Step 2: Configure Environment Variables

Create a `.env` file in your project root:

```bash
# GitHub OAuth Credentials
GITHUB_CLIENT_ID=ghp_your_client_id_here
GITHUB_CLIENT_SECRET=ghp_your_client_secret_here

# Session Secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your_long_random_session_secret_here
```

### Step 3: Create MCP Config

Create `mcp.config.js`:

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server']
  },
  server: {
    port: 8080,
    host: '127.0.0.1'
  },
  auth: {
    provider: {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8080/auth/callback',
      scope: ['user:email', 'read:user']
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000  // 24 hours
    }
  }
};
```

### Step 4: Test the Setup

```bash
# Load environment variables and start the proxy
npx mcp-proxy

# Visit the login page
open http://127.0.0.1:8080/auth/login
```

---

## Google OAuth

### Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one

### Step 2: Configure the OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (for testing) or **Internal** (for Google Workspace only)
3. Fill in the required fields:
   - App name: `MCP Proxy`
   - User support email: Your email
   - Developer contact: Your email
4. Click **Save and Continue** (you can skip scopes for now)
5. Add test users (required for External apps before verification)

### Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `MCP Proxy`
5. Authorized redirect URIs: Add `http://127.0.0.1:8080/auth/callback`
6. For production, also add your production URL: `https://your-domain.com/auth/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

### Step 4: Enable Required APIs

1. Navigate to **APIs & Services** → **Library**
2. Search for and enable:
   - Google+ API (legacy) OR People API (for user profile data)

### Step 5: Configure Environment Variables

Create a `.env` file:

```bash
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX_your_client_secret_here

# Session Secret
SESSION_SECRET=your_long_random_session_secret_here
```

### Step 6: Create MCP Config

Create `mcp.config.js`:

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server']
  },
  server: {
    port: 8080,
    host: '127.0.0.1'
  },
  auth: {
    provider: {
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8080/auth/callback',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000
    }
  }
};
```

### Step 7: Test the Setup

```bash
npx mcp-proxy
open http://127.0.0.1:8080/auth/login
```

---

## Auth0

### Step 1: Create an Auth0 Application

1. Go to the [Auth0 Dashboard](https://manage.auth0.com/dashboard/)
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Name: `MCP Proxy`
5. Application type: **Regular Web Applications**
6. Click **Create**

### Step 2: Configure Application Settings

1. Go to the **Settings** tab of your application
2. Configure the following:
   | Field | Value |
   |-------|-------|
   | Application Callback URLs | `http://127.0.0.1:8080/auth/callback` |
   | Allowed Logout URLs | `http://127.0.0.1:8080` |
   | Allowed Web Origins | `http://127.0.0.1:8080` |
   | Allowed Origins (CORS) | `http://127.0.0.1:8080` |

3. For production, add your production URLs:
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com`

4. Scroll down to **Advanced Settings** → **Grant Types**
5. Ensure **Authorization Code** is enabled

6. Click **Save Changes**

### Step 3: Get Your Credentials

From the **Settings** tab, note:
- **Domain**: Your Auth0 tenant domain (e.g., `your-tenant.auth0.com`)
- **Client ID**: Copy this value
- **Client Secret**: Click to reveal and copy

### Step 4: Configure Environment Variables

Create a `.env` file:

```bash
# Auth0 Credentials
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_CLIENT_ID=your_auth0_client_id
AUTH0_CLIENT_SECRET=your_auth0_client_secret

# Session Secret
SESSION_SECRET=your_long_random_session_secret_here
```

### Step 5: Create MCP Config

Create `mcp.config.js`:

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server']
  },
  server: {
    port: 8080,
    host: '127.0.0.1'
  },
  auth: {
    provider: {
      // Auth0 uses your domain for all endpoints
      authorizationURL: `https://${process.env.AUTH0_DOMAIN}/authorize`,
      tokenURL: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      userInfoURL: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8080/auth/callback',
      scope: ['openid', 'profile', 'email']
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000
    }
  }
};
```

### Step 6: Configure Social Connections (Optional)

To allow users to sign in with Google, GitHub, etc.:

1. Navigate to **Authentication** → **Social**
2. Enable the desired connections (Google, GitHub, etc.)
3. Each connection must be configured with your provider credentials

### Step 7: Test the Setup

```bash
npx mcp-proxy
open http://127.0.0.1:8080/auth/login
```

---

## GitLab

### Step 1: Create a GitLab Application

1. Go to **User Settings** → **Applications** in GitLab
   - Direct link: https://gitlab.com/-/user_settings/applications

2. Fill in the form:
   | Field | Value |
   |-------|-------|
   | Name | `MCP Proxy` |
   | Redirect URI | `http://127.0.0.1:8080/auth/callback` |
   | Scopes | Check `read_user`, `email` |

3. Click **Save application**

4. Copy the **Application ID** and **Secret**

### Step 2: Configure Environment Variables

```bash
GITLAB_CLIENT_ID=your_gitlab_application_id
GITLAB_CLIENT_SECRET=your_gitlab_secret
SESSION_SECRET=your_long_random_session_secret_here
```

### Step 3: Create MCP Config

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server']
  },
  server: {
    port: 8080,
    host: '127.0.0.1'
  },
  auth: {
    provider: {
      authorizationURL: 'https://gitlab.com/oauth/authorize',
      tokenURL: 'https://gitlab.com/oauth/token',
      clientID: process.env.GITLAB_CLIENT_ID,
      clientSecret: process.env.GITLAB_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8080/auth/callback',
      scope: ['read_user', 'email']
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000
    }
  }
};
```

---

## Azure Active Directory

### Step 1: Register an Application in Azure AD

1. Go to the [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Name: `MCP Proxy`
5. Supported account types: Choose based on your needs
6. Redirect URI: Web → `http://127.0.0.1:8080/auth/callback`
7. Click **Register**

### Step 2: Configure Authentication

1. Go to **Authentication** in your app
2. Add a platform → **Web**
3. Redirect URIs: `http://127.0.0.1:8080/auth/callback`
4. Check **ID tokens** (for implicit flow if needed)
5. Click **Save**

### Step 3: Get Credentials

1. Go to **Overview** and copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**

2. Go to **Certificates & secrets** → **Client secrets**
3. Click **New client secret**
4. Copy the **Value** immediately (you won't see it again)

### Step 4: Configure Environment Variables

```bash
AZURE_CLIENT_ID=your_azure_application_id
AZURE_CLIENT_SECRET=your_azure_client_secret
AZURE_TENANT_ID=your_tenant_id_or_common
SESSION_SECRET=your_long_random_session_secret_here
```

### Step 5: Create MCP Config

```js
export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server']
  },
  server: {
    port: 8080,
    host: '127.0.0.1'
  },
  auth: {
    provider: {
      authorizationURL: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
      userInfoURL: `https://graph.microsoft.com/v1.0/me`,
      clientID: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8080/auth/callback',
      scope: ['User.Read', 'email']
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000
    }
  }
};
```

**Note:** For multi-tenant apps, use `common` as the tenant ID. For single-tenant, use your specific tenant ID.

---

## Restricting Access

### By Email Domain

Restrict access to users from specific domains:

```js
auth: {
  // ... provider config ...
  allowedDomains: ['company.com', 'partner.org']
}
```

### By Specific Users

Restrict access to specific email addresses:

```js
auth: {
  // ... provider config ...
  allowedUsers: ['admin@company.com', 'user@company.com']
}
```

You can use both together - a user must match at least one allowed user OR belong to an allowed domain.

---

## Production Deployment

### HTTPS and Secure Cookies

When deploying to production:

```js
auth: {
  provider: {
    // Update callback URL to use HTTPS
    callbackURL: 'https://your-domain.com/auth/callback',
    // ... rest of config
  },
  session: {
    secretEnvVar: 'SESSION_SECRET',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
    secure: true  // Force secure cookies (HTTPS only)
  }
}
```

### Environment-Specific Config

Use environment variables for all URLs:

```js
const isProduction = process.env.NODE_ENV === 'production';

export default {
  // ... mcp config ...
  auth: {
    provider: {
      callbackURL: isProduction
        ? `https://${process.env.DOMAIN}/auth/callback`
        : 'http://127.0.0.1:8080/auth/callback',
      // ... rest of config
    },
    session: {
      secure: isProduction,
      // ... rest of config
    }
  }
};
```

---

## Troubleshooting

### Common Errors

#### `redirect_uri_mismatch`

**Cause**: The callback URL in your config doesn't match what's configured in the OAuth provider.

**Solution**:
- GitHub: Check OAuth App settings → Authorization callback URL
- Google: Check Cloud Console → Credentials → Authorized redirect URIs
- Auth0: Check Application → Application Callback URLs

#### `invalid_client` or `unauthorized_client`

**Cause**: Client ID or secret is incorrect, or the app type doesn't support the flow.

**Solution**:
- Verify your environment variables are loaded correctly
- For Google, ensure the app type is "Web application"
- For Auth0, ensure "Authorization Code" grant is enabled

#### `access_denied`

**Cause**: User denied access, or required scopes weren't approved.

**Solution**:
- Ensure the OAuth consent screen is configured (Google)
- Add test users to your OAuth app (Google External apps)
- Check that scopes match what the provider expects

#### Session not persisting

**Cause**: Session secret not set or changing between restarts.

**Solution**:
- Ensure `SESSION_SECRET` is set in environment
- Use a consistent secret across restarts
- Check `secretEnvVar` is configured correctly

### Testing Commands

```bash
# Check health endpoint (no auth required)
curl http://127.0.0.1:8080/health

# Check current user (requires auth)
curl http://127.0.0.1:8080/auth/me

# List available tools (requires auth)
curl http://127.0.0.1:8080/tools
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=mcp-proxy:* npx mcp-proxy
```

---

## Additional Resources

- [OAuth 2.0 Simplified](https://oauth2simplified.com/)
- [Passport.js Documentation](http://www.passportjs.org/)
- [MCP HTTP Proxy README](../README.md)
- [Example Configurations](../examples/)
