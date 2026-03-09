"""
LibreOffice Calc operations using UNO.

Provides high-level functions for working with Calc spreadsheets.
"""

from __future__ import annotations

from typing import Any

from .uno_connection import UNOConnection, get_connection


class CalcError(Exception):
    """Raised when a Calc operation fails."""

    pass


def _get_sheet(doc: Any, sheet_index: int) -> Any:
    """
    Get a sheet by index from a document.

    Args:
        doc: UNO document object
        sheet_index: Sheet index (0-based)

    Returns:
        UNO sheet object

    Raises:
        CalcError: If sheet index is invalid
    """
    try:
        sheets = doc.Sheets
        if sheet_index < 0 or sheet_index >= sheets.getCount():
            raise CalcError(
                f"Sheet index {sheet_index} out of range. "
                f"Document has {sheets.getCount()} sheets."
            )
        return sheets.getByIndex(sheet_index)
    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to get sheet {sheet_index}: {e}") from e


def _get_sheet_by_name(doc: Any, sheet_name: str) -> Any:
    """
    Get a sheet by name from a document.

    Args:
        doc: UNO document object
        sheet_name: Name of the sheet

    Returns:
        UNO sheet object

    Raises:
        CalcError: If sheet name is not found
    """
    try:
        sheets = doc.Sheets
        if not sheets.hasByName(sheet_name):
            available = [sheets.getByIndex(i).getName() for i in range(sheets.getCount())]
            raise CalcError(
                f"Sheet '{sheet_name}' not found. Available sheets: {available}"
            )
        return sheets.getByName(sheet_name)
    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to get sheet '{sheet_name}': {e}") from e


def parse_cell_reference(ref: str) -> tuple[int, int]:
    """
    Parse an A1-style cell reference to column and row indices.

    Args:
        ref: Cell reference like "A1", "B2", "Z10"

    Returns:
        Tuple of (column, row) as 0-based indices

    Example:
        >>> parse_cell_reference("A1")
        (0, 0)
        >>> parse_cell_reference("B2")
        (1, 1)
        >>> parse_cell_reference("AA10")
        (26, 9)
    """
    ref = ref.upper().strip()
    if not ref or ref[0] < "A" or ref[0] > "Z":
        raise ValueError(f"Invalid cell reference: {ref}")

    col = 0
    row_part = ""

    for i, char in enumerate(ref):
        if "A" <= char <= "Z":
            col = col * 26 + (ord(char) - ord("A"))
        else:
            row_part = ref[i:]
            break

    if row_part == "":
        raise ValueError(f"Invalid cell reference: {ref}")

    row = int(row_part) - 1  # Convert to 0-based

    return col, row


def parse_range_reference(ref: str) -> tuple[int, int, int, int]:
    """
    Parse an A1-style range reference.

    Args:
        ref: Range reference like "A1:B10", "A1:A1"

    Returns:
        Tuple of (start_col, start_row, end_col, end_row) as 0-based indices (inclusive)

    Example:
        >>> parse_range_reference("A1:B2")
        (0, 0, 1, 1)
        >>> parse_range_reference("A1:C10")
        (0, 0, 2, 9)
    """
    if ":" not in ref:
        raise ValueError(f"Invalid range reference: {ref}")

    start, end = ref.split(":", 1)
    start_col, start_row = parse_cell_reference(start)
    end_col, end_row = parse_cell_reference(end)

    return start_col, start_row, end_col, end_row


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
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)
        cell = sheet.getCellByPosition(column, row)

        # Determine the cell type and return appropriate value
        # Type: 0=Empty, 1=Number, 2=String, 3=Formula
        cell_type = cell.getType()

        if cell_type == 0:  # Empty
            return None
        elif cell_type == 1:  # Number
            return cell.getValue()
        elif cell_type == 2:  # String
            return cell.getString()
        elif cell_type == 3:  # Formula
            # Return the formula result
            return cell.getValue()
        else:
            return cell.getString()

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to read cell ({column}, {row}): {e}") from e
    finally:
        if doc:
            try:
                doc.close(True)
            except Exception:
                pass


def write_cell(
    file_path: str,
    column: int,
    row: int,
    value: str | int | float,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> None:
    """
    Write a value to a single cell in a Calc spreadsheet.

    Note: This will modify the spreadsheet file. The file must not be
    open in LibreOffice with write access.

    Args:
        file_path: Path to the spreadsheet file
        column: Column index (0-based)
        row: Row index (0-based)
        value: Value to write (string or number)
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection (uses default if not provided)

    Raises:
        CalcError: If the operation fails

    Example:
        >>> write_cell("sheet.ods", 0, 0, "Hello")  # Write to A1
        >>> write_cell("sheet.ods", 1, 0, 42)  # Write to B1
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)
        cell = sheet.getCellByPosition(column, row)

        # Set value based on type
        if isinstance(value, (int, float)):
            cell.setValue(float(value))
        else:
            cell.setString(str(value))

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to write cell ({column}, {row}): {e}") from e
    finally:
        if doc:
            try:
                # Save and close
                doc.store()
                doc.close(True)
            except Exception:
                pass


def get_range(
    file_path: str,
    range_ref: str,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> list[list[str | int | float | None]]:
    """
    Read a range of cells from a Calc spreadsheet.

    Args:
        file_path: Path to the spreadsheet file
        range_ref: Range in A1 notation (e.g., "A1:C10")
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection (uses default if not provided)

    Returns:
        2D list of cell values

    Raises:
        CalcError: If the operation fails

    Example:
        >>> data = get_range("sheet.ods", "A1:C3")
        >>> print(data)
        [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)

        cell_range = sheet.getCellRangeByName(range_ref)
        data_array = cell_range.getDataArray()

        # Convert UNO array to Python list
        result = []
        for row in data_array:
            result.append(list(row))

        return result

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to get range {range_ref}: {e}") from e
    finally:
        if doc:
            try:
                doc.close(True)
            except Exception:
                pass


def list_sheets(
    file_path: str,
    connection: UNOConnection | None = None,
) -> list[str]:
    """
    List all sheet names in a Calc spreadsheet.

    Args:
        file_path: Path to the spreadsheet file
        connection: Optional UNO connection (uses default if not provided)

    Returns:
        List of sheet names

    Raises:
        CalcError: If the operation fails

    Example:
        >>> names = list_sheets("sheet.ods")
        >>> print(names)
        ['Sheet1', 'Sheet2', 'Data']
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheets = doc.Sheets

        sheet_names = []
        for i in range(sheets.getCount()):
            sheet = sheets.getByIndex(i)
            sheet_names.append(sheet.getName())

        return sheet_names

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to list sheets: {e}") from e
    finally:
        if doc:
            try:
                doc.close(True)
            except Exception:
                pass


def get_cell_count(
    file_path: str,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> tuple[int, int]:
    """
    Get the used area dimensions of a sheet.

    Args:
        file_path: Path to the spreadsheet file
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection (uses default if not provided)

    Returns:
        Tuple of (column_count, row_count) for the used area

    Example:
        >>> cols, rows = get_cell_count("sheet.ods")
        >>> print(f"Used area: {cols} columns x {rows} rows")
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)

        # Get the used area
        cursor = sheet.createCursor()
        cursor.gotoStartOfUsedArea(False)
        cursor.gotoEndOfUsedArea(True)

        range_obj = cursor.getRangeAddress()
        columns = range_obj.EndColumn - range_obj.StartColumn + 1
        rows = range_obj.EndRow - range_obj.StartRow + 1

        return columns, rows

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to get cell count: {e}") from e
    finally:
        if doc:
            try:
                doc.close(True)
            except Exception:
                pass


# ============================================================================
# Formula Operations
# ============================================================================


def read_cell_formula(
    file_path: str,
    column: int,
    row: int,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> str | None:
    """
    Read the formula from a cell.

    Args:
        file_path: Path to the spreadsheet file
        column: Column index (0-based)
        row: Row index (0-based)
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection

    Returns:
        The formula string (e.g., "=SUM(A1:A10)") or None if not a formula

    Example:
        >>> formula = read_cell_formula("sheet.ods", 2, 0)
        >>> print(formula)
        '=SUM(A1:B1)'
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)
        cell = sheet.getCellByPosition(column, row)

        # Check if cell contains a formula (type 3)
        if cell.getType() == 3:
            return cell.getFormula()
        return None

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to read formula from cell ({column}, {row}): {e}") from e
    finally:
        if doc:
            try:
                doc.close(True)
            except Exception:
                pass


def write_cell_formula(
    file_path: str,
    column: int,
    row: int,
    formula: str,
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> None:
    """
    Write a formula to a cell.

    Args:
        file_path: Path to the spreadsheet file
        column: Column index (0-based)
        row: Row index (0-based)
        formula: Formula string (should start with "=")
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection

    Example:
        >>> write_cell_formula("sheet.ods", 2, 0, "=SUM(A1:B1)")
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)
        cell = sheet.getCellByPosition(column, row)

        # Ensure formula starts with =
        if not formula.startswith("="):
            formula = f"={formula}"

        cell.setFormula(formula)

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to write formula to cell ({column}, {row}): {e}") from e
    finally:
        if doc:
            try:
                doc.store()
                doc.close(True)
            except Exception:
                pass


# ============================================================================
# Batch Operations
# ============================================================================


def write_range(
    file_path: str,
    range_ref: str,
    data: list[list[Any]],
    sheet_index: int = 0,
    connection: UNOConnection | None = None,
) -> None:
    """
    Write a 2D array of values to a range of cells.

    Args:
        file_path: Path to the spreadsheet file
        range_ref: Range in A1 notation (e.g., "A1:C3")
        data: 2D list of values to write
        sheet_index: Sheet index (0-based, default: 0)
        connection: Optional UNO connection

    Example:
        >>> write_range("sheet.ods", "A1:C2", [[1, 2, 3], [4, 5, 6]])
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)

        cell_range = sheet.getCellRangeByName(range_ref)
        cell_range.setDataArray(tuple(tuple(row) for row in data))

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to write range {range_ref}: {e}") from e
    finally:
        if doc:
            try:
                doc.store()
                doc.close(True)
            except Exception:
                pass


# ============================================================================
# Sheet Operations
# ============================================================================


def create_sheet(
    file_path: str,
    sheet_name: str,
    connection: UNOConnection | None = None,
) -> None:
    """
    Create a new sheet in the spreadsheet.

    Args:
        file_path: Path to the spreadsheet file
        sheet_name: Name for the new sheet
        connection: Optional UNO connection

    Example:
        >>> create_sheet("sheet.ods", "My Data")
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheets = doc.Sheets

        if sheets.hasByName(sheet_name):
            raise CalcError(f"Sheet '{sheet_name}' already exists")

        sheets.insertNewByName(sheet_name, sheets.getCount())

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to create sheet '{sheet_name}': {e}") from e
    finally:
        if doc:
            try:
                doc.store()
                doc.close(True)
            except Exception:
                pass


def delete_sheet(
    file_path: str,
    sheet_name: str,
    connection: UNOConnection | None = None,
) -> None:
    """
    Delete a sheet from the spreadsheet.

    Args:
        file_path: Path to the spreadsheet file
        sheet_name: Name of the sheet to delete
        connection: Optional UNO connection

    Example:
        >>> delete_sheet("sheet.ods", "Old Data")
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheets = doc.Sheets

        if not sheets.hasByName(sheet_name):
            raise CalcError(f"Sheet '{sheet_name}' not found")

        # Don't allow deleting the last sheet
        if sheets.getCount() <= 1:
            raise CalcError("Cannot delete the last remaining sheet")

        sheets.removeByName(sheet_name)

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to delete sheet '{sheet_name}': {e}") from e
    finally:
        if doc:
            try:
                doc.store()
                doc.close(True)
            except Exception:
                pass


def rename_sheet(
    file_path: str,
    old_name: str,
    new_name: str,
    connection: UNOConnection | None = None,
) -> None:
    """
    Rename a sheet in the spreadsheet.

    Args:
        file_path: Path to the spreadsheet file
        old_name: Current name of the sheet
        new_name: New name for the sheet
        connection: Optional UNO connection

    Example:
        >>> rename_sheet("sheet.ods", "Sheet1", "Data")
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheets = doc.Sheets

        if not sheets.hasByName(old_name):
            raise CalcError(f"Sheet '{old_name}' not found")

        if sheets.hasByName(new_name):
            raise CalcError(f"A sheet named '{new_name}' already exists")

        sheet = sheets.getByName(old_name)
        sheet.setName(new_name)

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to rename sheet from '{old_name}' to '{new_name}': {e}") from e
    finally:
        if doc:
            try:
                doc.store()
                doc.close(True)
            except Exception:
                pass


# ============================================================================
# Search Operations
# ============================================================================


def find_text(
    file_path: str,
    search_text: str,
    sheet_index: int = 0,
    match_case: bool = False,
    match_entire: bool = False,
    connection: UNOConnection | None = None,
) -> list[tuple[int, int, str]]:
    """
    Find all cells containing the specified text.

    Args:
        file_path: Path to the spreadsheet file
        search_text: Text to search for
        sheet_index: Sheet index (0-based, default: 0)
        match_case: Case-sensitive search
        match_entire: Match entire cell contents
        connection: Optional UNO connection

    Returns:
        List of tuples (column, row, cell_value) for each match

    Example:
        >>> results = find_text("sheet.ods", "Total")
        >>> for col, row, value in results:
        ...     print(f"Found at ({col}, {row}): {value}")
    """
    conn = connection or get_connection()
    doc = None

    try:
        doc = conn.open_document(file_path)
        sheet = _get_sheet(doc, sheet_index)

        # Create a search descriptor
        search = sheet.createSearchDescriptor()

        if match_case:
            search.SearchCaseSensitive = True
        if match_entire:
            search.SearchWords = True

        search.SearchString = search_text

        # Find all matches
        results = []
        found = sheet.findFirst(search)

        while found:
            addr = found.getCellAddress()
            col, row = addr.Column, addr.Row
            value = found.getString()
            results.append((col, row, value))

            found = sheet.findNext(found, search)

        return results

    except Exception as e:
        if isinstance(e, CalcError):
            raise
        raise CalcError(f"Failed to search for '{search_text}': {e}") from e
    finally:
        if doc:
            try:
                doc.close(True)
            except Exception:
                pass
