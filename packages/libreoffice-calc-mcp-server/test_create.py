#!/usr/bin/env python3
"""Test script to create a spreadsheet via UNO"""
import sys
import os

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from libreoffice_calc_mcp.uno_connection import UNOConnection

os.environ['LIBREOFFICE_HOST'] = 'localhost'
os.environ['LIBREOFFICE_PORT'] = '2002'

conn = UNOConnection()
conn.connect()
doc = conn.create_spreadsheet()
sheet = doc.Sheets.getByIndex(0)
cell = sheet.getCellByPosition(0, 0)
cell.String = 'Hello from MCP!'
doc.storeToURL('file:///H:/test-mcp.ods', ())
doc.close(True)
print('Created H:/test-mcp.ods successfully')
