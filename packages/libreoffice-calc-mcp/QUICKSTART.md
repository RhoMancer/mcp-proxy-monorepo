# LibreOffice Calc MCP - Quick Start Guide

> **Get Claude working with your spreadsheets in 3 easy steps.**
>
> **Note:** This works with **spreadsheets only** (Calc/Excel/CSV). Not for Word docs or PowerPoint files.

---

## Step 0: Prerequisites

Make sure you have:
- [ ] LibreOffice installed (download free from https://www.libreoffice.org/download/)
- [ ] Node.js installed (for running the proxy)
- [ ] A test spreadsheet file (`.ods`, `.xlsx`, or `.csv`)

---

## Step 1: Start LibreOffice (Required!)

**IMPORTANT:** You must start LibreOffice in "socket mode" before using the MCP proxy.

### Option A: Use the helper script (Easiest!)

1. Open File Explorer
2. Go to: `packages\libreoffice-calc-mcp\`
3. **Double-click: `start-libreoffice.bat`**

You'll see a window flash open - that's LibreOffice starting in the background.

**How to check it worked:**
- Open Task Manager (Ctrl+Shift+Esc)
- Look for `soffice.exe` in the Processes list
- If you see it, LibreOffice is running in socket mode!

### Option B: Manual start (If script doesn't work)

1. Open Command Prompt (cmd)
2. Paste this command and press Enter:

```batch
"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck
```

3. Leave this window open (LibreOffice is now running)

**Pro tip:** If LibreOffice is installed elsewhere, change the path to where your `soffice.exe` is located.

---

## Step 2: Start the MCP Proxy

1. Go to: `packages\libreoffice-calc-mcp\`
2. **Double-click: `start.bat`**

You should see:
```
================================
  LibreOffice Calc MCP Proxy
  Local:  http://127.0.0.1:8081
================================

✓ LibreOffice detected (localhost:2002)
MCP HTTP Proxy listening on http://127.0.0.1:8081
```

**If you see "LibreOffice not detected":**
- Go back to Step 1 and make sure LibreOffice is running
- Wait 10 seconds and try `start.bat` again

---

## Step 3: Add to Claude

Open Claude → **Settings** → **Connectors** → **Add Connector**

| Field | What to type |
|-------|--------------|
| **Name** | `libreoffice-calc-mcp` |
| **Remote MCP server URL** | `http://127.0.0.1:8081/messages` |

Click **Add**.

---

## Step 4: Try it!

Open a new Claude chat and try:

> "Read the file C:\Users\YOUR_USERNAME\Documents\test.ods and tell me what's in cell A1"

Or:

> "Create a new sheet called 'Summary' in C:\Users\YOUR_USERNAME\Documents\my-spreadsheet.ods"

---

## Quick Reference: What Can It Do?

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

### "LibreOffice Calc connector isn't currently running"
**Cause:** The proxy wasn't started or LibreOffice isn't running.

**Solution:**
1. Double-click `start-libreoffice.bat` (Step 1)
2. Wait 5 seconds
3. Double-click `start.bat` (Step 2)
4. Wait for "LibreOffice detected" message

### Claude says "can't connect"
**Cause:** Proxy isn't running or URL is wrong.

**Solution:**
1. Did you complete Steps 1 and 2?
2. Check the URL matches: `http://127.0.0.1:8081/messages`
3. Test in browser: http://127.0.0.1:8081/health
4. Should see: `{"status":"ok","mcpRunning":true,"mcpInitialized":true}`

### "LibreOffice not detected" in proxy
**Cause:** LibreOffice isn't running in socket mode.

**Solution:**
1. Check Task Manager for `soffice.exe`
2. If not there, run `start-libreoffice.bat` again
3. If already there, end the task and restart it

### "File not found"
**Cause:** Wrong file path or file doesn't exist.

**Solution:**
1. Use the FULL path: `C:/Users/...`
2. Make sure the file exists
3. Copy the path from File Explorer address bar

### Port already in use
**Cause:** Another proxy is running on port 8081.

**Solution:**
```batch
# Find what's using port 8081
netstat -ano | findstr :8081

# Kill the process (replace <PID> with the number)
taskkill /PID <PID> /F
```

---

## One-Script Start (Optional)

If you want to start everything with one double-click:

Use `start-full.bat` instead - it starts LibreOffice first, waits, then starts the proxy.

---

## How to Stop

**Stop the proxy:** Press `Ctrl+C` in the command window

**Stop LibreOffice:** Use Task Manager to end `soffice.exe`, or run `stop.bat`

---

## Need More Help?

- Check the health page: http://127.0.0.1:8081/health
- See the full [README.md](README.md) for detailed documentation

---

**That's it!** You're ready to have Claude work with your spreadsheets.
