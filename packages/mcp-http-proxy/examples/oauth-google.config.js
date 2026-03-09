/**
 * Google OAuth 2.0 Configuration Example for MCP HTTP Proxy
 *
 * SETUP INSTRUCTIONS:
 *
 * 1. Create a Google OAuth 2.0 Client:
 *    - Go to https://console.cloud.google.com/apis/credentials
 *    - Select or create a project
 *    - Click "Create Credentials" > "OAuth client ID"
 *    - Application type: Web application
 *    - Name: MCP Proxy
 *    - Authorized redirect URIs: http://127.0.0.1:8080/auth/callback
 *    - Click "Create"
 *    - Copy the Client ID and Client Secret
 *
 * 2. Enable required APIs:
 *    - Go to https://console.cloud.google.com/apis/library
 *    - Enable "Google+ API" or "People API" for user profile info
 *
 * 3. Create a .env file:
 *    GOOGLE_CLIENT_ID=your_client_id_here
 *    GOOGLE_CLIENT_SECRET=your_client_secret_here
 *    SESSION_SECRET=$(openssl rand -base64 32)
 *
 * 4. For production, add your production domain to authorized redirect URIs
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
      // Google OAuth endpoints
      authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenURL: 'https://oauth2.googleapis.com/token',

      // From Google Cloud Console
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      // Must match authorized redirect URI in Google Cloud Console
      callbackURL: 'http://127.0.0.1:8080/auth/callback',

      // Google OAuth scopes
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ]
    },

    session: {
      secretEnvVar: 'SESSION_SECRET',
      maxAge: 24 * 60 * 60 * 1000  // 24 hours
    },

    // Optional: Restrict access to specific users
    allowedUsers: ['user@gmail.com', 'user@company.com']

    // Optional: Restrict access to Google Workspace domains
    // allowedDomains: ['company.com']
  }
};

/**
 * TESTING:
 *
 * 1. Start the proxy:
 *    npx mcp-proxy --config examples/oauth-google.config.js
 *
 * 2. Visit: http://127.0.0.1:8080/auth/login
 *
 * 3. After authenticating with Google, check your session:
 *    curl http://127.0.0.1:8080/auth/me
 *
 * TROUBLESHOOTING:
 *
 * - "redirect_uri_mismatch" - Check callbackURL matches Google Console exactly
 * - "access_denied" - Verify the OAuth consent is configured for the project
 * - For Google Workspace (organization accounts), use "Internal" app type
 */
