/**
 * Test configuration for OAuth validation
 *
 * Uses environment variables from .env file:
 *   GITHUB_CLIENT_ID=your_github_client_id
 *   GITHUB_CLIENT_SECRET=your_github_client_secret
 *   SESSION_SECRET=a_long_random_string_for_session_encryption
 */

export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'libreoffice-calc-mcp'],
    env: {
      LIBREOFFICE_HOST: 'localhost',
      LIBREOFFICE_PORT: '2002'
    }
  },
  server: {
    port: 9999,
    host: '127.0.0.1'
  },
  auth: {
    provider: {
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: process.env.GITHUB_CLIENT_ID || 'test_client_id',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || 'test_client_secret',
      callbackURL: 'http://127.0.0.1:9999/auth/callback',
      scope: 'user:email read:user'
    },
    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000
    }
  }
};
