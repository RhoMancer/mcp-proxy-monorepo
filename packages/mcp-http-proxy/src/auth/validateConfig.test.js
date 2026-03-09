/**
 * Unit tests for validateConfig module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import {
  validateOAuthConfig,
  validateOAuthConfigFile,
  printValidationResult
} from './validateConfig.js';

describe('validateOAuthConfig', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createValidConfig = () => ({
    auth: {
      provider: {
        authorizationURL: 'https://github.com/login/oauth/authorize',
        tokenURL: 'https://github.com/login/oauth/access_token',
        clientID: 'test-client-id-12345',
        clientSecret: 'test-client-key-xyz987654321',
        callbackURL: 'http://localhost:8080/auth/callback'
      },
      session: {
        secret: 'test-session-key-xyz987654321'
      }
    }
  });

  describe('Missing auth section', () => {
    it('should return error when auth section is missing', () => {
      const result = validateOAuthConfig({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing "auth" section in configuration');
    });

    it('should return early when auth section is missing', () => {
      const result = validateOAuthConfig({ other: 'data' });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toBe('Missing "auth" section in configuration');
    });
  });

  describe('Missing provider config', () => {
    it('should return error when provider is missing', () => {
      const result = validateOAuthConfig({ auth: {} });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing "provider" configuration in auth section');
    });

    it('should return early when provider is missing', () => {
      const result = validateOAuthConfig({ auth: { session: {} } });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(1);
    });
  });

  describe('Required provider fields', () => {
    it('should return error when authorizationURL is missing', () => {
      const config = createValidConfig();
      delete config.auth.provider.authorizationURL;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: provider.authorizationURL');
    });

    it('should return error when tokenURL is missing', () => {
      const config = createValidConfig();
      delete config.auth.provider.tokenURL;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: provider.tokenURL');
    });

    it('should return error when clientID is missing', () => {
      const config = createValidConfig();
      delete config.auth.provider.clientID;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: provider.clientID');
    });

    it('should return error when clientSecret is missing', () => {
      const config = createValidConfig();
      delete config.auth.provider.clientSecret;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: provider.clientSecret');
    });

    it('should return error when callbackURL is missing', () => {
      const config = createValidConfig();
      delete config.auth.provider.callbackURL;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: provider.callbackURL');
    });

    it('should return error when field is not a string', () => {
      const config = createValidConfig();
      config.auth.provider.clientID = 12345;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field provider.clientID must be a string');
    });

    it('should return multiple errors for multiple missing fields', () => {
      const config = createValidConfig();
      delete config.auth.provider.clientID;
      delete config.auth.provider.clientSecret;
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: provider.clientID');
      expect(result.errors).toContain('Missing required field: provider.clientSecret');
    });
  });

  describe('URL format validation', () => {
    it('should return error for invalid authorizationURL', () => {
      const config = createValidConfig();
      config.auth.provider.authorizationURL = 'not-a-valid-url';
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid URL format for provider.authorizationURL'))).toBe(true);
    });

    it('should return error for invalid tokenURL with spaces', () => {
      const config = createValidConfig();
      config.auth.provider.tokenURL = 'http://example .com/token';
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid URL format for provider.tokenURL'))).toBe(true);
    });

    it('should return error for invalid callbackURL missing protocol', () => {
      const config = createValidConfig();
      config.auth.provider.callbackURL = '://no-protocol.com';
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid URL format for provider.callbackURL'))).toBe(true);
    });

    it('should accept valid URLs', () => {
      const config = createValidConfig();
      const result = validateOAuthConfig(config);
      expect(result.errors.some(e => e.includes('Invalid URL format'))).toBe(false);
    });
  });

  describe('HTTPS callback URL warning', () => {
    it('should warn when callbackURL uses HTTP in production', () => {
      process.env.NODE_ENV = 'production';
      const config = createValidConfig();
      config.auth.provider.callbackURL = 'http://example.com/callback';
      const result = validateOAuthConfig(config);
      expect(result.warnings).toContain('Callback URL should use HTTPS in production');
    });

    it('should not warn when callbackURL uses HTTPS in production', () => {
      process.env.NODE_ENV = 'production';
      const config = createValidConfig();
      config.auth.provider.callbackURL = 'https://example.com/callback';
      const result = validateOAuthConfig(config);
      expect(result.warnings).not.toContain('Callback URL should use HTTPS in production');
    });

    it('should not warn when callbackURL uses localhost in production', () => {
      process.env.NODE_ENV = 'production';
      const config = createValidConfig();
      config.auth.provider.callbackURL = 'http://localhost:8080/callback';
      const result = validateOAuthConfig(config);
      expect(result.warnings).not.toContain('Callback URL should use HTTPS in production');
    });

    it('should not warn when callbackURL uses 127.0.0.1 in production', () => {
      process.env.NODE_ENV = 'production';
      const config = createValidConfig();
      config.auth.provider.callbackURL = 'http://127.0.0.1:8080/callback';
      const result = validateOAuthConfig(config);
      expect(result.warnings).not.toContain('Callback URL should use HTTPS in production');
    });

    it('should not warn in development regardless of protocol', () => {
      process.env.NODE_ENV = 'development';
      const config = createValidConfig();
      config.auth.provider.callbackURL = 'http://example.com/callback';
      const result = validateOAuthConfig(config);
      expect(result.warnings).not.toContain('Callback URL should use HTTPS in production');
    });
  });

  describe('Hardcoded secrets detection', () => {
    it('should warn when clientID looks like a placeholder', () => {
      const config = createValidConfig();
      config.auth.provider.clientID = 'your_client_id_here';
      const result = validateOAuthConfig(config);
      expect(result.warnings).toContain('provider.clientID appears to contain a placeholder value');
    });

    it('should warn when clientSecret looks like a placeholder', () => {
      const config = createValidConfig();
      config.auth.provider.clientSecret = 'your-secret-key';
      const result = validateOAuthConfig(config);
      expect(result.warnings).toContain('provider.clientSecret appears to contain a placeholder value');
    });

    it('should warn for various placeholder patterns', () => {
      const placeholders = ['replace_me', 'change_me', 'example_secret'];
      placeholders.forEach(placeholder => {
        const config = createValidConfig();
        config.auth.provider.clientSecret = placeholder;
        const result = validateOAuthConfig(config);
        expect(result.warnings.some(w => w.includes('appears to contain a placeholder value'))).toBe(true);
      });
    });

    it('should warn when clientSecret is too short', () => {
      const config = createValidConfig();
      config.auth.provider.clientSecret = 'short';
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('unusually short') && w.includes('5 chars'))).toBe(true);
    });

    it('should not warn for secrets of adequate length', () => {
      const config = createValidConfig();
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('unusually short'))).toBe(false);
    });
  });

  describe('Session configuration validation', () => {
    it('should error when session config is missing', () => {
      const config = createValidConfig();
      delete config.auth.session;
      const result = validateOAuthConfig(config);
      expect(result.errors).toContain('Missing "session" configuration in auth section');
    });

    it('should error when neither secret nor secretEnvVar is set', () => {
      const config = createValidConfig();
      delete config.auth.session.secret;
      const result = validateOAuthConfig(config);
      expect(result.errors).toContain('Session secret not configured. Set session.secret or session.secretEnvVar');
    });

    it('should error when session secret is too short', () => {
      const config = createValidConfig();
      config.auth.session.secret = 'short12';
      const result = validateOAuthConfig(config);
      expect(result.errors).toContain('Session secret is too short (should be at least 16 characters)');
    });

    it('should not error when secretEnvVar is set instead of secret', () => {
      const config = createValidConfig();
      delete config.auth.session.secret;
      config.auth.session.secretEnvVar = 'CUSTOM_SECRET';
      const result = validateOAuthConfig(config);
      expect(result.errors.some(e => e.includes('Session secret not configured'))).toBe(false);
    });

    it('should warn when session secret contains weak patterns', () => {
      const weakPatterns = ['mysecret123', 'password123', 'abc123456', 'qwertyui', 'secretpass'];
      weakPatterns.forEach(pattern => {
        const config = createValidConfig();
        config.auth.session.secret = pattern;
        const result = validateOAuthConfig(config);
        expect(result.warnings).toContain('Session secret contains common weak patterns');
      });
    });

    it('should not warn for strong session secrets', () => {
      const config = createValidConfig();
      const result = validateOAuthConfig(config);
      expect(result.warnings).not.toContain('Session secret contains common weak patterns');
    });
  });

  describe('Session maxAge validation', () => {
    it('should warn when maxAge is very long (> 1 week)', () => {
      const config = createValidConfig();
      config.auth.session.maxAge = 8 * 24 * 60 * 60 * 1000;
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('very long') && w.includes('hours'))).toBe(true);
    });

    it('should warn when maxAge is very short (< 1 hour)', () => {
      const config = createValidConfig();
      config.auth.session.maxAge = 30 * 60 * 1000;
      const result = validateOAuthConfig(config);
      expect(result.warnings).toContain('Session maxAge is very short (< 1 hour), users may need to re-authenticate frequently');
    });

    it('should not warn for reasonable maxAge values', () => {
      const config = createValidConfig();
      config.auth.session.maxAge = 2 * 60 * 60 * 1000;
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('maxAge'))).toBe(false);
    });
  });

  describe('Access control configuration', () => {
    it('should provide info when no access control is configured', () => {
      const config = createValidConfig();
      const result = validateOAuthConfig(config);
      expect(result.info).toContain('No access control configured. Any authenticated user can access the proxy.');
      expect(result.info).toContain('Consider adding "allowedUsers" or "allowedDomains" for better security.');
    });

    it('should not provide access control info when allowedUsers is set', () => {
      const config = createValidConfig();
      config.auth.allowedUsers = ['user@example.com'];
      const result = validateOAuthConfig(config);
      expect(result.info.some(i => i.includes('No access control configured'))).toBe(false);
    });

    it('should not provide access control info when allowedDomains is set', () => {
      const config = createValidConfig();
      config.auth.allowedDomains = ['example.com'];
      const result = validateOAuthConfig(config);
      expect(result.info.some(i => i.includes('No access control configured'))).toBe(false);
    });
  });

  describe('allowedUsers validation', () => {
    it('should error when allowedUsers is not an array', () => {
      const config = createValidConfig();
      config.auth.allowedUsers = 'user@example.com';
      const result = validateOAuthConfig(config);
      expect(result.errors).toContain('allowedUsers must be an array of email addresses');
    });

    it('should warn when allowedUsers contains invalid email formats', () => {
      const config = createValidConfig();
      config.auth.allowedUsers = ['valid@example.com', 'invalid', 'another@valid', 'missingdot@com'];
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('allowedUsers contains invalid email formats'))).toBe(true);
    });

    it('should not warn for valid email addresses', () => {
      const config = createValidConfig();
      config.auth.allowedUsers = ['user@example.com', 'admin@company.org'];
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('allowedUsers contains invalid email formats'))).toBe(false);
    });

    it('should handle empty strings in allowedUsers', () => {
      const config = createValidConfig();
      config.auth.allowedUsers = ['valid@example.com', ''];
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('allowedUsers contains invalid email formats'))).toBe(true);
    });
  });

  describe('allowedDomains validation', () => {
    it('should error when allowedDomains is not an array', () => {
      const config = createValidConfig();
      config.auth.allowedDomains = 'example.com';
      const result = validateOAuthConfig(config);
      expect(result.errors).toContain('allowedDomains must be an array of domain names');
    });

    it('should warn when allowedDomains contains invalid formats', () => {
      const config = createValidConfig();
      config.auth.allowedDomains = ['example.com', 'user@domain.com', 'domain/path'];
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('allowedDomains contains invalid domain formats'))).toBe(true);
    });

    it('should not warn for valid domain names', () => {
      const config = createValidConfig();
      config.auth.allowedDomains = ['example.com', 'company.org', 'app.io'];
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('allowedDomains contains invalid domain formats'))).toBe(false);
    });

    it('should handle empty strings in allowedDomains', () => {
      const config = createValidConfig();
      config.auth.allowedDomains = ['example.com', ''];
      const result = validateOAuthConfig(config);
      expect(result.warnings.some(w => w.includes('allowedDomains contains invalid domain formats'))).toBe(true);
    });
  });

  describe('Provider detection', () => {
    it('should detect GitHub OAuth provider', () => {
      const config = createValidConfig();
      config.auth.provider.authorizationURL = 'https://github.com/login/oauth/authorize';
      const result = validateOAuthConfig(config);
      expect(result.info.some(i => i.includes('GitHub') && i.includes('OAuth provider'))).toBe(true);
    });

    it('should detect Google OAuth provider', () => {
      const config = createValidConfig();
      config.auth.provider.authorizationURL = 'https://accounts.google.com/o/oauth2/v2/auth';
      const result = validateOAuthConfig(config);
      expect(result.info.some(i => i.includes('Google') && i.includes('OAuth provider'))).toBe(true);
    });

    it('should detect GitLab OAuth provider', () => {
      const config = createValidConfig();
      config.auth.provider.authorizationURL = 'https://gitlab.com/oauth/authorize';
      const result = validateOAuthConfig(config);
      expect(result.info.some(i => i.includes('GitLab') && i.includes('OAuth provider'))).toBe(true);
    });
  });

  describe('Valid configuration', () => {
    it('should return valid result for complete valid config', () => {
      const config = createValidConfig();
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid config with access control', () => {
      const config = createValidConfig();
      config.auth.allowedUsers = ['user@example.com'];
      config.auth.allowedDomains = ['example.com'];
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid config with warnings', () => {
      const config = createValidConfig();
      config.auth.provider.clientID = 'your_client_id';
      const result = validateOAuthConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

describe('validateOAuthConfigFile', () => {
  let originalExistsSync;
  let originalReadFileSync;

  beforeEach(() => {
    originalExistsSync = fs.existsSync;
    originalReadFileSync = fs.readFileSync;
  });

  afterEach(() => {
    fs.existsSync = originalExistsSync;
    fs.readFileSync = originalReadFileSync;
  });

  it('should return error when file does not exist', async () => {
    const result = await validateOAuthConfigFile('/nonexistent/file.js');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Configuration file not found: /nonexistent/file.js');
  });

  it('should return error for unsupported file format', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const result = await validateOAuthConfigFile('/path/to/config.txt');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Unsupported file format'))).toBe(true);
  });

  it('should load and validate JSON configuration files', async () => {
    const validConfig = {
      auth: {
        provider: {
          authorizationURL: 'https://github.com/login/oauth/authorize',
          tokenURL: 'https://github.com/login/oauth/access_token',
          clientID: 'test-client-id-12345',
          clientSecret: 'test-client-key-xyz987654321',
          callbackURL: 'http://localhost:8080/auth/callback'
        },
        session: {
          secret: 'test-session-key-xyz987654321'
        }
      }
    };

    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(validConfig));

    const result = await validateOAuthConfigFile('/path/to/config.json');
    expect(result.valid).toBe(true);
  });

  it('should handle JSON parsing errors', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json{{{');

    const result = await validateOAuthConfigFile('/path/to/config.json');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Failed to load configuration'))).toBe(true);
  });
});

describe('printValidationResult', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should print valid status for valid result', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };
    printValidationResult(result, 'Test Config');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Status: VALID'));
  });

  it('should print invalid status for invalid result', () => {
    const result = {
      valid: false,
      errors: ['Error 1'],
      warnings: [],
      info: []
    };
    printValidationResult(result, 'Test Config');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Status: INVALID'));
  });

  it('should print errors', () => {
    const result = {
      valid: false,
      errors: ['Error 1', 'Error 2'],
      warnings: [],
      info: []
    };
    printValidationResult(result);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🔴 Errors:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. Error 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2. Error 2'));
  });

  it('should print warnings', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: ['Warning 1'],
      info: []
    };
    printValidationResult(result);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('⚠️  Warnings:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. Warning 1'));
  });

  it('should print info messages', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: ['Info message 1', 'Info message 2']
    };
    printValidationResult(result);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ℹ️  Info:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('1. Info message 1'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('2. Info message 2'));
  });

  it('should include config name in output', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };
    printValidationResult(result, 'MyConfig');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('MyConfig'));
  });

  it('should use default config name when not provided', () => {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      info: []
    };
    printValidationResult(result);
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration'));
  });
});
