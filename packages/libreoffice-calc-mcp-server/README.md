# LibreOffice Calc MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that provides tools for interacting with [LibreOffice Calc](https://www.libreoffice.org/discover/calc/) via the UNO (Universal Network Objects) interface.

## Features

- **11 Calc Operations**: Read/write cells, ranges, formulas; sheet management; text search
- **Multi-format Support**: `.ods`, `.xlsx`, `.csv`, and other LibreOffice-compatible formats
- **Stdio Transport**: Works with Claude Desktop and other MCP clients
- **HTTP Proxy**: Included proxy for web-based access

## Requirements

- **Windows**: LibreOffice installed (default: `C:\Program Files\LibreOffice`)
- **macOS/Linux**: LibreOffice installed with Python bindings
- LibreOffice running in socket listening mode

## Windows Setup (Important!)

On Windows, you **must** use LibreOffice's bundled Python (includes pre-compiled pyuno):

```bash
# Install MCP in LibreOffice's Python
"C:/Program Files/LibreOffice/program/python-core-3.10.19/Scripts/pip.exe" install mcp

# Install get-pip first if needed
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
"C:/Program Files/LibreOffice/program/python.exe" get-pip.py
```

The HTTP proxy is configured to use LibreOffice's Python automatically.

## Quick Start

### 1. Start LibreOffice with socket listening

**Windows:**
```bash
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"
```

**macOS/Linux:**
```bash
soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"
```

### 2. Start the HTTP Proxy

```bash
cd packages/libreoffice-calc-mcp
npm start
```

The proxy will be available at `http://127.0.0.1:8081`

### 3. Test

```bash
# Run tests (requires proxy running)
node test.js          # Direct MCP test
node test-proxy.js    # HTTP proxy test
```

## Available Tools

| Tool | Description |
|------|-------------|
| `read_cell` | Read a single cell value |
| `write_cell` | Write a value to a single cell |
| `get_range` | Read a range of cells (A1 notation) |
| `list_sheets` | List all sheet names |
| `read_cell_formula` | Read a cell's formula |
| `write_cell_formula` | Write a formula to a cell |
| `write_range` | Write a 2D array to a range |
| `create_sheet` | Create a new sheet |
| `delete_sheet` | Delete a sheet |
| `rename_sheet` | Rename a sheet |
| `find_text` | Find cells containing text |

## Configuration

Environment variables (optional):

```bash
LIBREOFFICE_HOST=localhost  # default
LIBREOFFICE_PORT=2002        # default
PORT=8081                    # HTTP proxy port
```

## With Claude Desktop

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "libreoffice-calc": {
      "command": "\"C:\\Program Files\\LibreOffice\\program\\python.exe\"",
      "args": ["-m", "libreoffice_calc_mcp"],
      "env": {
        "PYTHONPATH": "C:\\path\\to\\libreoffice-calc-mcp-server\\src;C:\\Program Files\\LibreOffice\\program",
        "LIBREOFFICE_HOST": "localhost",
        "LIBREOFFICE_PORT": "2002"
      }
    }
  }
}
```

## License

MIT
