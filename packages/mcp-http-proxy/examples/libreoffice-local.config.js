/**
 * LibreOffice Calc MCP - Local Claude Code configuration (NO OAuth)
 *
 * This configuration runs the LibreOffice Calc MCP server without OAuth for local Claude Code CLI access.
 * Use this alongside the OAuth-enabled proxy for Claude.ai web access.
 *
 * Usage:
 *   cd packages/mcp-http-proxy
 *   node src/cli.js -c ../examples/libreoffice-local.config.js
 *
 * Requirements:
 *   - LibreOffice must be running in headless mode (see START_LIBREOFFICE_HEADLESS.bat)
 *   - Python with the libreoffice-calc-mcp package must be available
 */

export default {
  mcp: {
    command: process.env.LIBREOFFICE_PYTHON || 'C:\\Dev\\lang\\python313\\python.exe',
    args: ['-m', 'libreoffice_calc_mcp'],
    cwd: 'H:/My_Repositories/mcp-proxy-monorepo/packages/libreoffice-calc-mcp-server/src',
    env: {
      PYTHONPATH: 'H:/My_Repositories/mcp-proxy-monorepo/packages/libreoffice-calc-mcp-server/src',
      LIBREOFFICE_PATH: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
    }
  },
  server: {
    port: 8084,
    host: '127.0.0.1'
  }
  // NO oauthProvider - this is for local CLI access only
};
