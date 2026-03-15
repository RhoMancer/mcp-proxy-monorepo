// User-Specific MCP Proxy Configuration
// =====================================
//
// This file contains YOUR specific configurations for OAuth, tunneling, etc.
// Keep this file in your personal/user branch - DO NOT commit to master.
//
// This file is gitignored in master branch but tracked in personal/user branch.

module.exports = {
  // Your OAuth Provider Configuration
  oauthProvider: {
    // Your OAuth client ID (from your OAuth provider settings)
    clientId: process.env.OAUTH_CLIENT_ID || 'your-client-id-here',
    
    // Your OAuth client secret (from your OAuth provider settings)
    clientSecret: process.env.OAUTH_CLIENT_SECRET || 'your-client-secret-here',
    
    // Your OAuth authorization endpoint
    authorizationEndpoint: 'https://your-oauth-provider.com/authorize',
    
    // Your OAuth token endpoint
    tokenEndpoint: 'https://your-oauth-provider.com/token',
  },

  // Your Cloudflare Tunnel Configuration
  tunnel: {
    // Your specific tunnel URL (from cloudflare tunnel)
    url: process.env.TUNNEL_URL || 'https://your-tunnel-url.trycloudflare.com',
  },

  // Your MCP Server Configuration
  server: {
    // Your MCP server command
    command: 'node',
    args: ['path/to/your/mcp/server.js'],
  }
};
