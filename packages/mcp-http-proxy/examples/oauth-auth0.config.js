/**
 * Auth0 OAuth 2.0 Configuration Example for MCP HTTP Proxy
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Create an Auth0 Application:
 *    - Go to https://manage.auth0.com/dashboard
 *    - Applications > Applications > Create Application
 *    - Name: MCP Proxy
 *    - Application Type: Regular Web Application
 *    - Click Create
 *
 * 2. Configure the application:
 *    - Go to Settings tab
 *    - Allowed Callback URLs: http://127.0.0.1:8080/auth/callback
 *    - Allowed Logout URLs: http://127.0.0.1:8080
 *    - Allowed Web Origins: http://127.0.0.1:8080
 *    - Save changes
 *    - Copy Domain, Client ID, and Client Secret
 *
 * 3. Create a .env file:
 *    AUTH0_DOMAIN=your-tenant.auth0.com
 *    AUTH0_CLIENT_ID=your_client_id
 *    AUTH0_CLIENT_SECRET=your_client_secret
 *    SESSION_SECRET=$(openssl rand -base64 32)
 *
 * 4. For production, add your production URLs to allowed origins
 */

export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'your-mcp-server'],
  },

  server: {
    port: 8080,
    host: '127.0.0.1'
  },

  auth: {
    provider: {
      // Auth0 OAuth endpoints (uses your domain)
      authorizationURL: `https://${process.env.AUTH0_DOMAIN}/authorize`,
      tokenURL: `https://${process.env.AUTH0_DOMAIN}/oauth/token`,

      // From Auth0 Application settings
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,

      // Must match Allowed Callback URLs in Auth0
      callbackURL: 'http://127.0.0.1:8080/auth/callback',

      // Auth0 scopes - openid is required for OIDC
      scope: ['openid', 'profile', 'email']
    },

    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000  // 24 hours
    },

    // Optional: Restrict access to specific users
    allowedUsers: ['user@example.com']

    // Optional: Restrict access by email domain
    // allowedDomains: ['company.com']
  }
};

/**
 * AUTH0-SPECIFIC NOTES:
 *
 * 1. The domain format is: your-tenant.auth0.com
 *    For custom domains: https://auth.yourcompany.com
 *
 * 2. Auth0 uses OpenID Connect (OIDC):
 *    - 'openid' scope is required for user identification
 *    - 'profile' provides user profile data
 *    - 'email' provides email address
 *
 * 3. To enable user profile mapping in Auth0:
 *    - Go to Connections > Social
 *    - Edit connection > ensure "profile" and "email" are enabled
 *
 * TESTING:
 *
 * 1. Start the proxy:
 *    npx mcp-proxy --config examples/oauth-auth0.config.js
 *
 * 2. Visit: http://127.0.0.1:8080/auth/login
 *
 * 3. You'll be redirected to Auth0's Universal Login
 *
 * TROUBLESHOOTING:
 *
 * - "callback url mismatch" - Check Allowed Callback URLs in Auth0 settings
 * - "client_secret required" - Auth0 requires client secret for web apps
 * - For custom social connections, check connection scopes are enabled
 * - Enable "OIDC Conformant" in Application > Advanced if using modern Auth0
 */
