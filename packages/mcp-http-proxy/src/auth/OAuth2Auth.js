#!/usr/bin/env node

/**
 * OAuth 2.0 Authentication Module for MCP HTTP Proxy
 *
 * Provides Passport.js-based OAuth 2.0 authentication for securing MCP proxies.
 * Supports generic OAuth 2.0 providers (GitHub, Google, GitLab, Auth0, etc.)
 */

import passport from 'passport';
import { OAuth2Strategy } from 'passport-oauth2';

/**
 * OAuth 2.0 Authentication Manager
 *
 * Manages OAuth 2.0 authentication flow using Passport.js
 */
export class OAuth2Auth {
  /**
   * @param {Object} config - OAuth configuration
   * @param {Object} config.provider - OAuth provider configuration
   * @param {string} config.provider.authorizationURL - OAuth authorization URL
   * @param {string} config.provider.tokenURL - OAuth token URL
   * @param {string} config.provider.clientID - OAuth client ID
   * @param {string} config.provider.clientSecret - OAuth client secret
   * @param {string} config.provider.callbackURL - OAuth callback URL
   * @param {string} [config.provider.scope] - OAuth scope (default: 'openid email profile')
   * @param {Function} [config.verifyCallback] - Custom verify callback (optional)
   * @param {Object} config.session - Session configuration
   * @param {string} [config.session.secret] - Session secret (required)
   * @param {string} [config.session.secretEnvVar] - Environment variable containing session secret
   * @param {number} [config.session.maxAge] - Session max age in ms (default: 24 hours)
   * @param {boolean} [config.session.secure] - Force secure cookies (default: auto-detect)
   * @param {string[]} [config.allowedUsers] - List of allowed user emails (optional)
   * @param {string[]} [config.allowedDomains] - List of allowed email domains (optional)
   */
  constructor(config) {
    this.config = config;
    this.isAuthenticated = false;

    if (!config.provider) {
      throw new Error('OAuth provider configuration is required');
    }

    if (!config.provider.clientID || !config.provider.clientSecret) {
      throw new Error('OAuth clientID and clientSecret are required');
    }

    // Get session secret from config or environment
    this.sessionSecret = this._getSessionSecret();

    if (!this.sessionSecret) {
      throw new Error('Session secret is required. Set session.secret or session.secretEnvVar');
    }

    this._setupStrategy();
  }

  /**
   * Get session secret from configuration or environment
   * @private
   */
  _getSessionSecret() {
    if (this.config.session?.secret) {
      return this.config.session.secret;
    }
    if (this.config.session?.secretEnvVar) {
      return process.env[this.config.session.secretEnvVar];
    }
    return process.env.SESSION_SECRET;
  }

  /**
   * Setup Passport OAuth 2.0 strategy
   * @private
   */
  _setupStrategy() {
    const provider = this.config.provider;
    const scope = provider.scope || 'openid email profile';

    const verifyCallback = this.config.verifyCallback || this._defaultVerifyCallback.bind(this);

    passport.use('oauth2', new OAuth2Strategy(
      {
        authorizationURL: provider.authorizationURL,
        tokenURL: provider.tokenURL,
        clientID: provider.clientID,
        clientSecret: provider.clientSecret,
        callbackURL: provider.callbackURL,
        scope,
        // Skip profile fetch if userInfoURL is not provided
        skipProfile: !provider.userInfoURL
      },
      verifyCallback
    ));

    // Serialize user to session
    passport.serializeUser((user, done) => {
      done(null, user);
    });

    // Deserialize user from session
    passport.deserializeUser((user, done) => {
      done(null, user);
    });
  }

  /**
   * Default verify callback for OAuth 2.0
   * Validates user against allowed users/domains if configured
   * @private
   */
  _defaultVerifyCallback(accessToken, refreshToken, profile, done) {
    try {
      // Extract user info from profile or access token response
      const user = {
        id: profile.id || null,
        email: profile.emails?.[0]?.value || null,
        displayName: profile.displayName || null,
        accessToken,
        refreshToken
      };

      // Check if user is allowed
      if (this.config.allowedUsers?.length > 0) {
        if (!user.email || !this.config.allowedUsers.includes(user.email)) {
          return done(null, false, { message: 'User not authorized' });
        }
      }

      // Check if user's domain is allowed
      if (this.config.allowedDomains?.length > 0) {
        if (!user.email) {
          return done(null, false, { message: 'Email required for domain validation' });
        }
        const domain = user.email.split('@')[1];
        if (!this.config.allowedDomains.includes(domain)) {
          return done(null, false, { message: 'Domain not authorized' });
        }
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }

  /**
   * Get session configuration
   * @returns {Object} Express-session configuration
   */
  getSessionConfig() {
    const isSecure = this.config.session?.secure ?? process.env.NODE_ENV === 'production';

    return {
      secret: this.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        maxAge: this.config.session?.maxAge || 24 * 60 * 60 * 1000 // 24 hours
      },
      name: 'mcp_proxy_session'
    };
  }

  /**
   * Initialize Passport middleware
   * @returns {Function} Passport initialize middleware
   */
  getInitializeMiddleware() {
    return passport.initialize();
  }

  /**
   * Get Passport session middleware
   * @returns {Function} Passport session middleware
   */
  getSessionMiddleware() {
    return passport.session();
  }

  /**
   * Get authentication middleware for protected routes
   * @returns {Function} Express middleware for authentication
   */
  getAuthenticateMiddleware() {
    return (req, res, next) => {
      // Allow health endpoint without authentication
      if (req.path === '/health') {
        return next();
      }
      passport.authenticate('session')(req, res, (err) => {
        if (err) return next(err);
        if (!req.user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
          });
        }
        next();
      });
    };
  }

  /**
   * Get authentication endpoint routes
   * @returns {Object} Express router with auth routes
   */
  getAuthRoutes() {
    const express = require('express');
    const router = express.Router();

    // Login - redirect to OAuth provider
    router.get('/login', passport.authenticate('oauth2'));

    // OAuth callback
    router.get('/callback',
      passport.authenticate('oauth2', {
        successReturnToOrRedirect: '/',
        failureRedirect: '/login?error=failed'
      })
    );

    // Logout
    router.post('/logout', (req, res, next) => {
      req.logout((err) => {
        if (err) return next(err);
        res.json({ success: true });
      });
    });

    // Get current user info
    router.get('/me', (req, res) => {
      if (req.user) {
        res.json({
          authenticated: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            displayName: req.user.displayName
          }
        });
      } else {
        res.status(401).json({
          authenticated: false,
          message: 'Not authenticated'
        });
      }
    });

    return router;
  }

  /**
   * Check if authentication is configured and enabled
   * @returns {boolean}
   */
  isEnabled() {
    return !!this.sessionSecret;
  }
}

/**
 * Predefined OAuth provider configurations
 *
 * Common OAuth 2.0 providers with their standard endpoints
 */
export const OAuthProviders = {
  GITHUB: {
    name: 'GitHub',
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    userInfoURL: 'https://api.github.com/user',
    scope: 'user:email read:user'
  },
  GOOGLE: {
    name: 'Google',
    authorizationURL: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenURL: 'https://oauth2.googleapis.com/token',
    userInfoURL: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scope: 'openid email profile'
  },
  GITLAB: {
    name: 'GitLab',
    authorizationURL: 'https://gitlab.com/oauth/authorize',
    tokenURL: 'https://gitlab.com/oauth/token',
    userInfoURL: 'https://gitlab.com/api/v4/user',
    scope: 'openid email profile'
  },
  AUTH0: {
    name: 'Auth0',
    // Auth0 requires domain-specific URLs
    getAuthorizationURL: (domain) => `https://${domain}/authorize`,
    getTokenURL: (domain) => `https://${domain}/oauth/token`,
    getUserInfoURL: (domain) => `https://${domain}/userinfo`,
    scope: 'openid email profile'
  }
};

export default OAuth2Auth;
