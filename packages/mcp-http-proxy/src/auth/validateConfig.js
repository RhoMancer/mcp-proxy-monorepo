#!/usr/bin/env node

/**
 * OAuth 2.0 Configuration Validator
 *
 * Validates OAuth configuration files for common issues and security best practices.
 * Can be used standalone or imported as a module.
 */

import fs from 'fs';
import path from 'path';
import { OAuthProviders } from './OAuth2Auth.js';

/**
 * Validation result structure
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether the configuration is valid
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 * @property {string[]} info - Array of informational messages
 */

/**
 * Validate OAuth configuration object
 * @param {Object} config - OAuth configuration to validate
 * @returns {ValidationResult}
 */
export function validateOAuthConfig(config) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };

  // Check if auth section exists
  if (!config.auth) {
    result.valid = false;
    result.errors.push('Missing "auth" section in configuration');
    return result;
  }

  const { auth } = config;

  // Validate provider config
  if (!auth.provider) {
    result.valid = false;
    result.errors.push('Missing "provider" configuration in auth section');
    return result;
  }

  const { provider } = auth;

  // Required OAuth endpoints
  const requiredFields = ['authorizationURL', 'tokenURL', 'clientID', 'clientSecret', 'callbackURL'];
  for (const field of requiredFields) {
    if (!provider[field]) {
      result.valid = false;
      result.errors.push(`Missing required field: provider.${field}`);
    } else if (typeof provider[field] !== 'string') {
      result.valid = false;
      result.errors.push(`Field provider.${field} must be a string`);
    }
  }

  // Validate URL formats
  const urlFields = ['authorizationURL', 'tokenURL', 'callbackURL'];
  for (const field of urlFields) {
    if (provider[field]) {
      try {
        new URL(provider[field]);
      } catch {
        result.valid = false;
        result.errors.push(`Invalid URL format for provider.${field}: "${provider[field]}"`);
      }
    }
  }

  // Validate callback URL uses HTTPS in production
  if (provider.callbackURL) {
    const isProduction = process.env.NODE_ENV === 'production';
    const usesHttps = provider.callbackURL.startsWith('https://');
    const isLocalhost = provider.callbackURL.includes('localhost') || provider.callbackURL.includes('127.0.0.1');

    if (isProduction && !usesHttps && !isLocalhost) {
      result.warnings.push('Callback URL should use HTTPS in production');
    }
  }

  // Check for hardcoded secrets (common mistake)
  const secretFields = ['clientSecret', 'clientID'];
  for (const field of secretFields) {
    if (provider[field]) {
      const value = provider[field];
      // Check if it looks like a hardcoded placeholder
      if (['your_', 'your-', 'replace_', 'change_', 'example_'].some(prefix => value.toLowerCase().startsWith(prefix))) {
        result.warnings.push(`provider.${field} appears to contain a placeholder value`);
      }
      // Check if it's suspiciously short for a secret
      if (field === 'clientSecret' && value.length < 16) {
        result.warnings.push(`provider.${field} is unusually short (${value.length} chars), secrets should be longer`);
      }
    }
  }

  // Validate session configuration
  if (!auth.session) {
    result.errors.push('Missing "session" configuration in auth section');
  } else {
    const { session } = auth;

    // Check for session secret
    if (!session.secret && !session.secretEnvVar) {
      result.errors.push('Session secret not configured. Set session.secret or session.secretEnvVar');
    }

    // Check for hardcoded session secret
    if (session.secret && session.secret.length < 16) {
      result.errors.push('Session secret is too short (should be at least 16 characters)');
    }

    // Check for weak session secret patterns
    if (session.secret) {
      const weakPatterns = ['secret', 'password', '123456', 'qwerty', 'abcdef'];
      if (weakPatterns.some(pattern => session.secret.toLowerCase().includes(pattern))) {
        result.warnings.push('Session secret contains common weak patterns');
      }
    }

    // Check session maxAge
    if (session.maxAge) {
      const maxAgeMs = session.maxAge;
      const maxAgeHours = maxAgeMs / (1000 * 60 * 60);

      if (maxAgeHours > 24 * 7) { // More than a week
        result.warnings.push(`Session maxAge is very long (${Math.round(maxAgeHours)} hours), consider shorter sessions`);
      }

      if (maxAgeHours < 1) {
        result.warnings.push('Session maxAge is very short (< 1 hour), users may need to re-authenticate frequently');
      }
    }
  }

  // Check for access control configuration
  if (!auth.allowedUsers && !auth.allowedDomains) {
    result.info.push('No access control configured. Any authenticated user can access the proxy.');
    result.info.push('Consider adding "allowedUsers" or "allowedDomains" for better security.');
  }

  // Validate allowedUsers format
  if (auth.allowedUsers) {
    if (!Array.isArray(auth.allowedUsers)) {
      result.errors.push('allowedUsers must be an array of email addresses');
    } else {
      const invalidEmails = auth.allowedUsers.filter(email => {
        return !email || !email.includes('@') || !email.includes('.');
      });
      if (invalidEmails.length > 0) {
        result.warnings.push(`allowedUsers contains invalid email formats: ${invalidEmails.join(', ')}`);
      }
    }
  }

  // Validate allowedDomains format
  if (auth.allowedDomains) {
    if (!Array.isArray(auth.allowedDomains)) {
      result.errors.push('allowedDomains must be an array of domain names');
    } else {
      const invalidDomains = auth.allowedDomains.filter(domain => {
        return !domain || domain.includes('@') || domain.includes('/');
      });
      if (invalidDomains.length > 0) {
        result.warnings.push(`allowedDomains contains invalid domain formats: ${invalidDomains.join(', ')}`);
      }
    }
  }

  // Check for common provider misconfigurations
  if (provider.authorizationURL) {
    const providerMatch = Object.entries(OAuthProviders).find(([_, config]) => {
      if (config.authorizationURL && typeof config.authorizationURL === 'string') {
        return provider.authorizationURL.includes(config.authorizationURL.split('/')[2]);
      }
      return false;
    });

    if (providerMatch) {
      const [providerName, config] = providerMatch;
      result.info.push(`Detected ${config.name} OAuth provider configuration`);
    }
  }

  return result;
}

/**
 * Validate OAuth configuration from a file
 * @param {string} filePath - Path to configuration file
 * @returns {ValidationResult}
 */
export function validateOAuthConfigFile(filePath) {
  const result = {
    valid: true,
    errors: [],
    warnings: [],
    info: []
  };

  if (!fs.existsSync(filePath)) {
    result.valid = false;
    result.errors.push(`Configuration file not found: ${filePath}`);
    return result;
  }

  try {
    // Dynamic import based on file extension
    const ext = path.extname(filePath);
    let config;

    if (ext === '.js') {
      // Remove cache busting for dynamic imports
      const module = await import(`${filePath}?t=${Date.now()}`);
      config = module.default;
    } else if (ext === '.json') {
      const content = fs.readFileSync(filePath, 'utf-8');
      config = JSON.parse(content);
    } else {
      result.errors.push(`Unsupported file format: ${ext}. Use .js or .json`);
      result.valid = false;
      return result;
    }

    return validateOAuthConfig(config);
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to load configuration: ${error.message}`);
    return result;
  }
}

/**
 * Print validation results to console
 * @param {ValidationResult} result - Validation result to print
 * @param {string} [configName] - Optional configuration name for display
 */
export function printValidationResult(result, configName = 'Configuration') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`OAuth Configuration Validation: ${configName}`);
  console.log(`${'='.repeat(60)}`);

  if (result.valid) {
    console.log('\n✅ Status: VALID');
  } else {
    console.log('\n❌ Status: INVALID');
  }

  if (result.errors.length > 0) {
    console.log('\n🔴 Errors:');
    result.errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }

  if (result.info.length > 0) {
    console.log('\nℹ️  Info:');
    result.info.forEach((info, i) => {
      console.log(`   ${i + 1}. ${info}`);
    });
  }

  console.log(`\n${'='.repeat(60)}\n`);
}

/**
 * CLI entry point
 */
export async function runValidateConfig() {
  const args = process.argv.slice(2);
  const filePath = args[0];

  if (!filePath) {
    console.error('Usage: node validateConfig.js <config-file>');
    console.error('');
    console.error('Example:');
    console.error('  node validateConfig.js examples/oauth-github.config.js');
    process.exit(1);
  }

  const result = await validateOAuthConfigFile(filePath);
  printValidationResult(result, filePath);

  process.exit(result.valid ? 0 : 1);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runValidateConfig();
}
