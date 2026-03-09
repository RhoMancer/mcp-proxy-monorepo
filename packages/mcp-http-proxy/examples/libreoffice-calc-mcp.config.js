/**
 * Example configuration for libreoffice-calc-mcp
 *
 * This config shows how to use mcp-http-proxy with a LibreOffice MCP server.
 *
 * Setup:
 * 1. Install LibreOffice and ensure it's in your PATH
 * 2. Run: npm install mcp-http-proxy
 * 3. Run: mcp-proxy --config examples/libreoffice-calc-mcp.config.js
 *
 * Note: This is a placeholder config. The actual libreoffice-calc-mcp package
 * and its configuration may differ. Adjust the command, args, and env as needed.
 */

export default {
  mcp: {
    command: 'npx',
    args: ['-y', 'libreoffice-calc-mcp'],
    env: {
      LIBREOFFICE_PATH: process.env.LIBREOFFICE_PATH || 'C:/Program Files/LibreOffice/program/soffice.exe'
    }
  },
  server: {
    port: 8081,  // Different port to avoid conflicts
    host: '127.0.0.1'
  }
};
