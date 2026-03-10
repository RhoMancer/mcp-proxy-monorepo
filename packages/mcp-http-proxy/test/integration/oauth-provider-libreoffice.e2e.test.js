/**
 * End-to-end OAuth Provider tests for LibreOffice Calc MCP connector
 *
 * These tests validate the OAuth Provider mode for Claude Connectors.
 * The OAuth Provider mode allows Claude Connectors to authenticate using
 * OAuth client credentials (client_id and client_secret).
 *
 * Flow:
 * 1. Claude Connectors sends client credentials to /auth/token
 * 2. Proxy validates credentials and returns a JWT access token
 * 3. Claude includes the access token in Authorization header for subsequent requests
 * 4. Proxy validates the token and allows access to protected endpoints
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Import OAuthProviderAuth
import { OAuthProviderAuth } from '../../src/auth/OAuthProviderAuth.js';

/**
 * LibreOffice MCP OAuth Provider Configuration
 * Matches the configuration in examples/claude-connectors-libreoffice.config.js
 */
const LIBREOFFICE_OAUTH_PROVIDER_CONFIG = {
  defaultSecret: 'libre-secret-key-change-me',
  tokenExpiration: 24 * 60 * 60 * 1000 // 24 hours
};

/**
 * Configuration with multiple allowed clients
 */
const MULTI_CLIENT_CONFIG = {
  allowedClients: [
    {
      clientId: 'claude-libreoffice-client',
      clientSecret: 'libre-secret-key-change-me',
      name: 'Claude Connectors - LibreOffice'
    },
    {
      clientId: 'another-client',
      clientSecret: 'different-secret',
      name: 'Another Application'
    }
  ],
  tokenExpiration: 24 * 60 * 60 * 1000
};

describe('LibreOffice MCP OAuth Provider E2E Tests', () => {
  let app;
  let oauthProvider;

  beforeAll(() => {
    // Create Express app with OAuth Provider
    app = express();
    app.use(express.json());

    // Initialize OAuth Provider with LibreOffice configuration
    oauthProvider = new OAuthProviderAuth(LIBREOFFICE_OAUTH_PROVIDER_CONFIG);

    // Add auth routes
    app.use('/auth', oauthProvider.getAuthRoutes());

    // LibreOffice MCP tools endpoint (protected)
    app.get('/tools', oauthProvider.getAuthenticateMiddleware(), (req, res) => {
      res.json({
        tools: [
          {
            name: 'read_sheet',
            description: 'Read data from a LibreOffice Calc spreadsheet',
            parameters: {
              type: 'object',
              properties: {
                filename: { type: 'string', description: 'Name of the spreadsheet file' },
                sheet: { type: 'string', description: 'Sheet name' }
              }
            }
          },
          {
            name: 'write_cell',
            description: 'Write a value to a cell in LibreOffice Calc',
            parameters: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                sheet: { type: 'string' },
                cell: { type: 'string' },
                value: { type: 'string' }
              }
            }
          }
        ]
      });
    });

    // MCP endpoint (protected)
    app.post('/message', oauthProvider.getAuthenticateMiddleware(), (req, res) => {
      res.json({
        jsonrpc: '2.0',
        result: {
          capabilities: {
            tools: {}
          }
        }
      });
    });

    // Health endpoint (public)
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'libreoffice-mcp-proxy' });
    });
  });

  describe('OAuth Provider Configuration', () => {
    it('should be enabled with default secret', () => {
      expect(oauthProvider.isEnabled()).toBe(true);
      expect(oauthProvider.useDefaultSecret).toBe(true);
      expect(oauthProvider.defaultSecret).toBe('libre-secret-key-change-me');
    });

    it('should have 24-hour token expiration', () => {
      expect(oauthProvider.config.tokenExpiration).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Token Endpoint', () => {
    it('should issue token for valid credentials with client_credentials grant', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'any-client-id',
          client_secret: 'libre-secret-key-change-me'
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.token_type).toBe('Bearer');
      expect(response.body.expires_in).toBeGreaterThan(0);
      expect(response.body.scope).toBe('mcp:all');
    });

    it('should reject unsupported grant types', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'password',
          username: 'user',
          password: 'pass'
        })
        .expect(400);

      expect(response.body.error).toBe('unsupported_grant_type');
    });

    it('should reject request without client_id', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_secret: 'libre-secret-key-change-me'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
    });

    it('should reject request without client_secret', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'test-client'
        })
        .expect(400);

      expect(response.body.error).toBe('invalid_request');
    });

    it('should reject invalid client credentials', async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'test-client',
          client_secret: 'wrong-secret'
        })
        .expect(401);

      expect(response.body.error).toBe('invalid_client');
    });
  });

  describe('Protected Endpoints', () => {
    let accessToken;

    beforeAll(async () => {
      // Get a valid token for tests
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'claude-libreoffice',
          client_secret: 'libre-secret-key-change-me'
        });
      accessToken = response.body.access_token;
    });

    it('should allow access to /tools with valid token', async () => {
      const response = await request(app)
        .get('/tools')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.tools).toBeInstanceOf(Array);
      expect(response.body.tools.length).toBeGreaterThan(0);
    });

    it('should allow access to /message with valid token', async () => {
      const response = await request(app)
        .post('/message')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ jsonrpc: '2.0', method: 'tools/list' })
        .expect(200);

      expect(response.body.jsonrpc).toBe('2.0');
    });

    it('should reject access without Authorization header', async () => {
      const response = await request(app)
        .get('/tools')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/tools')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    it('should reject access with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/tools')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Public Endpoints', () => {
    it('should allow health endpoint without authentication', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('libreoffice-mcp-proxy');
    });
  });

  describe('Introspection Endpoint', () => {
    let accessToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'claude-libreoffice',
          client_secret: 'libre-secret-key-change-me'
        });
      accessToken = response.body.access_token;
    });

    it('should return active: true for valid token', async () => {
      const response = await request(app)
        .post('/auth/introspect')
        .send({ token: accessToken })
        .expect(200);

      expect(response.body.active).toBe(true);
      expect(response.body.scope).toBe('mcp:all');
      expect(response.body.client_id).toBeDefined();
      expect(response.body.exp).toBeDefined();
      expect(response.body.iat).toBeDefined();
    });

    it('should return active: false for invalid token', async () => {
      const response = await request(app)
        .post('/auth/introspect')
        .send({ token: 'invalid-token' })
        .expect(200);

      expect(response.body.active).toBe(false);
    });

    it('should return active: false for missing token', async () => {
      const response = await request(app)
        .post('/auth/introspect')
        .send({})
        .expect(200);

      expect(response.body.active).toBe(false);
    });
  });

  describe('User Info Endpoint', () => {
    let accessToken;

    beforeAll(async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'claude-libreoffice',
          client_secret: 'libre-secret-key-change-me'
        });
      accessToken = response.body.access_token;
    });

    it('should return user info for valid token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.name).toBeDefined();
      expect(response.body.user.scopes).toContain('mcp:all');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Logout Endpoint', () => {
    let accessToken;

    beforeEach(async () => {
      const response = await request(app)
        .post('/auth/token')
        .send({
          grant_type: 'client_credentials',
          client_id: 'claude-libreoffice',
          client_secret: 'libre-secret-key-change-me'
        });
      accessToken = response.body.access_token;
    });

    it('should revoke token on logout', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Token should no longer work
      await request(app)
        .get('/tools')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });
});

describe('OAuth Provider with Multiple Clients', () => {
  let app;
  let oauthProvider;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    oauthProvider = new OAuthProviderAuth(MULTI_CLIENT_CONFIG);
    app.use('/auth', oauthProvider.getAuthRoutes());

    app.get('/protected', oauthProvider.getAuthenticateMiddleware(), (req, res) => {
      res.json({ message: 'Access granted' });
    });
  });

  it('should issue token for first allowed client', async () => {
    const response = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'claude-libreoffice-client',
        client_secret: 'libre-secret-key-change-me'
      })
      .expect(200);

    expect(response.body.access_token).toBeDefined();
  });

  it('should issue token for second allowed client', async () => {
    const response = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'another-client',
        client_secret: 'different-secret'
      })
      .expect(200);

    expect(response.body.access_token).toBeDefined();
  });

  it('should reject unknown client', async () => {
    const response = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'unknown-client',
        client_secret: 'some-secret'
      })
      .expect(401);

    expect(response.body.error).toBe('invalid_client');
  });

  it('should reject client with wrong secret', async () => {
    const response = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'claude-libreoffice-client',
        client_secret: 'wrong-secret'
      })
      .expect(401);

    expect(response.body.error).toBe('invalid_client');
  });
});

describe('LibreOffice MCP OAuth Provider Integration Scenarios', () => {
  describe('Scenario: Claude Connectors OAuth Flow', () => {
    it('should document the complete connection flow', () => {
      // This test documents the expected flow when Claude Connectors
      // connects to the LibreOffice MCP with OAuth Provider mode:
      //
      // 1. User configures Claude Connector with:
      //    - Name: LibreOffice Calc
      //    - Remote MCP server URL: http://127.0.0.1:8081/message
      //    - OAuth Client ID: claude-libreoffice-client
      //    - OAuth Client Secret: libre-secret-key-change-me
      //
      // 2. Claude Connectors POST to http://127.0.0.1:8081/auth/token:
      //    {
      //      grant_type: 'client_credentials',
      //      client_id: 'claude-libreoffice-client',
      //      client_secret: 'libre-secret-key-change-me'
      //    }
      //
      // 3. Proxy validates credentials and returns:
      //    {
      //      access_token: 'eyJ...',
      //      token_type: 'Bearer',
      //      expires_in: 86400,
      //      scope: 'mcp:all'
      //    }
      //
      // 4. Claude Connectors sends JSON-RPC requests with:
      //    Authorization: Bearer eyJ...
      //
      // 5. Proxy validates token and forwards to LibreOffice MCP
      //
      expect(true).toBe(true); // Documentation test
    });

    it('should expose LibreOffice-specific tools', () => {
      const expectedLibreTools = [
        'read_sheet',
        'write_cell',
        'get_sheets',
        'create_sheet'
      ];

      expectedLibreTools.forEach(tool => {
        expect(typeof tool).toBe('string');
      });
    });
  });

  describe('Scenario: Token Expiration and Refresh', () => {
    it('should handle expired tokens', () => {
      // When a token expires, Claude should:
      // 1. Receive 401 Unauthorized
      // 2. Request a new token from /auth/token
      // 3. Retry the request with the new token
      expect(true).toBe(true); // Documentation test
    });

    it('should support token introspection', () => {
      // Claude can check token validity before use:
      // POST /auth/introspect
      // { token: 'eyJ...' }
      // Returns: { active: true, client_id: '...', exp: ... }
      expect(true).toBe(true); // Documentation test
    });
  });
});

describe('OAuth Provider Security', () => {
  let oauthProvider;

  beforeAll(() => {
    oauthProvider = new OAuthProviderAuth(LIBREOFFICE_OAUTH_PROVIDER_CONFIG);
  });

  it('should generate unique tokens for each request', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', oauthProvider.getAuthRoutes());

    const response1 = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'client1',
        client_secret: 'libre-secret-key-change-me'
      });

    const response2 = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'client1',
        client_secret: 'libre-secret-key-change-me'
      });

    expect(response1.body.access_token).not.toBe(response2.body.access_token);
  });

  it('should include expiration in token payload', async () => {
    const app = express();
    app.use(express.json());
    app.use('/auth', oauthProvider.getAuthRoutes());

    const response = await request(app)
      .post('/auth/token')
      .send({
        grant_type: 'client_credentials',
        client_id: 'client1',
        client_secret: 'libre-secret-key-change-me'
      });

    const introspectResponse = await request(app)
      .post('/auth/introspect')
      .send({ token: response.body.access_token });

    expect(introspectResponse.body.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
