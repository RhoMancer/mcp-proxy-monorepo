/**
 * GitHub OAuth 2.0 Configuration Example for MCP HTTP Proxy
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Create a GitHub OAuth App:
 *    - Go to https://github.com/settings/developers
 *    - Click "OAuth Apps" or "New OAuth App"
 *    - Fill in the form:
 *      * Application name: MCP Proxy
 *      * Homepage URL: http://127.0.0.1:8080
 *      * Authorization callback URL: http://127.0.0.1:8080/auth/callback
 *    - Copy the Client ID and generate a Client Secret
 *
 * 2. Create a .env file:
 *    GITHUB_CLIENT_ID=your_client_id_here
 *    GITHUB_CLIENT_SECRET=your_client_secret_here
 *    SESSION_SECRET=$(openssl rand -base64 32)
 *
 * 3. For production with HTTPS, update callbackURL and add secure: true
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
    },

    // Optional: Restrict access to specific users
    allowedUsers: ['user@example.com']
    // or by domain: allowedDomains: ['company.com']
  }
};
