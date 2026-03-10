# LibreOffice Calc MCP - Complete Beginner's Guide

> **TL;DR:** This lets Claude (AI) read and edit Excel/LibreOffice **spreadsheets** on YOUR computer. It works with files stored locally on your machine.
>
> **Important:** This tool works with **spreadsheets only** (Calc/Excel). It does NOT work with Word documents (.doc/.docx), PowerPoint presentations, or other file types.

---

## Part 1: What Is This? (The Simple Explanation)

### The Name
Despite being called "LibreOffice MCP," this tool specifically works with **LibreOffice Calc** (the spreadsheet application). Think of it as "LibreOffice **Spreadsheet** MCP."

### What It Supports
- ✅ LibreOffice Calc files (`.ods`)
- ✅ Microsoft Excel files (`.xlsx`, `.xls`)
- ✅ CSV files (`.csv`)
- ✅ Most spreadsheet formats

### What It Does NOT Support
- ❌ Writer documents (`.odt`, `.doc`, `.docx`)
- ❌ Impress presentations (`.odp`, `.ppt`, `.pptx`)
- ❌ Draw graphics (`.odg`)
- ❌ Base databases (`.odb`)

### The Problem
Claude (the AI) lives in the cloud. It can't see files on your computer. Even if you paste a spreadsheet's contents, Claude can't modify the actual file on your hard drive.

### The Solution
This tool is a **bridge** (like a translator) between Claude and LibreOffice on your computer. Here's how it works:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Claude (AI)   │ ───▶ │  This Proxy      │ ───▶ │  LibreOffice    │
│  (in the cloud) │      │  (on your PC)    │      │  (on your PC)   │
└─────────────────┘      └──────────────────┘      └─────────────────┘
    "Read cell A1"                                    [Opens your file]
                                                          │
                                                          ▼
                                                    Returns the value
                                                          │
                                                          ▼
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Claude (AI)   │ ◀─── │  This Proxy      │ ◀─── │  LibreOffice    │
│  sees: "42"     │      │  translates      │      │  reads file.ods │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

### Key Points
- **Yes, it works on files on your computer** - Your spreadsheets stay local
- **Nothing gets uploaded** - Claude sends commands, your computer does the work, results are sent back
- **You control everything** - The proxy runs on YOUR machine

---

## Part 2: What Can It Do?

This tool gives Claude the ability to work with **spreadsheets** (`.ods`, `.xlsx`, `.csv`, etc.):

| Capability | What It Does | Example |
|------------|--------------|---------|
| **Read cells** | Get a single cell's value | "What's in cell B2?" |
| **Write cells** | Set a cell's value | "Put 'Hello' in A1" |
| **Read ranges** | Get multiple cells at once | "Show me A1 through C10" |
| **Write ranges** | Fill multiple cells | "Create a 5x5 table" |
| **Formulas** | Read or write formulas | "Add a SUM formula" |
| **Sheets** | Add, rename, delete sheets | "Create a sheet called 'Q4'" |
| **Search** | Find text in cells | "Find all cells with 'Total'" |

### File Formats Supported
- ✅ `.ods` - LibreOffice Calc (OpenDocument Spreadsheet)
- ✅ `.xlsx` - Microsoft Excel
- ✅ `.xls` - Older Excel format
- ✅ `.csv` - Comma-separated values
- ✅ And most other spreadsheet formats

### What It CANNOT Do
- ❌ Edit `.doc`/`.docx` (Word documents) - only spreadsheets
- ❌ Edit `.ppt`/`.odp` (presentations)
- ❌ Work with files on other computers - only YOUR computer
- ❌ Access files without you providing the full path

---

## Part 3: Environment Variables

### All Available Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `MCP_LIBREOFFICE_PATH` | Path to LibreOffice executable | Auto-detected on Windows |
| `MCP_LIBREOFFICE_HOST` | LibreOffice socket host | `localhost` |
| `MCP_LIBREOFFICE_PORT` | LibreOffice socket port | `2002` |
| `MCP_LIBREOFFICE_PROGRAM_DIR` | LibreOffice program directory | `C:/Program Files/LibreOffice/program` |
| `MCP_LIBREOFFICE_PYTHON` | LibreOffice bundled Python | `C:/Program Files/LibreOffice/program/python.exe` |
| `MCP_PROXY_PORT` | HTTP proxy port | `8081` |
| `MCP_PROXY_HOST` | HTTP proxy host | `127.0.0.1` |
| `MCP_TEST_DATA_PATH` | Test file path | *none* |

### Setting Up Environment Variables

You can configure these variables in three ways:

#### Option 1: .env file (Recommended)
Create a `.env` file in the `packages/libreoffice-calc-mcp/` directory:
```bash
# Copy from the example
cp .env.example .env
# Edit with your values
notepad .env  # or your preferred editor
```

#### Option 2: System environment variables
Set them in your OS:
```bash
# Windows (Command Prompt)
set MCP_LIBREOFFICE_PATH=C:/Program Files/LibreOffice/program/soffice.exe

# Windows (PowerShell)
$env:MCP_LIBREOFFICE_PATH="C:/Program Files/LibreOffice/program/soffice.exe"
```

#### Option 3: Inline (for testing)
```bash
MCP_LIBREOFFICE_PATH="C:/path/to/soffice.exe" npm start
```

---

## Part 4: How to Start It Up (Step-by-Step)

### Prerequisites
1. **LibreOffice must be installed** on your computer
   - Download free from: https://www.libreoffice.org/download/
   - Install to the default location if possible

2. **Node.js** (if running from source)
   - Usually already installed if you're developing

### Starting the Proxy

**IMPORTANT:** You must start LibreOffice in socket mode BEFORE starting the proxy.

#### Step 1: Start LibreOffice in Socket Mode (Required!)

**Option A: Use the helper script (Easiest)**
```batch
# From the libreoffice-calc-mcp directory
START_LIBREOFFICE_HEADLESS.bat
```

**Option B: Manual start**
```batch
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck
```

**How to verify LibreOffice is running:**
- Open Task Manager (Ctrl+Shift+Esc)
- Look for `soffice.exe` in the Processes list

#### Step 2: Start the MCP Proxy

**Option A: Quick Start (Recommended)**
```batch
# From the libreoffice-calc-mcp directory
START_LIBREOFFICE_PROXY.bat
```

**Option B: From Command Line**
```bash
# From the monorepo root
cd packages\libreoffice-calc-mcp
npm start
```

**Option C: One-Script Start (Optional)**
```batch
# Starts LibreOffice, waits, then starts the proxy
START_LIBREOFFICE_AND_PROXY.bat
```

#### Option D: With Cloudflare Tunnel (Optional - for remote access)
First, set up the tunnel configuration:
```bash
# Copy the example config
cp config.example.yml config.yml
# Edit config.yml with your tunnel details
notepad config.yml
```

Then start with:
```bash
START_LIBREOFFICE_PROXY.bat
```

### How Do I Know It's Working?

You should see output like this:
```
LibreOffice MCP Proxy Launcher
================================

✓ LibreOffice detected (localhost:2002)

MCP HTTP Proxy listening on http://127.0.0.1:8081
```

Or test with your browser:
- Open: `http://127.0.0.1:8081/health`
- You should see: `{"status":"ok","mcpRunning":true,"mcpInitialized":true}`

### How to Stop It
- Press `Ctrl+C` in the command window
- Or close the command window

---

## Part 5: Using It With Claude (The Important Part!)

### Option 1: Local Testing (You're on the same computer)

1. Start the proxy (see Part 4)

2. Open Claude and go to Settings → Connectors

3. Add a new connector with these settings:

   | Field | Value |
   |-------|-------|
   | **Name** | `libreoffice-calc-mcp` |
   | **Remote MCP server URL** | `http://127.0.0.1:8081/messages` |

### Option 2: Remote Access (From Anywhere - Optional)

You can also access this from ANY device using Cloudflare Tunnel:

1. Set up Cloudflare tunnel (see config.example.yml)
2. Start with: `START_LIBREOFFICE_PROXY.bat` (includes the tunnel)

3. Add to Claude Connectors:

   | Field | Value |
   |-------|-------|
   | **Name** | `libreoffice-calc-mcp` |
   | **Remote MCP server URL** | `https://your-proxy-domain.example.com/messages` |

This lets you use your local spreadsheets from:
- Claude on your phone
- Claude on a different computer
- Claude AI anywhere with internet

---

## Part 6: Real-World Use Cases (Why Would You Use This?)

### Use Case 1: Financial Tracking
> You: "Read my budget spreadsheet (C:\Documents\budget.ods) and tell me how much I spent on groceries last month."

### Use Case 2: Data Entry
> You: "I have a CSV file with sales data. Put it in a new spreadsheet and add a SUM formula at the bottom."

### Use Case 3: Report Generation
> You: "Take this data and create a summary sheet called 'Q4 Report' with the totals in row 1."

### Use Case 4: Data Analysis
> You: "Read cells A1-A100 in my spreadsheet and find all values over 1000."

### Use Case 5: Bulk Updates
> You: "Add a new column called 'Status' and set all rows to 'Pending'."

---

## Part 7: All Available Tools (Reference)

When connected to Claude, these tools become available:

### Single Cell Operations
| Tool | Description |
|------|-------------|
| `read_cell` | Read one cell's value |
| `write_cell` | Write a value to one cell |
| `read_cell_formula` | Read a cell's formula (not the result) |
| `write_cell_formula` | Write a formula to a cell |

### Range Operations
| Tool | Description |
|------|-------------|
| `get_range` | Read a range of cells (e.g., A1:C10) |
| `write_range` | Write multiple cells at once |

### Sheet Operations
| Tool | Description |
|------|-------------|
| `list_sheets` | Show all sheet names in the file |
| `create_sheet` | Add a new sheet |
| `delete_sheet` | Remove a sheet (can't delete the last one) |
| `rename_sheet` | Rename an existing sheet |

### Search
| Tool | Description |
|------|-------------|
| `find_text` | Find all cells containing specific text |

---

## Part 8: Important Tips & Gotchas

### File Paths (Windows)
When Claude asks for the file path, use the FULL path with forward slashes:
- ✅ `"C:/Users/YOUR_USERNAME/Documents/sales.ods"`
- ✅ `"C:\\Users\\YOUR_USERNAME\\Documents\\sales.ods"`
- ❌ `"sales.ods"` (won't work - needs full path)
- ❌ `"C:\Users\YOUR_USERNAME\Documents\sales.ods"` (backslashes can cause issues)

### Cell References
- **Columns are 0-indexed**: A=0, B=1, C=2, etc.
- **Rows are 0-indexed**: Row 1=0, Row 2=1, etc.
- Example: Cell `C5` = column `2`, row `4`

### Range Format
Use A1 notation for ranges:
- `"A1:C10"` - cells from A1 to C10
- `"A1:Z100"` - large range
- `"B2:D5"` - smaller block

### File Must Exist
The tool **cannot create new files**. The spreadsheet must already exist on your computer.

---

## Part 9: Troubleshooting

### Problem: "LibreOffice not detected"
**Cause:** LibreOffice isn't running in socket mode.

**Solution:**
1. Check Task Manager for `soffice.exe`
2. If not running, start it with:
   ```batch
   START_LIBREOFFICE_HEADLESS.bat
   ```
   Or manually:
   ```batch
   "C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck
   ```
3. Wait 5 seconds and restart the proxy with `START_LIBREOFFICE_PROXY.bat`

### Problem: "LibreOffice not found"
**Solution:**
1. Make sure LibreOffice is installed
2. Check it's in one of these locations:
   - `C:\Program Files\LibreOffice\`
   - `C:\Program Files (x86)\LibreOffice\`
   - `%LOCALAPPDATA%\Programs\LibreOffice\`
3. Or set the path manually in `.env`:
   ```
   MCP_LIBREOFFICE_PATH=C:\Your\Custom\Path\soffice.exe
   ```

### Problem: "Port 8081 already in use"
**Solution:**
```bash
# Find what's using the port
netstat -ano | findstr :8081

# Kill the process (replace <PID> with the number shown)
taskkill /PID <PID> /F
```

Or use a different port:
```bash
# In .env
MCP_PROXY_PORT=8082
```

### Problem: Claude says "Failed to connect"
**Solution:**
1. Make sure the proxy is running (see Part 4)
2. Check the URL in Claude settings matches:
   - Local: `http://127.0.0.1:8081/messages`
   - Remote: `https://your-proxy-domain.example.com/messages`
3. Test with: `curl http://127.0.0.1:8081/health`

### Problem: "LibreOffice is running but NOT in socket mode"
**Solution:**
1. Close ALL LibreOffice windows (check Task Manager for `soffice.exe`)
2. Run `npm start` again

---

## Part 10: Architecture (For the Curious)

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Connectors UI                     │
│                  (requires HTTPS endpoint)                  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS POST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare Named Tunnel (Optional)             │
│           your-proxy-domain.example.com                     │
│              (Optional - for remote access)                 │
└────────────────────────────┬────────────────────────────────┘
                             │ Forwards to
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              MCP HTTP Proxy (localhost:8081)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  • CORS enabled for browser clients                  │  │
│  │  • Translates HTTP to JSON-RPC 2.0                   │  │
│  │  • Handles Windows file paths correctly              │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ stdio (JSON-RPC)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│              LibreOffice MCP (Python)                      │
│            Uses UNO bridge to talk to LibreOffice          │
└────────────────────────────┬────────────────────────────────┘
                             │ Socket (localhost:2002)
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    LibreOffice                             │
│              Running in headless mode                      │
│              (soffice.exe --accept=socket...)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 11: Quick Reference Card

| What | Where |
|------|-------|
| **Start locally** | `npm start` |
| **Start with tunnel** | `START_LIBREOFFICE_PROXY.bat` (requires config.yml) |
| **Start everything** | `START_LIBREOFFICE_AND_PROXY.bat` |
| **Test health** | `curl http://127.0.0.1:8081/health` |
| **Local URL** | `http://127.0.0.1:8081/messages` |
| **Config file** | `mcp.config.js` |
| **Environment vars** | `.env` (see `.env.example`) |
| **Tunnel config** | `config.yml` (see `config.example.yml`) |
| **Default port** | `8081` |
| **LibreOffice socket** | `localhost:2002` |

---

## Questions?

If something doesn't make sense, check:
1. Is LibreOffice installed?
2. Is the proxy running? (check `http://127.0.0.1:8081/health`)
3. Is the file path correct? (use full path with forward slashes)

---

**Remember:** This tool runs on YOUR computer. Your files stay local. Claude just sends commands and receives results. You're always in control.
