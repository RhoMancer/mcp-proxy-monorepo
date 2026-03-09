/**
 * Test setup for Vitest
 * Handles mocking of Passport and OAuth dependencies
 */

import { vi } from 'vitest';

// Mock passport - must be before any imports that use it
vi.mock('passport', () => {
  const passport = {
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    initialize: vi.fn(() => (req, res, next) => next()),
    session: vi.fn(() => (req, res, next) => next()),
    authenticate: vi.fn(() => (req, res, next) => next())
  };
  return { default: passport };
});

// Mock passport-oauth2 - must be before any imports that use it
vi.mock('passport-oauth2', () => {
  class MockOAuth2Strategy {
    constructor(options, verify) {
      this.name = 'oauth2';
      this.options = options;
      this._verify = verify;
    }
  }
  return { OAuth2Strategy: MockOAuth2Strategy };
});
