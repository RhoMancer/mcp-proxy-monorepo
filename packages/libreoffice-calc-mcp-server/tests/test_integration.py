"""
Integration tests for LibreOffice MCP server.

These tests require a running LibreOffice instance in socket listening mode:

    soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"

Or set the LIBREOFFICE_HOST and LIBREOFFICE_PORT environment variables.

Run tests with:
    pytest tests/test_integration.py -v
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

from libreoffice_calc_mcp.calc_tools import (
    CalcError,
    close_connection,
    create_sheet,
    delete_sheet,
    find_text,
    get_cell_count,
    get_range,
    list_sheets,
    parse_cell_reference,
    parse_range_reference,
    read_cell,
    read_cell_formula,
    rename_sheet,
    write_cell,
    write_cell_formula,
    write_range,
)
from libreoffice_calc_mcp.uno_connection import (
    LibreOfficeConnectionError,
    get_connection,
)


# ============================================================================
# Test Configuration
# ============================================================================

LIBREOFFICE_HOST = os.getenv("LIBREOFFICE_HOST", "localhost")
LIBREOFFICE_PORT = int(os.getenv("LIBREOFFICE_PORT", "2002"))

SKIP_REASON = "LibreOffice not running in socket mode. Start with: " \
    f'soffice --accept="socket,host={LIBREOFFICE_HOST},port={LIBREOFFICE_PORT};urp;StarOffice.ServiceManager"'


def _create_test_spreadsheet() -> Path:
    """Create a temporary test spreadsheet."""
    tmp = tempfile.NamedTemporaryFile(mode="w", suffix=".ods", delete=False)
    tmp.close()
    return Path(tmp.name)


# ============================================================================
# Connection Tests
# ============================================================================

def test_connection_available() -> None:
    """Test that LibreOffice connection can be established."""
    try:
        conn = get_connection()
        assert conn.is_connected, "Connection should be established"
    except LibreOfficeConnectionError as e:
        pytest.skip(str(e))


# ============================================================================
# Cell Reference Parsing Tests
# ============================================================================

class TestCellReferenceParsing:
    """Tests for cell reference parsing (no LibreOffice required)."""

    def test_parse_a1(self) -> None:
        assert parse_cell_reference("A1") == (0, 0)

    def test_parse_b2(self) -> None:
        assert parse_cell_reference("B2") == (1, 1)

    def test_parse_z10(self) -> None:
        assert parse_cell_reference("Z10") == (25, 9)

    def test_parse_aa10(self) -> None:
        assert parse_cell_reference("AA10") == (26, 9)

    def test_parse_lowercase(self) -> None:
        assert parse_cell_reference("a1") == (0, 0)
        assert parse_cell_reference("b2") == (1, 1)

    def test_parse_invalid(self) -> None:
        with pytest.raises(ValueError):
            parse_cell_reference("")
        with pytest.raises(ValueError):
            parse_cell_reference("123")
        with pytest.raises(ValueError):
            parse_cell_reference("A")

    def test_parse_range_a1_b2(self) -> None:
        assert parse_range_reference("A1:B2") == (0, 0, 1, 1)

    def test_parse_range_a1_c10(self) -> None:
        assert parse_range_reference("A1:C10") == (0, 0, 2, 9)

    def test_parse_range_invalid(self) -> None:
        with pytest.raises(ValueError):
            parse_range_reference("A1")
        with pytest.raises(ValueError):
            parse_range_reference("A1:")


# ============================================================================
# Basic Cell Operations Tests
# ============================================================================

@pytest.mark.skipif(
    not os.getenv("PYTEST_RUN_INTEGRATION"),
    reason="Set PYTEST_RUN_INTEGRATION=1 to run integration tests"
)
class TestBasicCellOperations:
    """Tests for basic cell read/write operations."""

    @pytest.fixture(autouse=True)
    def setup_connection(self) -> None:
        """Ensure connection is established before each test."""
        try:
            get_connection()
        except LibreOfficeConnectionError as e:
            pytest.skip(str(e))

    def test_write_and_read_string(self) -> None:
        """Test writing and reading string values."""
        test_file = _create_test_spreadsheet()
        try:
            write_cell(str(test_file), 0, 0, "Hello, World!")
            result = read_cell(str(test_file), 0, 0)
            assert result == "Hello, World!"
        finally:
            test_file.unlink(missing_ok=True)

    def test_write_and_read_number(self) -> None:
        """Test writing and reading numeric values."""
        test_file = _create_test_spreadsheet()
        try:
            write_cell(str(test_file), 0, 0, 42)
            result = read_cell(str(test_file), 0, 0)
            assert result == 42

            write_cell(str(test_file), 1, 0, 3.14)
            result = read_cell(str(test_file), 1, 0)
            assert result == pytest.approx(3.14)
        finally:
            test_file.unlink(missing_ok=True)

    def test_write_multiple_cells(self) -> None:
        """Test writing to multiple cells."""
        test_file = _create_test_spreadsheet()
        try:
            write_cell(str(test_file), 0, 0, "A")
            write_cell(str(test_file), 1, 0, "B")
            write_cell(str(test_file), 2, 0, "C")

            assert read_cell(str(test_file), 0, 0) == "A"
            assert read_cell(str(test_file), 1, 0) == "B"
            assert read_cell(str(test_file), 2, 0) == "C"
        finally:
            test_file.unlink(missing_ok=True)

    def test_read_empty_cell(self) -> None:
        """Test reading from an empty cell."""
        test_file = _create_test_spreadsheet()
        try:
            result = read_cell(str(test_file), 5, 10)
            assert result is None
        finally:
            test_file.unlink(missing_ok=True)


# ============================================================================
# Range Operations Tests
# ============================================================================

@pytest.mark.skipif(
    not os.getenv("PYTEST_RUN_INTEGRATION"),
    reason="Set PYTEST_RUN_INTEGRATION=1 to run integration tests"
)
class TestRangeOperations:
    """Tests for range read/write operations."""

    @pytest.fixture(autouse=True)
    def setup_connection(self) -> None:
        """Ensure connection is established before each test."""
        try:
            get_connection()
        except LibreOfficeConnectionError as e:
            pytest.skip(str(e))

    def test_get_range(self) -> None:
        """Test reading a range of cells."""
        test_file = _create_test_spreadsheet()
        try:
            # Write test data
            write_range(str(test_file), "A1:C2", [
                [1, 2, 3],
                [4, 5, 6],
            ])

            # Read it back
            result = get_range(str(test_file), "A1:C2")
            assert result == [[1, 2, 3], [4, 5, 6]]
        finally:
            test_file.unlink(missing_ok=True)

    def test_get_range_with_strings(self) -> None:
        """Test reading a range with mixed data types."""
        test_file = _create_test_spreadsheet()
        try:
            write_range(str(test_file), "A1:B2", [
                ["Name", "Age"],
                ["Alice", 30],
            ])

            result = get_range(str(test_file), "A1:B2")
            assert result == [["Name", "Age"], ["Alice", 30]]
        finally:
            test_file.unlink(missing_ok=True)

    def test_write_range(self) -> None:
        """Test writing a range of cells."""
        test_file = _create_test_spreadsheet()
        try:
            data = [
                [10, 20, 30],
                [40, 50, 60],
            ]
            write_range(str(test_file), "A1:C2", data)

            # Verify
            assert read_cell(str(test_file), 0, 0) == 10
            assert read_cell(str(test_file), 1, 0) == 20
            assert read_cell(str(test_file), 2, 1) == 60
        finally:
            test_file.unlink(missing_ok=True)


# ============================================================================
# Formula Operations Tests
# ============================================================================

@pytest.mark.skipif(
    not os.getenv("PYTEST_RUN_INTEGRATION"),
    reason="Set PYTEST_RUN_INTEGRATION=1 to run integration tests"
)
class TestFormulaOperations:
    """Tests for formula read/write operations."""

    @pytest.fixture(autouse=True)
    def setup_connection(self) -> None:
        """Ensure connection is established before each test."""
        try:
            get_connection()
        except LibreOfficeConnectionError as e:
            pytest.skip(str(e))

    def test_write_and_read_formula(self) -> None:
        """Test writing and reading formulas."""
        test_file = _create_test_spreadsheet()
        try:
            # Set up test data
            write_cell(str(test_file), 0, 0, 10)
            write_cell(str(test_file), 1, 0, 20)

            # Write a formula
            write_cell_formula(str(test_file), 2, 0, "=SUM(A1:B1)")

            # Read the formula
            formula = read_cell_formula(str(test_file), 2, 0)
            assert formula == "=SUM(A1:B1)"

            # Read the computed value
            value = read_cell(str(test_file), 2, 0)
            assert value == 30
        finally:
            test_file.unlink(missing_ok=True)

    def test_read_formula_from_non_formula_cell(self) -> None:
        """Test reading formula from a cell without a formula."""
        test_file = _create_test_spreadsheet()
        try:
            write_cell(str(test_file), 0, 0, "Not a formula")
            formula = read_cell_formula(str(test_file), 0, 0)
            assert formula is None
        finally:
            test_file.unlink(missing_ok=True)

    def test_formula_without_equals(self) -> None:
        """Test that formulas without = are prefixed automatically."""
        test_file = _create_test_spreadsheet()
        try:
            write_cell(str(test_file), 0, 0, 5)
            write_cell_formula(str(test_file), 1, 0, "A1*2")

            formula = read_cell_formula(str(test_file), 1, 0)
            assert formula == "=A1*2"

            value = read_cell(str(test_file), 1, 0)
            assert value == 10
        finally:
            test_file.unlink(missing_ok=True)


# ============================================================================
# Sheet Operations Tests
# ============================================================================

@pytest.mark.skipif(
    not os.getenv("PYTEST_RUN_INTEGRATION"),
    reason="Set PYTEST_RUN_INTEGRATION=1 to run integration tests"
)
class TestSheetOperations:
    """Tests for sheet management operations."""

    @pytest.fixture(autouse=True)
    def setup_connection(self) -> None:
        """Ensure connection is established before each test."""
        try:
            get_connection()
        except LibreOfficeConnectionError as e:
            pytest.skip(str(e))

    def test_list_sheets(self) -> None:
        """Test listing all sheets in a spreadsheet."""
        test_file = _create_test_spreadsheet()
        try:
            sheets = list_sheets(str(test_file))
            assert len(sheets) >= 1
            assert "Sheet1" in sheets
        finally:
            test_file.unlink(missing_ok=True)

    def test_create_sheet(self) -> None:
        """Test creating a new sheet."""
        test_file = _create_test_spreadsheet()
        try:
            initial_sheets = list_sheets(str(test_file))
            create_sheet(str(test_file), "TestSheet")

            sheets = list_sheets(str(test_file))
            assert len(sheets) == len(initial_sheets) + 1
            assert "TestSheet" in sheets
        finally:
            test_file.unlink(missing_ok=True)

    def test_create_duplicate_sheet_fails(self) -> None:
        """Test that creating a duplicate sheet raises an error."""
        test_file = _create_test_spreadsheet()
        try:
            create_sheet(str(test_file), "UniqueSheet")
            with pytest.raises(CalcError, match="already exists"):
                create_sheet(str(test_file), "UniqueSheet")
        finally:
            test_file.unlink(missing_ok=True)

    def test_rename_sheet(self) -> None:
        """Test renaming a sheet."""
        test_file = _create_test_spreadsheet()
        try:
            rename_sheet(str(test_file), "Sheet1", "RenamedSheet")

            sheets = list_sheets(str(test_file))
            assert "RenamedSheet" in sheets
            assert "Sheet1" not in sheets
        finally:
            test_file.unlink(missing_ok=True)

    def test_rename_to_existing_name_fails(self) -> None:
        """Test that renaming to an existing name raises an error."""
        test_file = _create_test_spreadsheet()
        try:
            create_sheet(str(test_file), "NewSheet")
            with pytest.raises(CalcError, match="already exists"):
                rename_sheet(str(test_file), "Sheet1", "NewSheet")
        finally:
            test_file.unlink(missing_ok=True)

    def test_delete_sheet(self) -> None:
        """Test deleting a sheet."""
        test_file = _create_test_spreadsheet()
        try:
            create_sheet(str(test_file), "ToDelete")
            initial_count = len(list_sheets(str(test_file)))

            delete_sheet(str(test_file), "ToDelete")

            sheets = list_sheets(str(test_file))
            assert len(sheets) == initial_count - 1
            assert "ToDelete" not in sheets
        finally:
            test_file.unlink(missing_ok=True)

    def test_delete_last_sheet_fails(self) -> None:
        """Test that deleting the last sheet raises an error."""
        test_file = _create_test_spreadsheet()
        try:
            # Try to delete the only remaining sheet
            sheets = list_sheets(str(test_file))
            if len(sheets) == 1:
                with pytest.raises(CalcError, match="Cannot delete the last"):
                    delete_sheet(str(test_file), sheets[0])
        finally:
            test_file.unlink(missing_ok=True)


# ============================================================================
# Utility Tests
# ============================================================================

@pytest.mark.skipif(
    not os.getenv("PYTEST_RUN_INTEGRATION"),
    reason="Set PYTEST_RUN_INTEGRATION=1 to run integration tests"
)
class TestUtilityOperations:
    """Tests for utility operations."""

    @pytest.fixture(autouse=True)
    def setup_connection(self) -> None:
        """Ensure connection is established before each test."""
        try:
            get_connection()
        except LibreOfficeConnectionError as e:
            pytest.skip(str(e))

    def test_get_cell_count(self) -> None:
        """Test getting the used area dimensions."""
        test_file = _create_test_spreadsheet()
        try:
            write_range(str(test_file), "A1:C3", [
                [1, 2, 3],
                [4, 5, 6],
                [7, 8, 9],
            ])

            cols, rows = get_cell_count(str(test_file))
            assert cols >= 3
            assert rows >= 3
        finally:
            test_file.unlink(missing_ok=True)

    def test_find_text(self) -> None:
        """Test finding text in cells."""
        test_file = _create_test_spreadsheet()
        try:
            write_range(str(test_file), "A1:B2", [
                ["Apple", "Banana"],
                ["Cherry", "Apple"],
            ])

            results = find_text(str(test_file), "Apple")
            assert len(results) == 2
            assert (0, 0, "Apple") in results
            assert (1, 1, "Apple") in results
        finally:
            test_file.unlink(missing_ok=True)

    def test_find_text_case_sensitive(self) -> None:
        """Test case-sensitive text search."""
        test_file = _create_test_spreadsheet()
        try:
            write_range(str(test_file), "A1:A2", [
                ["apple"],
                ["Apple"],
            ])

            results = find_text(str(test_file), "Apple", match_case=True)
            assert len(results) == 1
            assert results[0][2] == "Apple"
        finally:
            test_file.unlink(missing_ok=True)

    def test_find_text_match_entire(self) -> None:
        """Test matching entire cell contents."""
        test_file = _create_test_spreadsheet()
        try:
            write_range(str(test_file), "A1:A2", [
                ["Total"],
                ["Grand Total"],
            ])

            results = find_text(str(test_file), "Total", match_entire=True)
            assert len(results) == 1
            assert results[0][2] == "Total"
        finally:
            test_file.unlink(missing_ok=True)


# ============================================================================
# Windows File URL Tests (Regression Test)
# ============================================================================

@pytest.mark.skipif(
    not os.getenv("PYTEST_RUN_INTEGRATION"),
    reason="Set PYTEST_RUN_INTEGRATION=1 to run integration tests"
)
class TestWindowsFileURL:
    """Regression tests for Windows file URL handling."""

    @pytest.fixture(autouse=True)
    def setup_connection(self) -> None:
        """Ensure connection is established before each test."""
        try:
            get_connection()
        except LibreOfficeConnectionError as e:
            pytest.skip(str(e))

    def test_windows_file_url_with_drive_letter(self) -> None:
        """Test that file URLs with Windows drive letters work correctly.

        This is a regression test for the bug where Windows drive letters
        lost their colon (C: -> C) causing type detection failures.
        """
        test_file = _create_test_spreadsheet()

        # Ensure we have an absolute path with a drive letter (Windows)
        abs_path = str(test_file.absolute())

        try:
            write_cell(abs_path, 0, 0, "Test")
            result = read_cell(abs_path, 0, 0)
            assert result == "Test"
        finally:
            test_file.unlink(missing_ok=True)


# ============================================================================
# Cleanup
# ============================================================================

def test_close_connection() -> None:
    """Test that the connection can be properly closed."""
    try:
        conn = get_connection()
        assert conn.is_connected
        close_connection()
        # Connection should be closed
        # Note: A new connection will be created if needed
    except LibreOfficeConnectionError:
        pytest.skip(SKIP_REASON)
