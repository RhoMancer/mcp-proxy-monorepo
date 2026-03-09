/**
 * Example configuration with LibreOffice Calc MCP + GitHub OAuth 2.0 authentication
 *
 * This config shows how to enable OAuth 2.0 authentication for the LibreOffice Calc MCP.
 *
 * GitHub OAuth App Setup:
 * 1. Go to https://github.com/settings/developers
 * 2. Click "New OAuth App"
 * 3. Set:
 *    - Application name: LibreOffice MCP Proxy
 *    - Homepage URL: http://127.0.0.1:8081
 *    - Authorization callback URL: http://127.0.0.1:8081/auth/callback
 * 4. Copy the Client ID and generate a Client Secret
 * 5. Add them to your .env file (see root .env.example)
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   node src/cli.js -c ../examples/oauth-libreoffice.config.js
 *
 * Environment variables (.env file):
 *   GITHUB_CLIENT_ID=your_github_client_id
 *   GITHUB_CLIENT_SECRET=your_github_client_secret
 *   SESSION_SECRET=a_long_random_string_for_session_encryption
 */

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
  auth: {
    provider: {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: 'http://127.0.0.1:8081/auth/callback',
      scope: 'user:email read:user'
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    // Optional: Restrict access to specific users
    allowedUsers: [
      // 'user1@example.com',
      // 'user2@example.com'
    ],
    // Optional: Restrict access to specific domains
    allowedDomains: [
      // 'example.com',
      // 'mycompany.com'
    ]
  }
};
