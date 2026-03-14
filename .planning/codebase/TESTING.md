# Testing Patterns

**Analysis Date:** 2026-03-13

## Test Framework

**Runner:**
- Vitest 2.0.0 for JavaScript/Node.js tests
- Config: `packages/mcp-http-proxy/vitest.config.js`
- pytest for Python tests (configured but no test files found)

**Assertion Library:**
- Built-in Vitest `expect` for JavaScript
- Python standard assertions (configured via pytest)

**Run Commands:**
```bash
# From packages/mcp-http-proxy/
npm test                # Run all tests (vitest)
npm run test:ui         # Run with UI
npm run test:run        # Run once (watch mode disabled)
npm run test:coverage   # Run with coverage

# From monorepo root
npm test                # Run validation tests via .validation/run-tests.js
npm run test:oauth      # Run OAuth validation only
npm run test:libreoffice # Run LibreOffice validation only
```

## Test File Organization

**Location:**
- Co-located with source files: `src/auth/OAuth2Auth.test.js` next to `OAuth2Auth.js`
- Integration tests: `test/integration/` directory
- Validation tests: `.validation/` directory at monorepo root

**Naming:**
- Unit tests: `{ModuleName}.test.js`
- Integration tests: `{feature}.integration.test.js` or `{feature}.e2e.test.js`
- Manual tests: `{feature}-test.js` in `test/manual/`

**Structure:**
```
packages/mcp-http-proxy/
├── src/
│   ├── auth/
│   │   ├── OAuth2Auth.js
│   │   ├── OAuth2Auth.test.js          # Unit tests
│   │   ├── validateConfig.js
│   │   └── validateConfig.test.js      # Unit tests
│   └── ...
├── test/
│   ├── setup.js                         # Global test setup
│   ├── integration/
│   │   ├── oauth.integration.test.js    # Integration tests
│   │   ├── oauth-hevy.e2e.test.js      # E2E tests
│   │   └── oauth-provider-libreoffice.e2e.test.js
│   └── manual/
│       └── oauth-provider-test.js      # Manual test scripts

.validation/                                  # Monorepo-level tests
├── oauth-validation.test.js                 # OAuth flow validation
├── oauth-e2e.test.js                        # OAuth end-to-end
├── libreoffice-validation.test.js           # LibreOffice validation
└── run-tests.js                             # Test runner
```

## Test Structure

**Suite Organization:**

```javascript
// From OAuth2Auth.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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
    const validConfig = { /* ... */ };

    it('should create instance with valid config', () => {
      const auth = new OAuth2Auth(validConfig);
      expect(auth).toBeInstanceOf(OAuth2Auth);
      expect(auth.sessionSecret).toBe('test-session-secret');
    });

    it('should throw error when provider config is missing', () => {
      expect(() => new OAuth2Auth({})).toThrow('OAuth provider configuration is required');
    });
  });
});
```

**Patterns:**
- Group related tests in nested `describe` blocks
- Use `beforeEach`/`afterEach` for setup/teardown
- Create test data with factory functions (`createValidConfig()`)
- Test both success and failure paths
- Use descriptive test names (`should X when Y`)

**Setup Pattern:**
```javascript
// From test/setup.js - Must be loaded before source imports
import { vi } from 'vitest';

// Mock passport - must be before any imports that use it
vi.mock('passport', () => {
  const passport = {
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    initialize: vi.fn(() => (req, res, next) => next()),
    // ...
  };
  return { default: passport };
});
```

**Teardown Pattern:**
- Restore environment variables in `afterEach`
- Clear mocks between tests
- Close server connections in `afterAll`

## Mocking

**Framework:** Vitest `vi` for JavaScript

**Patterns:**

```javascript
// Mocking Node.js built-in modules
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn()
}));

// Mocking external dependencies
vi.mock('passport', () => ({
  default: {
    use: vi.fn(),
    authenticate: vi.fn()
  }
}));

// Setting mock return values
vi.spyOn(fs, 'existsSync').mockReturnValue(true);
vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(validConfig));

// Spying on console
consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

// Restore mocks
consoleLogSpy.mockRestore();
```

**What to Mock:**
- External dependencies (Passport, Express middleware)
- File system operations (`fs.existsSync`, `fs.readFileSync`)
- Environment variables (`process.env`)
- HTTP clients in integration tests
- Console output for testing CLI tools

**What NOT to Mock:**
- Core business logic under test
- Simple utility functions
- Data transformation logic

**Integration Test Mocking:**
```javascript
// From oauth.integration.test.js - complex mocking
vi.mock('passport', () => {
  const passport = {
    initialize: vi.fn(() => (req, res, next) => {
      req.passport = {};
      next();
    }),
    session: vi.fn(() => (req, res, next) => {
      req.user = req.session?.user || null;
      next();
    }),
    authenticate: vi.fn((strategy, options) => {
      return (req, res, next) => {
        // Complex mock logic for session testing
      };
    })
  };
  return { default: passport };
});
```

## Fixtures and Factories

**Test Data:**
```javascript
// Factory function pattern
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

// Usage in tests
it('should return error when field is not a string', () => {
  const config = createValidConfig();
  config.auth.provider.clientID = 12345;
  const result = validateOAuthConfig(config);
  expect(result.errors).toContain('Field provider.clientID must be a string');
});
```

**Location:**
- Test fixtures defined inline in test files
- No shared fixtures directory
- Factory functions defined within `describe` blocks

**Configuration Fixtures:**
- Test configs in `examples/` directory (e.g., `echo-test.config.js`)
- OAuth test config: `.validation/test-oauth.config.js`

## Coverage

**Requirements:** None explicitly enforced

**Configuration:**
```javascript
// From vitest.config.js
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/**/*.js'],
  exclude: ['src/**/*.test.js', 'src/**/*.spec.js']
}
```

**View Coverage:**
```bash
npm run test:coverage
# Generates HTML report in coverage/ directory
```

**Current Coverage:**
- Tests exist for: `OAuth2Auth`, `validateConfig`
- No tests for: `ProxyServer` (main class), `OAuthProviderAuth`
- Coverage focused on auth configuration validation

## Test Types

**Unit Tests:**
- Scope: Individual functions and methods
- Isolation: Full mocking of external dependencies
- Examples: `validateConfig.test.js`, `OAuth2Auth.test.js`
- Framework: Vitest

**Integration Tests:**
- Scope: Multiple components working together
- Pattern: Create Express app with auth middleware, test HTTP requests
- Example: `oauth.integration.test.js`
- Framework: Vitest + supertest

```javascript
// Integration test pattern
import request from 'supertest';
import express from 'express';

beforeAll(() => {
  app = express();
  app.use(session({ ...oauthAuth.getSessionConfig() }));
  app.use('/auth', oauthAuth.getAuthRoutes());
});

it('should deny access to protected routes without authentication', async () => {
  const response = await request(app)
    .get('/protected')
    .expect(401);

  expect(response.body.error).toBe('Unauthorized');
});
```

**E2E Tests:**
- Scope: Full OAuth flow with real HTTP requests
- Framework: Custom test runner (node + http module)
- Location: `.validation/oauth-e2e.test.js`
- Requires: Running proxy server

```javascript
// E2E test pattern - custom HTTP requests
function request(method, path, headers = {}, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}
```

**Validation Tests:**
- Scope: Configuration and environment validation
- Location: `.validation/*.test.js`
- Framework: Custom test runner with colored output
- Checks: File existence, process status, port availability

**Manual Tests:**
- Location: `test/manual/oauth-provider-test.js`
- Purpose: Interactive testing scripts for OAuth provider flows

## Common Patterns

**Async Testing:**
```javascript
// Vitest async/await pattern
it('should load and validate JSON configuration files', async () => {
  const validConfig = { /* ... */ };
  vi.spyOn(fs, 'existsSync').mockReturnValue(true);
  vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(validConfig));

  const result = await validateOAuthConfigFile('/path/to/config.json');
  expect(result.valid).toBe(true);
});
```

**Error Testing:**
```javascript
// Throwing errors
it('should throw error when session secret is missing', () => {
  const config = { provider: { /* ... */ }, session: {} };
  expect(() => new OAuth2Auth(config))
    .toThrow('Session secret is required');
});

// Validation errors
it('should return error when field is not a string', () => {
  const result = validateOAuthConfig(config);
  expect(result.valid).toBe(false);
  expect(result.errors).toContain('Field provider.clientID must be a string');
});
```

**Callback Testing:**
```javascript
// Testing callback-based functions
it('should verify user when in allowedUsers list', () => {
  const auth = createAuth({ allowedUsers: ['allowed@example.com'] });
  const verifyCallback = auth._defaultVerifyCallback.bind(auth);

  const profile = {
    id: 'user-123',
    displayName: 'Test User',
    emails: [{ value: 'allowed@example.com' }]
  };

  verifyCallback('access-token', 'refresh-token', profile, (err, user) => {
    expect(err).toBeNull();
    expect(user).toBeDefined();
  });
});
```

**Console Output Testing:**
```javascript
// Spying on console for CLI tests
beforeEach(() => {
  consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

it('should print valid status for valid result', () => {
  printValidationResult(result, 'Test Config');
  expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Status: VALID'));
});
```

---

*Testing analysis: 2026-03-13*
