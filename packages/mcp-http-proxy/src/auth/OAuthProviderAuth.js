#!/usr/bin/env node

/**
 * OAuth Provider Authentication Module for MCP HTTP Proxy
 *
 * This module enables the mcp-proxy to act as an OAuth 2.0 provider for Claude Connectors.
 * It validates OAuth client credentials (client_id, client_secret) and issues JWT access tokens.
 *
 * Flow:
 * 1. Claude Connectors sends client_id and client_secret to /auth/token
 * 2. Proxy validates credentials and returns a JWT access token
 * 3. Claude includes the access token in Authorization header for subsequent requests
 * 4. Proxy validates the token and allows access to protected endpoints
 *
 * Compatible with Claude Connectors "Add custom connector" OAuth fields.
 */

import crypto from 'crypto';
import { promisify } from 'util';
import express from 'express';

const randomBytes = promisify(crypto.randomBytes);

/**
 * Simple in-memory token store
 * For production, use Redis or a database
 */
class TokenStore {
  constructor() {
    this.tokens = new Map();
    this.revokedTokens = new Set();
  }

  /**
   * Generate a unique token ID
   */
  generateTokenId() {
    return crypto.randomUUID();
  }

  /**
   * Store a token
   */
  async storeToken(tokenId, payload) {
    const expiresAt = Date.now() + (payload.expiresIn || 24 * 60 * 60 * 1000);
    this.tokens.set(tokenId, {
      ...payload,
      expiresAt
    });
    return tokenId;
  }

  /**
   * Get a token
   */
  async getToken(tokenId) {
    const token = this.tokens.get(tokenId);
    if (!token) {
      return null;
    }
    if (this.revokedTokens.has(tokenId)) {
      return null;
    }
    if (token.expiresAt < Date.now()) {
      this.tokens.delete(tokenId);
      return null;
    }
    return token;
  }

  /**
   * Revoke a token
   */
  async revokeToken(tokenId) {
    this.revokedTokens.add(tokenId);
  }

  /**
   * Clean up expired tokens
   */
  async cleanup() {
    const now = Date.now();
    for (const [id, token] of this.tokens.entries()) {
      if (token.expiresAt < now || this.revokedTokens.has(id)) {
        this.tokens.delete(id);
      }
    }
  }
}

/**
 * OAuth Provider Authentication Manager
 *
 * Validates OAuth client credentials and issues access tokens
 */
export class OAuthProviderAuth {
  /**
   * @param {Object} config - OAuth Provider configuration
   * @param {Object} config.clients - Map of allowed OAuth clients
   * @param {string} config.defaultSecret - Default secret for all clients (simple mode)
   * @param {Array<Object>} config.allowedClients - Array of allowed client objects
   * @param {string} config.allowedClients[].clientId - Client ID
   * @param {string} config.allowedClients[].clientSecret - Client secret
   * @param {string} [config.allowedClients[].name] - Client name for logging
   * @param {number} [config.tokenExpiration] - Token expiration time in ms (default: 24 hours)
   * @param {string} [config.tokenSecret] - Secret for signing tokens (default: auto-generated)
   */
  constructor(config) {
    this.config = config;
    this.tokenStore = new TokenStore();
    this.tokenSecret = config.tokenSecret || this._generateSecret();

    // Store authorization codes temporarily (for PKCE flow)
    this.authCodes = new Map();

    // Build client lookup map
    this.clients = new Map();

    if (config.allowedClients && Array.isArray(config.allowedClients)) {
      for (const client of config.allowedClients) {
        this.clients.set(client.clientId, {
          clientSecret: client.clientSecret,
          name: client.name || client.clientId
        });
      }
    } else if (config.defaultSecret) {
      // Simple mode: any client_id works with the default secret
      this.useDefaultSecret = true;
      this.defaultSecret = config.defaultSecret;
    }

    // Start periodic cleanup
    this._cleanupInterval = setInterval(() => {
      this.tokenStore.cleanup();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Generate a random secret for token signing
   * @private
   */
  _generateSecret() {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Create a JWT-like access token
   * Note: Using simple HMAC signing. For production, use a proper JWT library.
   * @private
   */
  _createToken(payload) {
    const header = {
      alg: 'HS256',
      typ: 'Bearer'
    };

    const tokenId = this.tokenStore.generateTokenId();
    const now = Date.now();
    const expiresIn = this.config.tokenExpiration || 24 * 60 * 60 * 1000;

    const tokenPayload = {
      jti: tokenId,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + expiresIn) / 1000),
      ...payload
    };

    // Store token data
    this.tokenStore.storeToken(tokenId, tokenPayload);

    // Create JWT (simplified - using base64url encoding)
    const headerB64 = Buffer.from(JSON.stringify(header))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const payloadB64 = Buffer.from(JSON.stringify(tokenPayload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const signature = crypto
      .createHmac('sha256', this.tokenSecret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Verify and decode a JWT token
   * @private
   */
  async _verifyToken(token) {
    try {
      const [headerB64, payloadB64, signature] = token.split('.');

      if (!headerB64 || !payloadB64 || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.tokenSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64').toString()
      );

      // Check expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      // Check if token is revoked
      const storedToken = await this.tokenStore.getToken(payload.jti);
      if (!storedToken) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate OAuth client credentials
   * @param {string} clientId - OAuth client ID
   * @param {string} clientSecret - OAuth client secret
   * @returns {boolean}
   */
  validateClient(clientId, clientSecret) {
    if (this.useDefaultSecret) {
      return clientSecret === this.defaultSecret;
    }

    const client = this.clients.get(clientId);
    if (!client) {
      return false;
    }

    return client.clientSecret === clientSecret;
  }

  /**
   * Issue an access token for valid credentials
   * @param {string} clientId - OAuth client ID
   * @returns {Object} Token response
   */
  issueToken(clientId) {
    const clientName = this.useDefaultSecret
      ? clientId
      : (this.clients.get(clientId)?.name || clientId);

    const token = this._createToken({
      sub: clientId,
      name: clientName,
      scope: 'mcp:all'
    });

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: Math.floor((this.config.tokenExpiration || 24 * 60 * 60 * 1000) / 1000),
      scope: 'mcp:all'
    };
  }

  /**
   * Authenticate middleware for Express
   * Validates Bearer token on Authorization header
   * @returns {Function} Express middleware
   */
  getAuthenticateMiddleware() {
    return async (req, res, next) => {
      // Allow health endpoint without authentication
      if (req.path === '/health') {
        return next();
      }

      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid Authorization header'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const payload = await this._verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token'
        });
      }

      // Attach user info to request
      req.user = {
        id: payload.sub,
        name: payload.name,
        clientId: payload.sub,
        scopes: payload.scope?.split(' ') || ['mcp:all']
      };

      next();
    };
  }

  /**
   * Get authentication routes for Express
   * @returns {Object} Express router with auth routes
   */
  getAuthRoutes() {
    const router = express.Router();

    /**
     * Authorization endpoint - OAuth 2.0 Authorization Endpoint
     * Handles Claude Connectors authorization requests with PKCE
     *
     * GET /auth/authorize or /authorize
     * Query: response_type, client_id, redirect_uri, code_challenge, code_challenge_method, state, scope
     */
    router.get('/authorize', (req, res) => {
      const {
        response_type,
        client_id,
        redirect_uri,
        code_challenge,
        code_challenge_method,
        state,
        scope
      } = req.query;

      // Validate required parameters
      if (!response_type || response_type !== 'code') {
        return res.status(400).send('Invalid response_type. Must be "code".');
      }

      if (!client_id) {
        return res.status(400).send('Missing client_id');
      }

      if (!redirect_uri) {
        return res.status(400).send('Missing redirect_uri');
      }

      if (!code_challenge) {
        return res.status(400).send('Missing code_challenge (PKCE required)');
      }

      if (!code_challenge_method || code_challenge_method !== 'S256') {
        return res.status(400).send('code_challenge_method must be S256');
      }

      // Generate authorization code
      const authCode = crypto.randomBytes(32).toString('base64url');

      // Store the code with its associated data for later verification
      this.authCodes.set(authCode, {
        clientId: client_id,
        redirectUri: redirect_uri,
        codeChallenge: code_challenge,
        codeChallengeMethod: code_challenge_method,
        scope: scope || 'claudeai',
        expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
      });

      console.log(`[OAuth] Generated auth code for client: ${client_id}`);

      // Redirect back to Claude with the authorization code
      const redirectUrl = new URL(redirect_uri);
      redirectUrl.searchParams.set('code', authCode);
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      console.log(`[OAuth] Redirecting to: ${redirectUrl.href}`);
      res.redirect(redirectUrl.href);
    });

    /**
     * Token endpoint - OAuth 2.0 Token Endpoint
     * Supports both client_credentials and authorization_code (PKCE) flows
     *
     * POST /auth/token
     */
    router.post('/token', (req, res) => {
      const { grant_type, client_id, client_secret, code, redirect_uri, code_verifier } = req.body;

      // Debug logging
      console.log('[OAuth] /token request:', {
        grant_type,
        client_id,
        has_code: !!code,
        has_code_verifier: !!code_verifier,
        has_client_secret: !!client_secret,
        body_keys: Object.keys(req.body)
      });

      if (grant_type === 'authorization_code') {
        // Authorization Code Flow with PKCE (for Claude Connectors)
        if (!code) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing authorization code'
          });
        }

        if (!code_verifier) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing code_verifier (PKCE required)'
          });
        }

        // Look up the authorization code
        const authCodeData = this.authCodes.get(code);
        if (!authCodeData) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid or expired authorization code'
          });
        }

        // Check if code has expired
        if (authCodeData.expiresAt < Date.now()) {
          this.authCodes.delete(code);
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Authorization code has expired'
          });
        }

        // Verify redirect URI matches
        if (redirect_uri && redirect_uri !== authCodeData.redirectUri) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Redirect URI mismatch'
          });
        }

        // Verify PKCE code challenge
        const expectedChallenge = crypto
          .createHash('sha256')
          .update(code_verifier)
          .digest('base64url');

        if (authCodeData.codeChallenge !== expectedChallenge) {
          return res.status(400).json({
            error: 'invalid_grant',
            error_description: 'Invalid code_verifier'
          });
        }

        // Delete the used authorization code (single use)
        this.authCodes.delete(code);

        // For auth code flow, accept any client_id that was used in the authorize step
        const tokenResponse = this.issueToken(authCodeData.clientId);
        console.log(`[OAuth] Issued token via authorization_code for: ${authCodeData.clientId}`);
        res.json(tokenResponse);

      } else if (grant_type === 'client_credentials') {
        // Client Credentials Flow (simple mode)
        if (!client_id || !client_secret) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'client_id and client_secret are required'
          });
        }

        if (!this.validateClient(client_id, client_secret)) {
          return res.status(401).json({
            error: 'invalid_client',
            error_description: 'Invalid client credentials'
          });
        }

        const tokenResponse = this.issueToken(client_id);
        console.log(`[OAuth] Issued token via client_credentials for: ${client_id}`);
        res.json(tokenResponse);

      } else {
        return res.status(400).json({
          error: 'unsupported_grant_type',
          error_description: 'Supported grant types: authorization_code, client_credentials'
        });
      }
    });

    /**
     * Introspect endpoint - Check token validity
     *
     * POST /auth/introspect
     * Body: { token: string }
     */
    router.post('/introspect', async (req, res) => {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'token is required'
        });
      }

      const payload = await this._verifyToken(token);

      if (!payload) {
        return res.json({
          active: false
        });
      }

      res.json({
        active: true,
        scope: payload.scope,
        client_id: payload.sub,
        exp: payload.exp,
        iat: payload.iat
      });
    });

    /**
     * Get current user info
     * Requires valid Bearer token
     */
    router.get('/me', async (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing Authorization header'
        });
      }

      const token = authHeader.substring(7);
      const payload = await this._verifyToken(token);

      if (!payload) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid token'
        });
      }

      res.json({
        authenticated: true,
        user: {
          id: payload.sub,
          name: payload.name,
          scopes: payload.scope?.split(' ') || []
        }
      });
    });

    /**
     * Logout / Revoke token
     */
    router.post('/logout', async (req, res) => {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing Authorization header'
        });
      }

      const token = authHeader.substring(7);
      const payload = await this._verifyToken(token);

      if (payload) {
        await this.tokenStore.revokeToken(payload.jti);
      }

      res.json({ success: true });
    });

    return router;
  }

  /**
   * Check if authentication is enabled
   * @returns {boolean}
   */
  isEnabled() {
    return this.useDefaultSecret || this.clients.size > 0;
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this.tokenStore.cleanup();
  }
}

export default OAuthProviderAuth;
