# Integration Tests

This directory contains integration tests for the LibreOffice MCP server.

## Prerequisites

Integration tests require a running LibreOffice instance in socket listening mode.

### Starting LibreOffice

**Windows:**
```bash
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"
```

**macOS:**
```bash
/Applications/LibreOffice.app/Contents/MacOS/soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"
```

**Linux:**
```bash
soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"
```

### Custom Connection

You can use a different host/port by setting environment variables:

```bash
export LIBREOFFICE_HOST=localhost
export LIBREOFFICE_PORT=2002
```

## Running Tests

### Run all tests (including unit tests that don't require LibreOffice):

```bash
cd packages/libreoffice-calc-mcp-server
pytest tests/ -v
```

### Run only integration tests (requires LibreOffice running):

```bash
PYTEST_RUN_INTEGRATION=1 pytest tests/test_integration.py -v
```

### Run specific test classes:

```bash
# Basic cell operations only
PYTEST_RUN_INTEGRATION=1 pytest tests/test_integration.py::TestBasicCellOperations -v

# Formula operations only
PYTEST_RUN_INTEGRATION=1 pytest tests/test_integration.py::TestFormulaOperations -v
```

### Run Windows-specific regression tests:

```bash
PYTEST_RUN_INTEGRATION=1 pytest tests/test_integration.py::TestWindowsFileURL -v
```

## Test Coverage

The integration test suite covers all 12 MCP tools:

| Category | Tools |
|----------|-------|
| **Basic Operations** | `read_cell`, `write_cell` |
| **Range Operations** | `get_range`, `write_range` |
| **Formula Operations** | `read_cell_formula`, `write_cell_formula` |
| **Sheet Operations** | `list_sheets`, `create_sheet`, `delete_sheet`, `rename_sheet` |
| **Utility Operations** | `get_cell_count`, `find_text` |

### Additional Tests

- **Cell Reference Parsing**: Unit tests for A1 notation parsing (no LibreOffice required)
- **Windows File URL**: Regression tests for the drive letter colon preservation bug
- **Error Handling**: Tests for various error conditions

## Test Data

Tests create temporary ODS files that are automatically cleaned up after each test.

## CI/CD Integration

For CI/CD pipelines, you may need to:

1. Install LibreOffice in the runner
2. Start LibreOffice in headless mode with socket listening
3. Set `PYTEST_RUN_INTEGRATION=1` environment variable

Example GitHub Actions workflow:

```yaml
- name: Install LibreOffice
  run: sudo apt-get install -y libreoffice

- name: Start LibreOffice
  run: soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" &
  shell: bash

- name: Run integration tests
  run: PYTEST_RUN_INTEGRATION=1 pytest tests/test_integration.py -v
  env:
    DISPLAY: :99  # For headless operation
```
