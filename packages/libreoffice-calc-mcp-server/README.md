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

## Quick Start

### Step 1: Start LibreOffice in Socket Mode (Required!)

**IMPORTANT:** You must start LibreOffice manually in socket mode before using this MCP server.

#### Windows

**Option A: Using the helper script (Recommended)**
```batch
cd packages\libreoffice-calc-mcp
start-libreoffice.bat
```

**Option B: Manual command**
```batch
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck
```

**How to verify:**
- Open Task Manager (Ctrl+Shift+Esc)
- Look for `soffice.exe` in the Processes list

#### macOS/Linux

```bash
soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck
```

### Step 2: Start the HTTP Proxy

```bash
cd packages/libreoffice-calc-mcp
npm start
```

The proxy will be available at `http://127.0.0.1:8081`

### Step 3: Test

```bash
# Check health
curl http://127.0.0.1:8081/health

# Run tests (requires proxy running)
node test.js          # Direct MCP test
node test-proxy.js    # HTTP proxy test
```

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

## Troubleshooting

### "LibreOffice not detected"
**Cause:** LibreOffice isn't running in socket mode.

**Solution:**
1. Check Task Manager for `soffice.exe`
2. Start LibreOffice in socket mode:
   ```batch
   start-libreoffice.bat
   ```
3. Wait 5 seconds and restart the proxy

### Connection refused
**Cause:** LibreOffice isn't listening on the socket.

**Solution:**
1. Make sure LibreOffice was started with `--accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"`
2. Check no other LibreOffice instances are running
3. Restart both LibreOffice and the proxy

## License

MIT
