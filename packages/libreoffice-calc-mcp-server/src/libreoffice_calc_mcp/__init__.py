#!/usr/bin/env python3
"""
LibreOffice MCP Server

An MCP (Model Context Protocol) server that provides tools for interacting
with LibreOffice Calc via the UNO (Universal Network Objects) interface.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Any

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from .calc_tools import (
    CalcError,
    create_sheet,
    delete_sheet,
    find_text,
    get_range,
    list_sheets,
    read_cell,
    read_cell_formula,
    rename_sheet,
    write_cell,
    write_cell_formula,
    write_range,
)
from .uno_connection import LibreOfficeConnectionError, get_connection

# Server metadata
APP_NAME = "libreoffice-calc-mcp"
APP_VERSION = "0.1.0"

# Create the MCP server instance
app = Server(APP_NAME)

# LibreOffice connection settings (configurable via environment)
LIBREOFFICE_HOST = os.getenv("LIBREOFFICE_HOST", "localhost")
LIBREOFFICE_PORT = int(os.getenv("LIBREOFFICE_PORT", "2002"))
LIBREOFFICE_PATH = os.getenv("LIBREOFFICE_PATH", "")


@app.list_tools()
async def list_tools() -> list[Tool]:
    """
    List all available tools provided by this MCP server.

    Returns:
        List of Tool objects describing available operations.
    """
    return [
        Tool(
            name="read_cell",
            description="Read a single cell value from a LibreOffice Calc spreadsheet",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file (.ods, .xlsx, etc.)",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "column": {
                        "type": "integer",
                        "description": "Column index (0-based, e.g., 0 for column A)",
                    },
                    "row": {
                        "type": "integer",
                        "description": "Row index (0-based)",
                    },
                },
                "required": ["file", "column", "row"],
            },
        ),
        Tool(
            name="write_cell",
            description="Write a value to a single cell in a LibreOffice Calc spreadsheet",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "column": {
                        "type": "integer",
                        "description": "Column index (0-based)",
                    },
                    "row": {
                        "type": "integer",
                        "description": "Row index (0-based)",
                    },
                    "value": {
                        "oneOf": [{"type": "string"}, {"type": "number"}],
                        "description": "Value to write (text or number)",
                    },
                },
                "required": ["file", "column", "row", "value"],
            },
        ),
        Tool(
            name="get_range",
            description="Read a range of cells from a LibreOffice Calc spreadsheet",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "range": {
                        "type": "string",
                        "description": "Cell range in A1 notation (e.g., 'A1:C10')",
                    },
                },
                "required": ["file", "range"],
            },
        ),
        Tool(
            name="list_sheets",
            description="List all sheet names in a LibreOffice Calc spreadsheet",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                },
                "required": ["file"],
            },
        ),
        Tool(
            name="read_cell_formula",
            description="Read the formula from a cell (returns None if cell doesn't contain a formula)",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "column": {
                        "type": "integer",
                        "description": "Column index (0-based)",
                    },
                    "row": {
                        "type": "integer",
                        "description": "Row index (0-based)",
                    },
                },
                "required": ["file", "column", "row"],
            },
        ),
        Tool(
            name="write_cell_formula",
            description="Write a formula to a cell (formula will be prefixed with '=' if needed)",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "column": {
                        "type": "integer",
                        "description": "Column index (0-based)",
                    },
                    "row": {
                        "type": "integer",
                        "description": "Row index (0-based)",
                    },
                    "formula": {
                        "type": "string",
                        "description": "Formula to write (e.g., 'SUM(A1:A10)' or '=SUM(A1:A10)')",
                    },
                },
                "required": ["file", "column", "row", "formula"],
            },
        ),
        Tool(
            name="write_range",
            description="Write a 2D array of values to a range of cells",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "range": {
                        "type": "string",
                        "description": "Cell range in A1 notation (e.g., 'A1:C3')",
                    },
                    "data": {
                        "type": "array",
                        "description": "2D array of values to write",
                        "items": {
                            "type": "array",
                            "items": {},
                        },
                    },
                },
                "required": ["file", "range", "data"],
            },
        ),
        Tool(
            name="create_sheet",
            description="Create a new sheet in the spreadsheet",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "name": {
                        "type": "string",
                        "description": "Name for the new sheet",
                    },
                },
                "required": ["file", "name"],
            },
        ),
        Tool(
            name="delete_sheet",
            description="Delete a sheet from the spreadsheet (cannot delete the last sheet)",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "name": {
                        "type": "string",
                        "description": "Name of the sheet to delete",
                    },
                },
                "required": ["file", "name"],
            },
        ),
        Tool(
            name="rename_sheet",
            description="Rename a sheet in the spreadsheet",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "old_name": {
                        "type": "string",
                        "description": "Current name of the sheet",
                    },
                    "new_name": {
                        "type": "string",
                        "description": "New name for the sheet",
                    },
                },
                "required": ["file", "old_name", "new_name"],
            },
        ),
        Tool(
            name="find_text",
            description="Find all cells containing the specified text",
            inputSchema={
                "type": "object",
                "properties": {
                    "file": {
                        "type": "string",
                        "description": "Path to the spreadsheet file",
                    },
                    "sheet": {
                        "type": "integer",
                        "description": "Sheet index (0-based)",
                        "default": 0,
                    },
                    "search_text": {
                        "type": "string",
                        "description": "Text to search for",
                    },
                    "match_case": {
                        "type": "boolean",
                        "description": "Case-sensitive search",
                        "default": False,
                    },
                    "match_entire": {
                        "type": "boolean",
                        "description": "Match entire cell contents",
                        "default": False,
                    },
                },
                "required": ["file", "search_text"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """
    Handle tool calls from MCP clients.

    Args:
        name: The name of the tool being called.
        arguments: The arguments passed to the tool.

    Returns:
        List of TextContent objects with the tool's result.
    """
    try:
        if name == "read_cell":
            return await _read_cell(arguments)
        elif name == "write_cell":
            return await _write_cell(arguments)
        elif name == "get_range":
            return await _get_range(arguments)
        elif name == "list_sheets":
            return await _list_sheets(arguments)
        elif name == "read_cell_formula":
            return await _read_cell_formula(arguments)
        elif name == "write_cell_formula":
            return await _write_cell_formula(arguments)
        elif name == "write_range":
            return await _write_range(arguments)
        elif name == "create_sheet":
            return await _create_sheet(arguments)
        elif name == "delete_sheet":
            return await _delete_sheet(arguments)
        elif name == "rename_sheet":
            return await _rename_sheet(arguments)
        elif name == "find_text":
            return await _find_text(arguments)
        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except LibreOfficeConnectionError as e:
        # Provide structured error for better client handling
        error_msg = str(e)
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{error_msg}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except Exception as e:
        return [TextContent(type="text", text=f"Error: {str(e)}")]


async def _read_cell(arguments: dict[str, Any]) -> list[TextContent]:
    """Read a cell value using UNO."""
    file_path = arguments["file"]
    column = arguments["column"]
    row = arguments["row"]
    sheet = arguments.get("sheet", 0)

    try:
        # Ensure connection is configured
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        value = read_cell(file_path, column, row, sheet, conn)

        result = {
            "file": file_path,
            "sheet": sheet,
            "column": column,
            "row": row,
            "value": value,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _write_cell(arguments: dict[str, Any]) -> list[TextContent]:
    """Write a cell value using UNO."""
    file_path = arguments["file"]
    column = arguments["column"]
    row = arguments["row"]
    value = arguments["value"]
    sheet = arguments.get("sheet", 0)

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        write_cell(file_path, column, row, value, sheet, conn)

        result = {
            "success": True,
            "file": file_path,
            "sheet": sheet,
            "column": column,
            "row": row,
            "value": value,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _get_range(arguments: dict[str, Any]) -> list[TextContent]:
    """Get a range of cells using UNO."""
    file_path = arguments["file"]
    range_str = arguments["range"]
    sheet = arguments.get("sheet", 0)

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        data = get_range(file_path, range_str, sheet, conn)

        result = {
            "file": file_path,
            "sheet": sheet,
            "range": range_str,
            "data": data,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _list_sheets(arguments: dict[str, Any]) -> list[TextContent]:
    """List all sheets using UNO."""
    file_path = arguments["file"]

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        sheets = list_sheets(file_path, conn)

        result = {
            "file": file_path,
            "sheets": sheets,
            "count": len(sheets),
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _read_cell_formula(arguments: dict[str, Any]) -> list[TextContent]:
    """Read a cell formula using UNO."""
    file_path = arguments["file"]
    column = arguments["column"]
    row = arguments["row"]
    sheet = arguments.get("sheet", 0)

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        formula = read_cell_formula(file_path, column, row, sheet, conn)

        result = {
            "file": file_path,
            "sheet": sheet,
            "column": column,
            "row": row,
            "formula": formula,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _write_cell_formula(arguments: dict[str, Any]) -> list[TextContent]:
    """Write a cell formula using UNO."""
    file_path = arguments["file"]
    column = arguments["column"]
    row = arguments["row"]
    formula = arguments["formula"]
    sheet = arguments.get("sheet", 0)

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        write_cell_formula(file_path, column, row, formula, sheet, conn)

        result = {
            "success": True,
            "file": file_path,
            "sheet": sheet,
            "column": column,
            "row": row,
            "formula": formula,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _write_range(arguments: dict[str, Any]) -> list[TextContent]:
    """Write a range of cells using UNO."""
    file_path = arguments["file"]
    range_ref = arguments["range"]
    data = arguments["data"]
    sheet = arguments.get("sheet", 0)

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        write_range(file_path, range_ref, data, sheet, conn)

        result = {
            "success": True,
            "file": file_path,
            "sheet": sheet,
            "range": range_ref,
            "rows_written": len(data),
            "columns_written": len(data[0]) if data else 0,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _create_sheet(arguments: dict[str, Any]) -> list[TextContent]:
    """Create a new sheet using UNO."""
    file_path = arguments["file"]
    sheet_name = arguments["name"]

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        create_sheet(file_path, sheet_name, conn)

        result = {
            "success": True,
            "file": file_path,
            "sheet_name": sheet_name,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _delete_sheet(arguments: dict[str, Any]) -> list[TextContent]:
    """Delete a sheet using UNO."""
    file_path = arguments["file"]
    sheet_name = arguments["name"]

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        delete_sheet(file_path, sheet_name, conn)

        result = {
            "success": True,
            "file": file_path,
            "deleted_sheet": sheet_name,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _rename_sheet(arguments: dict[str, Any]) -> list[TextContent]:
    """Rename a sheet using UNO."""
    file_path = arguments["file"]
    old_name = arguments["old_name"]
    new_name = arguments["new_name"]

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        rename_sheet(file_path, old_name, new_name, conn)

        result = {
            "success": True,
            "file": file_path,
            "old_name": old_name,
            "new_name": new_name,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def _find_text(arguments: dict[str, Any]) -> list[TextContent]:
    """Find text in a sheet using UNO."""
    file_path = arguments["file"]
    search_text = arguments["search_text"]
    sheet = arguments.get("sheet", 0)
    match_case = arguments.get("match_case", False)
    match_entire = arguments.get("match_entire", False)

    try:
        conn = get_connection(host=LIBREOFFICE_HOST, port=LIBREOFFICE_PORT)
        results = find_text(file_path, search_text, sheet, match_case, match_entire, conn)

        formatted_results = [
            {"column": col, "row": row, "value": val} for col, row, val in results
        ]

        result = {
            "file": file_path,
            "sheet": sheet,
            "search_text": search_text,
            "match_count": len(results),
            "matches": formatted_results,
        }

        return [TextContent(type="text", text=json.dumps(result, indent=2))]

    except LibreOfficeConnectionError as e:
        return [TextContent(
            type="text",
            text=f"""LibreOffice Connection Error

{str(e)}

Quick Start:
  Windows: Double-click packages/libreoffice-calc-mcp/start.bat
  Cross-platform: cd packages/libreoffice-calc-mcp && npm start

For help, see: packages/libreoffice-calc-mcp/QUICKSTART.md"""
        )]
    except CalcError as e:
        return [TextContent(type="text", text=f"Calc Error: {str(e)}")]
    except Exception as e:
        return [TextContent(type="text", text=f"Unexpected error: {str(e)}")]


async def main() -> None:
    """Main entry point for the MCP server."""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())
