/**
 * Unit tests for OAuth2Auth class
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OAuth2Auth, OAuthProviders } from './OAuth2Auth.js';

describe('OAuth2Auth', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.SESSION_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Constructor Validation', () => {
    const validConfig = {
      provider: {
        authorizationURL: 'https://example.com/oauth/authorize',
        tokenURL: 'https://example.com/oauth/token',
        clientID: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackURL: 'http://localhost:8080/auth/callback'
      },
      session: {
        secret: 'test-session-secret'
      }
    };

    it('should create instance with valid config', () => {
      const auth = new OAuth2Auth(validConfig);
      expect(auth).toBeInstanceOf(OAuth2Auth);
      expect(auth.sessionSecret).toBe('test-session-secret');
    });

    it('should throw error when provider config is missing', () => {
      expect(() => new OAuth2Auth({})).toThrow('OAuth provider configuration is required');
    });

    it('should throw error when clientID is missing', () => {
      const config = { ...validConfig };
      delete config.provider.clientID;
      expect(() => new OAuth2Auth(config)).toThrow('OAuth clientID and clientSecret are required');
    });

    it('should throw error when session secret is missing', () => {
      const config = {
        provider: {
          authorizationURL: 'https://example.com/oauth/authorize',
          tokenURL: 'https://example.com/oauth/token',
          clientID: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackURL: 'http://localhost:8080/auth/callback'
        },
        session: {}
      };
      expect(() => new OAuth2Auth(config)).toThrow('Session secret is required');
    });

    it('should use SESSION_SECRET env var when session.secret not provided', () => {
      process.env.SESSION_SECRET = 'env-secret';
      const config = {
        provider: {
          authorizationURL: 'https://example.com/oauth/authorize',
          tokenURL: 'https://example.com/oauth/token',
          clientID: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackURL: 'http://localhost:8080/auth/callback'
        },
        session: {}
      };
      const auth = new OAuth2Auth(config);
      expect(auth.sessionSecret).toBe('env-secret');
      delete process.env.SESSION_SECRET;
    });

    it('should use custom secretEnvVar when specified', () => {
      process.env.CUSTOM_SECRET = 'custom-env-secret';
      const config = {
        provider: {
          authorizationURL: 'https://example.com/oauth/authorize',
          tokenURL: 'https://example.com/oauth/token',
          clientID: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackURL: 'http://localhost:8080/auth/callback'
        },
        session: {
          secretEnvVar: 'CUSTOM_SECRET'
        }
      };
      const auth = new OAuth2Auth(config);
      expect(auth.sessionSecret).toBe('custom-env-secret');
      delete process.env.CUSTOM_SECRET;
    });
  });

  describe('Session Configuration', () => {
    const baseConfig = {
      provider: {
        authorizationURL: 'https://example.com/oauth/authorize',
        tokenURL: 'https://example.com/oauth/token',
        clientID: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackURL: 'http://localhost:8080/auth/callback'
      },
      session: {
        secret: 'test-session-secret'
      }
    };

    it('should return session config with defaults', () => {
      const auth = new OAuth2Auth(baseConfig);
      const sessionConfig = auth.getSessionConfig();

      expect(sessionConfig.secret).toBe('test-session-secret');
      expect(sessionConfig.resave).toBe(false);
      expect(sessionConfig.saveUninitialized).toBe(false);
      expect(sessionConfig.name).toBe('mcp_proxy_session');
      expect(sessionConfig.cookie.httpOnly).toBe(true);
      expect(sessionConfig.cookie.sameSite).toBe('lax');
      expect(sessionConfig.cookie.maxAge).toBe(24 * 60 * 60 * 1000);
    });

    it('should respect custom maxAge', () => {
      const config = {
        ...baseConfig,
        session: {
          secret: 'test-session-secret',
          maxAge: 60 * 60 * 1000
        }
      };
      const auth = new OAuth2Auth(config);
      const sessionConfig = auth.getSessionConfig();
      expect(sessionConfig.cookie.maxAge).toBe(60 * 60 * 1000);
    });

    it('should set secure cookie in production', () => {
      process.env.NODE_ENV = 'production';
      const auth = new OAuth2Auth(baseConfig);
      const sessionConfig = auth.getSessionConfig();
      expect(sessionConfig.cookie.secure).toBe(true);
      process.env.NODE_ENV = undefined;
    });

    it('should respect explicit secure flag', () => {
      const config = {
        ...baseConfig,
        session: {
          secret: 'test-session-secret',
          secure: true
        }
      };
      process.env.NODE_ENV = 'development';
      const auth = new OAuth2Auth(config);
      const sessionConfig = auth.getSessionConfig();
      expect(sessionConfig.cookie.secure).toBe(true);
    });
  });

  describe('Middleware Generation', () => {
    const baseConfig = {
      provider: {
        authorizationURL: 'https://example.com/oauth/authorize',
        tokenURL: 'https://example.com/oauth/token',
        clientID: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackURL: 'http://localhost:8080/auth/callback'
      },
      session: {
        secret: 'test-session-secret'
      }
    };

    it('should return initialize middleware', () => {
      const auth = new OAuth2Auth(baseConfig);
      const middleware = auth.getInitializeMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should return session middleware', () => {
      const auth = new OAuth2Auth(baseConfig);
      const middleware = auth.getSessionMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should return authenticate middleware', () => {
      const auth = new OAuth2Auth(baseConfig);
      const middleware = auth.getAuthenticateMiddleware();
      expect(typeof middleware).toBe('function');
    });

    it('should allow /health endpoint without authentication', () => {
      const auth = new OAuth2Auth(baseConfig);
      const middleware = auth.getAuthenticateMiddleware();

      const req = { path: '/health' };
      const res = {};
      const next = vi.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('isEnabled', () => {
    it('should return true when properly configured', () => {
      const config = {
        provider: {
          authorizationURL: 'https://example.com/oauth/authorize',
          tokenURL: 'https://example.com/oauth/token',
          clientID: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackURL: 'http://localhost:8080/auth/callback'
        },
        session: {
          secret: 'test-session-secret'
        }
      };
      const auth = new OAuth2Auth(config);
      expect(auth.isEnabled()).toBe(true);
    });
  });
});

describe('OAuthProviders', () => {
  it('should export GitHub provider config', () => {
    expect(OAuthProviders.GITHUB).toBeDefined();
    expect(OAuthProviders.GITHUB.name).toBe('GitHub');
    expect(OAuthProviders.GITHUB.authorizationURL).toBe('https://github.com/login/oauth/authorize');
    expect(OAuthProviders.GITHUB.tokenURL).toBe('https://github.com/login/oauth/access_token');
  });

  it('should export Google provider config', () => {
    expect(OAuthProviders.GOOGLE).toBeDefined();
    expect(OAuthProviders.GOOGLE.name).toBe('Google');
    expect(OAuthProviders.GOOGLE.authorizationURL).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });

  it('should export GitLab provider config', () => {
    expect(OAuthProviders.GITLAB).toBeDefined();
    expect(OAuthProviders.GITLAB.name).toBe('GitLab');
    expect(OAuthProviders.GITLAB.authorizationURL).toBe('https://gitlab.com/oauth/authorize');
  });

  it('should export Auth0 provider config with URL generators', () => {
    expect(OAuthProviders.AUTH0).toBeDefined();
    expect(OAuthProviders.AUTH0.name).toBe('Auth0');
    expect(typeof OAuthProviders.AUTH0.getAuthorizationURL).toBe('function');
    expect(typeof OAuthProviders.AUTH0.getTokenURL).toBe('function');

    const domain = 'example.auth0.com';
    expect(OAuthProviders.AUTH0.getAuthorizationURL(domain)).toBe(`https://${domain}/authorize`);
    expect(OAuthProviders.AUTH0.getTokenURL(domain)).toBe(`https://${domain}/oauth/token`);
  });
});

describe('User Verification', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createAuth = (configOverrides) => {
    const config = {
      provider: {
        authorizationURL: 'https://example.com/oauth/authorize',
        tokenURL: 'https://example.com/oauth/token',
        clientID: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackURL: 'http://localhost:8080/auth/callback'
      },
      session: {
        secret: 'test-session-secret'
      },
      ...configOverrides
    };
    return new OAuth2Auth(config);
  };

  it('should verify user without restrictions when no allowlists configured', () => {
    const auth = createAuth({});
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
      expect(err).toBeNull();
      expect(user).toBeDefined();
      expect(user.id).toBe('user-123');
      expect(user.email).toBe('test@example.com');
    });
  });

  it('should verify user when in allowedUsers list', () => {
    const auth = createAuth({
      allowedUsers: ['allowed@example.com', 'test@example.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
      expect(err).toBeNull();
      expect(user).toBeDefined();
    });
  });

  it('should reject user when not in allowedUsers list', () => {
    const auth = createAuth({
      allowedUsers: ['allowed@example.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User',
      emails: [{ value: 'blocked@example.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user, info) => {
      expect(user).toBe(false);
      expect(info.message).toBe('User not authorized');
    });
  });

  it('should reject user when email is missing and allowedUsers is set', () => {
    const auth = createAuth({
      allowedUsers: ['allowed@example.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User',
      emails: []
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user, info) => {
      expect(user).toBe(false);
      expect(info.message).toBe('User not authorized');
    });
  });

  it('should verify user when domain is in allowedDomains list', () => {
    const auth = createAuth({
      allowedDomains: ['example.com', 'trusted.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User',
      emails: [{ value: 'user@example.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
      expect(err).toBeNull();
      expect(user).toBeDefined();
    });
  });

  it('should reject user when domain is not in allowedDomains list', () => {
    const auth = createAuth({
      allowedDomains: ['trusted.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User',
      emails: [{ value: 'user@untrusted.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user, info) => {
      expect(user).toBe(false);
      expect(info.message).toBe('Domain not authorized');
    });
  });

  it('should reject user when email is missing and allowedDomains is set', () => {
    const auth = createAuth({
      allowedDomains: ['example.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile = {
      id: 'user-123',
      displayName: 'Test User'
    };

    verifyCallback('access-token', 'refresh-token', profile, (err, user, info) => {
      expect(user).toBe(false);
      expect(info.message).toBe('Email required for domain validation');
    });
  });

  it('should require both allowedUsers AND allowedDomains when both are set', () => {
    const auth = createAuth({
      allowedUsers: ['specific@example.com'],
      allowedDomains: ['example.com']
    });
    const verifyCallback = auth._defaultVerifyCallback.bind(auth);

    const profile1 = {
      id: 'user-123',
      displayName: 'Test User',
      emails: [{ value: 'other@example.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile1, (err, user, info) => {
      expect(user).toBe(false);
      expect(info.message).toBe('User not authorized');
    });

    const profile2 = {
      id: 'user-456',
      displayName: 'Test User',
      emails: [{ value: 'specific@example.com' }]
    };

    verifyCallback('access-token', 'refresh-token', profile2, (err, user) => {
      expect(err).toBeNull();
      expect(user).toBeDefined();
    });
  });
});
