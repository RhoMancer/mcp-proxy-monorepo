# Coding Conventions

**Analysis Date:** 2026-03-13

## Naming Patterns

**Files:**
- JavaScript: `PascalCase.js` for classes/exports (e.g., `ProxyServer.js`, `OAuth2Auth.js`)
- JavaScript: `camelCase.js` for utilities (e.g., `validateConfig.js`, `cli.js`)
- Test files: Co-located with source, `.test.js` suffix (e.g., `OAuth2Auth.test.js`)
- Config files: `kebab-case.config.js` (e.g., `oauth-github.config.js`)
- Python: `snake_case.py` for all modules (e.g., `calc_tools.py`, `uno_connection.py`)
- Python packages: `snake_case` for directories (e.g., `libreoffice_calc_mcp/`)

**Functions:**
- JavaScript: `camelCase` for all functions and methods
- Private methods prefix with underscore: `_getSessionSecret()`, `_setupMiddleware()`
- Async functions: use `async` keyword, no naming suffix
- Python: `snake_case` for all functions

**Variables:**
- JavaScript: `camelCase` for local variables and parameters
- Constants: `UPPER_SNAKE_CASE` (e.g., `APP_NAME`, `LIBREOFFICE_HOST`)
- Class properties: `camelCase` (e.g., `sessionSecret`, `authEnabled`)
- Python: `UPPER_SNAKE_CASE` for module-level constants, `snake_case` for variables

**Types/Classes:**
- JavaScript: `PascalCase` for class names (e.g., `ProxyServer`, `OAuth2Auth`)
- Python: `PascalCase` for classes, `PascalCase` for exceptions (e.g., `CalcError`, `LibreOfficeConnectionError`)

## Code Style

**Formatting:**
- JavaScript: No formal formatter configured (no `.prettierrc` or ESLint config at project root)
- Python: Uses `black` with `line-length = 100` (configured in `pyproject.toml`)
- Python: Uses `ruff` for linting with `line-length = 100`
- Indentation: 2 spaces for JavaScript (inferred), 4 spaces for Python (PEP 8/black default)
- Semicolons: Used consistently in JavaScript

**Linting:**
- JavaScript: No project-level ESLint configuration
- Python: Ruff configured with rule sets `["E", "F", "W", "I", "N", "UP"]`
- Target Python version: `py310`

**Shebangs:**
- Executable scripts: `#!/usr/bin/env node` for JavaScript CLI files
- Executable scripts: `#!/usr/bin/env python3` for Python scripts
- Present on: `cli.js`, test files, `__main__.py`

## Import Organization

**JavaScript (ES modules):**

Order:
1. Node.js built-in modules
2. External dependencies (from `node_modules`)
3. Internal modules (relative imports with `./`)
4. Side-effect imports (if any)

```javascript
// Standard pattern from codebase
import { spawn } from 'child_process';           // Built-in
import crypto from 'crypto';                       // Built-in
import express from 'express';                     // External
import dotenv from 'dotenv';                       // External
import { OAuth2Auth } from './auth/OAuth2Auth.js'; // Internal
import { ProxyServer } from './ProxyServer.js';    // Internal
```

**Python:**

Order:
1. Standard library imports
2. Third-party imports
3. Local application imports
4. Blank line between each group

```python
# Standard library
from __future__ import annotations
import asyncio
import os
from typing import Any

# Third-party
from mcp.server import Server
from mcp.server.stdio import stdio_server

# Local
from .calc_tools import read_cell, write_cell
from .uno_connection import get_connection
```

**Path Aliases:**
- No path aliases configured in JavaScript
- Python uses relative imports with `.` for same-package imports

## Error Handling

**Patterns:**
- Use custom `Error` classes with descriptive messages
- Throw early with explicit error messages
- Use `try/catch/finally` for resource cleanup

```javascript
// From OAuth2Auth.js - validation in constructor
if (!config.provider) {
  throw new Error('OAuth provider configuration is required');
}

// From validateConfig.js - structured validation
if (!auth.session?.secret && !auth.session?.secretEnvVar) {
  result.errors.push('Session secret not configured...');
}
```

**Python Error Handling:**
- Custom exception classes inherit from `Exception`
- Use context managers (`with`) or `finally` for cleanup
- Preserve exception chains with `from e`

```python
# From calc_tools.py
class CalcError(Exception):
    """Raised when a Calc operation fails."""
    pass

try:
    # operation
except Exception as e:
    if isinstance(e, CalcError):
        raise
    raise CalcError(f"Failed to read cell: {e}") from e
```

**Error Return Values:**
- Validation functions return `{ valid, errors, warnings, info }` objects
- HTTP errors return JSON with `{ error, message }` structure
- MCP tool errors return `TextContent` with formatted error text

## Logging

**Framework:** `console` for JavaScript, no structured logging framework

**Patterns:**
- Use `console.log()` for informational messages
- Use `console.error()` for errors
- Use `console.warn()` for warnings
- Prefix log messages with context (e.g., `[OAuth]`, `[MCP stderr]`)

```javascript
// From ProxyServer.js
console.log('Starting MCP process:', command, args.join(' '));
console.error('[MCP stderr]:', data.toString());
console.log('[OAuth] Generated auth code for client:', client_id);
```

**Structured Logging:**
- JSON.stringify for objects: `console.log('Body:', JSON.stringify(req.body, null, 2))`
- Colored console output for CLI/validation tests using ANSI codes
- No log levels (all logs go to stdout/stderr)

**Production Considerations:**
- No log level configuration
- No request logging middleware
- No structured logging (JSON output for parsing)

## Comments

**When to Comment:**
- File headers with purpose and usage
- Complex algorithm explanations
- Public API documentation
- Security considerations

**JSDoc/TSDoc:**
- Limited JSDoc usage, mainly for:
  - Constructor parameters on classes
  - Public method documentation
  - Complex function signatures

```javascript
/**
 * @param {Object} config - OAuth configuration
 * @param {Object} config.provider - OAuth provider configuration
 * @param {string} config.provider.authorizationURL - OAuth authorization URL
 * ...
 */
constructor(config) {
```

**Python Docstrings:**
- Comprehensive Google-style docstrings on all public functions
- Module-level docstrings describe purpose
- Include Args, Returns, Raises, Example sections

```python
def read_cell(
    file_path: str,
    column: int,
    row: int,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> str | int | float:
    """
    Read a single cell value from a Calc spreadsheet.

    Args:
        file_path: Path to the spreadsheet file
        column: Column index (0-based)
        row: Row index (0-based)
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection (uses default if not provided)

    Returns:
        Cell value as string, number, or None

    Raises:
        CalcError: If the operation fails

    Example:
        >>> value = read_cell("sheet.ods", 0, 0)  # Read A1
        >>> print(value)
    """
```

## Function Design

**Size:**
- No strict size limit observed
- Functions range from 5-200 lines
- Prefer smaller, focused functions (common pattern in Python code)

**Parameters:**
- Use options objects for multiple related parameters (JavaScript)
- Use keyword arguments with defaults (Python)
- Destructure config objects in function signatures

```javascript
// JavaScript pattern - config object
constructor(config) {
  this.config = config;
  this.PORT = config.server?.port || process.env.PORT || 8080;
  this.HOST = config.server?.host || '127.0.0.1';
}
```

```python
# Python pattern - keyword arguments with defaults
def read_cell(
    file_path: str,
    column: int,
    row: int,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> str | int | float:
```

**Return Values:**
- Async functions return Promises (JavaScript)
- Functions return single values or objects
- Validation functions return structured result objects
- MCP tools return `list[TextContent]`

## Module Design

**Exports:**
- ES modules with `export` keyword (JavaScript `"type": "module"`)
- Named exports for utilities: `export function validateOAuthConfig()`
- Default export for main class: `export class ProxyServer`
- Barrel exports: `export { OAuth2Auth, OAuthProviders }`

**Barrel Files:**
- Not extensively used
- Test setup file: `test/setup.js` for Vitest mocks

**Python Modules:**
- Use `__all__` for explicit exports (not observed but Python convention)
- Relative imports within package: `from .calc_tools import read_cell`
- Entry point via `__main__.py` with `if __name__ == "__main__"` guard

---

*Convention analysis: 2026-03-13*
