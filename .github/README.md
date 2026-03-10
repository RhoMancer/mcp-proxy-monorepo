# CI/CD Pipeline

This repository uses GitHub Actions for continuous integration and testing.

## Workflows

### Validation Tests (`.github/workflows/test.yml`)

Runs on:
- Push to `master` or `main` branches
- Pull requests to `master` or `main`
- Manual trigger via workflow_dispatch

#### Jobs

**1. Validation Tests**
- Runs on Ubuntu with Node.js 18.x and 20.x (matrix)
- Executes LibreOffice validation tests
- Executes OAuth validation tests

**2. OAuth E2E Tests**
- Runs on Ubuntu with Node.js 20.x
- Starts a mock OAuth provider service
- Starts the MCP proxy with the echo test server
- Runs end-to-end OAuth tests

## Test Coverage

| Test Type | Description | Status |
|-----------|-------------|--------|
| LibreOffice Validation | Installation detection, config validation | ✅ Automated |
| OAuth Validation | Protected routes, auth endpoints | ✅ Automated |
| OAuth E2E | Full OAuth flow with mock provider | ✅ Automated |

## Local Testing

Before pushing, run tests locally:

```bash
# Run all validation tests
npm test

# Run specific test suites
npm run test:oauth
npm run test:oauth-e2e
npm run test:libreoffice
```

## Badge

Add to README.md:
```markdown
[![Tests](https://github.com/RhoMancer/mcp-proxy-monorepo/actions/workflows/test.yml/badge.svg)](https://github.com/RhoMancer/mcp-proxy-monorepo/actions/workflows/test.yml)
```

## Future Improvements

- [ ] Add code coverage reporting
- [ ] Add release workflow with npm publish
- [ ] Add Docker image build and push
- [ ] Add integration tests with real OAuth providers
- [ ] Add performance regression tests
