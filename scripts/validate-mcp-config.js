#!/usr/bin/env node
/**
 * Validate MCP Server Configuration for Claude Code CLI
 *
 * This script checks if your MCP servers are correctly configured in .claude.json
 * (the file that Claude Code CLI actually reads, NOT mcp_servers.json which is ignored)
 *
 * Usage: node scripts/validate-mcp-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '═'.repeat(60), 'blue');
  log(message, 'blue');
  log('═'.repeat(60), 'blue');
}

// Get the correct config file path
function getClaudeConfigPath() {
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  return path.join(homeDir, '.claude.json');
}

// Read and parse .claude.json
function readClaudeConfig() {
  const configPath = getClaudeConfigPath();

  if (!fs.existsSync(configPath)) {
    log(`✗ Config file not found: ${configPath}`, 'red');
    log('  Claude Code CLI config file should exist at this location.', 'gray');
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`✗ Failed to parse config file: ${error.message}`, 'red');
    return null;
  }
}

// Check for the old/wrong config file
function checkOldConfigFile() {
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  const oldConfigPath = path.join(homeDir, '.claude', 'mcp_servers.json');

  if (fs.existsSync(oldConfigPath)) {
    log(`⚠ Found old/unused config file: ${oldConfigPath}`, 'yellow');
    log('  This file is NOT read by Claude Code CLI!', 'yellow');
    log('  MCP servers should be configured in .claude.json instead.', 'gray');

    try {
      const content = fs.readFileSync(oldConfigPath, 'utf8');
      const oldConfig = JSON.parse(content);
      if (oldConfig.mcpServers) {
        const servers = Object.keys(oldConfig.mcpServers);
        log(`  Servers in unused file: ${servers.join(', ')}`, 'gray');
      }
    } catch (e) {
      // Ignore parse errors
    }
    return true;
  }
  return false;
}

// Validate a single MCP server
async function validateServer(name, serverConfig) {
  let isValid = true;

  log(`\n  Checking: ${name}`, 'blue');

  // Check type
  if (!serverConfig.type) {
    log(`    ✗ Missing "type" field`, 'red');
    return false;
  }

  if (serverConfig.type !== 'http' && serverConfig.type !== 'stdio') {
    log(`    ⚠ Unknown type: ${serverConfig.type} (expected "http" or "stdio")`, 'yellow');
  }

  // Check url for http type
  if (serverConfig.type === 'http') {
    if (!serverConfig.url) {
      log(`    ✗ Missing "url" field for HTTP server`, 'red');
      return false;
    }

    // Extract port for health check
    const urlMatch = serverConfig.url.match(/:(\d+)\//);
    if (urlMatch) {
      const port = urlMatch[1];
      log(`    ✓ URL: ${serverConfig.url}`, 'green');
      log(`    → Port: ${port}`, 'gray');

      // Try to connect to the proxy
      try {
        const healthUrl = serverConfig.url.replace('/message', '/health');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(healthUrl, {
          signal: controller.signal
        }).catch(() => null);
        clearTimeout(timeout);

        if (response && response.ok) {
          const health = await response.json();
          const running = health.mcpRunning ? '✓' : '✗';
          const initialized = health.mcpInitialized ? '✓' : '✗';
          log(`    ✓ Proxy responding (${running} mcpRunning, ${initialized} mcpInitialized)`, 'green');
        } else {
          log(`    ⚠ Proxy not responding or not healthy`, 'yellow');
        }
      } catch (e) {
        log(`    ⚠ Could not check proxy health: ${e.message}`, 'gray');
      }
    } else {
      log(`    ✓ URL: ${serverConfig.url}`, 'green');
    }
  }

  // Check command/stdio for stdio type
  if (serverConfig.type === 'stdio') {
    if (!serverConfig.command) {
      log(`    ✗ Missing "command" field for stdio server`, 'red');
      isValid = false;
    } else {
      log(`    ✓ Command: ${serverConfig.command}`, 'green');
    }
  }

  return isValid;
}

// Validate MCP server configuration
async function validateMcpServers(config) {
  if (!config.mcpServers) {
    log('✗ No "mcpServers" section found in .claude.json', 'red');
    return false;
  }

  const servers = config.mcpServers;
  const serverNames = Object.keys(servers);

  if (serverNames.length === 0) {
    log('⚠ No MCP servers configured', 'yellow');
    return true;
  }

  log(`✓ Found ${serverNames.length} MCP server(s): ${serverNames.join(', ')}`, 'green');

  let allValid = true;
  for (const [name, serverConfig] of Object.entries(servers)) {
    const valid = await validateServer(name, serverConfig);
    if (!valid) allValid = false;
  }

  return allValid;
}

// Check for common misconfigurations
function checkCommonMistakes(config) {
  log('\n--- Common Misconfigurations ---', 'blue');

  let foundIssues = false;

  // Check for wrong format (nested "transport" key)
  for (const [name, serverConfig] of Object.entries(config.mcpServers || {})) {
    if (serverConfig.transport) {
      log(`⚠ ${name}: Uses "transport" key (should use "type" directly)`, 'yellow');
      log('  Correct format: {"type": "http", "url": "..."}', 'gray');
      log('  Wrong format:   {"transport": {"type": "http", ...}}', 'gray');
      foundIssues = true;
    }
  }

  if (!foundIssues) {
    log('✓ No common misconfigurations found', 'green');
  }
}

// Main function
async function main() {
  header('MCP Configuration Validator for Claude Code CLI');

  log(`\nConfig file: ${getClaudeConfigPath()}`, 'gray');

  // Check for old/unused config file
  checkOldConfigFile();

  // Read config
  const config = readClaudeConfig();
  if (!config) {
    log('\n✗ Cannot validate without a valid config file', 'red');
    process.exit(1);
  }

  log('✓ Config file loaded successfully', 'green');

  // Validate MCP servers
  const valid = await validateMcpServers(config);

  // Check for common mistakes
  checkCommonMistakes(config);

  // Summary
  header('Summary');
  if (valid) {
    log('✓ All checks passed!', 'green');
    log('\nNext steps:', 'gray');
    log('  1. Ensure your MCP proxies are running before starting Claude Code CLI');
    log('  2. Restart Claude Code CLI to pick up any configuration changes');
    log('  3. Run /mcp in Claude Code CLI to verify servers are discovered');
  } else {
    log('✗ Some issues found. Please fix and re-run.', 'red');
  }

  log('', 'reset');
}

main().catch(console.error);
