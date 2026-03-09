/**
 * Generic OAuth 2.0 Configuration Example for MCP HTTP Proxy
 *
 * This template works with any OAuth 2.0 provider.
 * Replace the placeholders with your provider's values.
 *
 * COMMON OAUTH 2.0 PROVIDERS:
 *
 * Provider         | Authorization URL              | Token URL
 * -----------------|--------------------------------|----------------------------------------
 * GitLab           | https://gitlab.com/oauth/authorize | https://gitlab.com/oauth/token
 * Bitbucket        | https://bitbucket.org/site/oauth2/authorize | https://bitbucket.org/site/oauth2/access_token
 * Microsoft Azure  | https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize | https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
 * Discord          | https://discord.com/oauth2/authorize | https://discord.com/api/oauth2/token
 * Spotify          | https://accounts.spotify.com/authorize | https://accounts.spotify.com/api/token
 * Slack            | https://slack.com/oauth/v2/authorize | https://slack.com/api/oauth.v2.access
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Create an OAuth application with your provider
 * 2. Set the callback URL to: http://127.0.0.1:8080/auth/callback
 * 3. Note the authorization URL, token URL, client ID, and secret
 * 4. Determine required scopes for user email/profile
 * 5. Create a .env file with your credentials
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
      // TODO: Replace with your provider's authorization URL
      authorizationURL: process.env.OAUTH_AUTHORIZATION_URL || 'https://provider.example.com/oauth/authorize',

      // TODO: Replace with your provider's token URL
      tokenURL: process.env.OAUTH_TOKEN_URL || 'https://provider.example.com/oauth/token',

      // From your OAuth application settings
      clientID: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,

      // Must match callback URL in your OAuth app settings
      callbackURL: 'http://127.0.0.1:8080/auth/callback',

      // TODO: Scope depends on provider - typically includes email/profile access
      scope: process.env.OAUTH_SCOPE?.split(',') || ['email', 'profile']
    },

    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000
    },

    // Optional: Restrict access
    allowedUsers: process.env.ALLOWED_USERS?.split(',') || undefined,
    allowedDomains: process.env.ALLOWED_DOMAINS?.split(',') || undefined
  }
};

/**
 * GITLAB EXAMPLE:
 *
 * provider: {
 *   authorizationURL: 'https://gitlab.com/oauth/authorize',
 *   tokenURL: 'https://gitlab.com/oauth/token',
 *   clientID: process.env.GITLAB_CLIENT_ID,
 *   clientSecret: process.env.GITLAB_CLIENT_SECRET,
 *   callbackURL: 'http://127.0.0.1:8080/auth/callback',
 *   scope: ['read_user', 'email']
 * }
 *
 * AZURE AD EXAMPLE:
 *
 * provider: {
 *   authorizationURL: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize',
 *   tokenURL: 'https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token',
 *   clientID: process.env.AZURE_CLIENT_ID,
 *   clientSecret: process.env.AZURE_CLIENT_SECRET,
 *   callbackURL: 'http://127.0.0.1:8080/auth/callback',
 *   scope: ['User.Read', 'email']
 * }
 * Replace {tenant} with your tenant ID or 'common' for multi-tenant.
 *
 * TESTING CHECKLIST:
 * □ Provider application created
 * □ Callback URL configured: http://127.0.0.1:8080/auth/callback
 * □ .env file with OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, SESSION_SECRET
 * □ Scopes include email/profile access
 * □ Test with: npx mcp-proxy --config examples/oauth-generic.config.js
 * □ Visit: http://127.0.0.1:8080/auth/login
 */
