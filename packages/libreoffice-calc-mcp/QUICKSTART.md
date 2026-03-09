# LibreOffice Calc MCP - Quick Start Guide

> **Get Claude working with your spreadsheets in 2 minutes.**
>
> **Note:** This works with **spreadsheets only** (Calc/Excel/CSV). Not for Word docs or PowerPoint files.

---

## Step 1: Double-click to start

Go to: `packages\libreoffice-calc-mcp\`

Double-click: **`start.bat`**

You should see:
```
✓ LibreOffice started
✓ Proxy running on http://127.0.0.1:8081
```

---

## Step 2: Add to Claude

Open Claude → **Settings** → **Connectors** → **Add Connector**

| Field | What to type |
|-------|--------------|
| **Name** | `libreoffice-calc-mcp` |
| **Remote MCP server URL** | `http://127.0.0.1:8081/messages` |

Click **Add**.

---

## Step 3: Try it!

Open a new Claude chat and try:

> "Read the file C:\Users\YOUR_USERNAME\Documents\test.ods and tell me what's in cell A1"

Or:

> "Create a new sheet called 'Summary' in C:\Users\YOUR_USERNAME\Documents\my-spreadsheet.ods"

---

## What can it do?

| Task | Example prompt |
|------|----------------|
| **Read a cell** | "What's in cell B2 of C:\Docs\budget.ods?" |
| **Write a cell** | "Put 'Hello' in cell A1 of C:\Docs\test.ods" |
| **Read a range** | "Show me cells A1 through C10" |
| **Write a range** | "Create a 3x3 table with the numbers 1-9" |
| **Add a formula** | "Add a SUM formula in cell A11" |
| **Create sheet** | "Add a sheet called 'Q4 Data'" |
| **Find text** | "Find all cells containing 'Total'" |

---

## Important Notes

### File Paths
Use the **full path** to your file:
```
C:/Users/YOUR_USERNAME/Documents/sales.ods
```
NOT just: `sales.ods`

### Cell References
- Columns: A=0, B=1, C=2, etc.
- Rows: Row 1=0, Row 2=1, etc.
- Cell C5 = column 2, row 4

### File Must Exist
The spreadsheet file must already be on your computer.

---

## Troubleshooting

**It won't start:**
- Make sure LibreOffice is installed
- Close all LibreOffice windows first

**"LibreOffice Calc connector isn't currently running":**
- This means the proxy wasn't started with `start.bat` or `npm start`
- The `start.bat` script **automatically starts LibreOffice** for you
- Double-click `start.bat` again and wait for "✓ LibreOffice started" message

**Claude says "can't connect":**
- Did you double-click `start.bat`?
- Wait 10 seconds after starting before asking Claude
- Check http://127.0.0.1:8081/health in your browser

**"File not found":**
- Use the FULL path: `C:/Users/...`
- Make sure the file actually exists

**Check if it's working:**
Open this in your browser:
```
http://127.0.0.1:8081/health
```
You should see: `{"status":"ok","mcpRunning":true}`

---

## How to stop

Press `Ctrl+C` in the command window, or just close it.

---

## Optional: Remote Access (Cloudflare Tunnel)

To access your spreadsheets from anywhere (phone, other computers):

1. Create a Cloudflare tunnel at https://dash.cloudflare.com/
2. Copy `config.example.yml` to `config.yml`
3. Edit `config.yml` with your tunnel details
4. Double-click `start.bat` (includes the tunnel)

Then use the HTTPS URL in Claude Connectors instead of the local URL.

---

## Need more help?

See the full [README.md](README.md) for detailed documentation.

---

**That's it!** You're ready to have Claude work with your spreadsheets.
