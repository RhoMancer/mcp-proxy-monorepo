@echo off
REM Start LibreOffice in headless socket listening mode for MCP server
REM
REM This starts LibreOffice with UNO socket enabled on port 2002
REM The MCP server connects to this socket to manipulate spreadsheets

echo Starting LibreOffice in headless socket mode...
echo Host: localhost
echo Port: 2002
echo.

"C:\Program Files\LibreOffice\program\soffice.exe" --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager" --headless --nodefault --nolockcheck

echo.
echo LibreOffice has stopped.
