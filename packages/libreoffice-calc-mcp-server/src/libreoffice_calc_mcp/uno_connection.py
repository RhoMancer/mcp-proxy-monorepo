"""
UNO Connection Manager for LibreOffice

Handles connection to a running LibreOffice instance via socket.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator
from urllib.parse import urlencode

# UNO imports - these come from LibreOffice's Python installation
try:
    import uno
    from com.sun.star.beans import PropertyValue
except ImportError:
    uno = None
    uno_err = (
        "UNO (pyuno) not found. Ensure LibreOffice is installed and "
        "its Python directory is in PYTHONPATH. "
        "\nWindows: Add LibreOffice program/python.exe-3.10 to PYTHONPATH"
        "\nmacOS: Add /Applications/LibreOffice.app/Contents/Resources/python"
        "\nLinux: Add /usr/lib/libreoffice/program"
    )
else:
    uno_err = None


class LibreOfficeConnectionError(Exception):
    """Raised when connection to LibreOffice fails."""

    pass


class UNOConnection:
    """
    Manages a connection to a running LibreOffice instance.

    The connection uses a socket to communicate with LibreOffice's UNO interface.
    LibreOffice must be started with socket listening enabled:

        soffice --accept="socket,host=localhost,port=2002;urp;StarOffice.ServiceManager"
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 2002,
    ) -> None:
        """
        Initialize the UNO connection manager.

        Args:
            host: Host where LibreOffice is listening (default: localhost)
            port: Port where LibreOffice is listening (default: 2002)

        Raises:
            LibreOfficeConnectionError: If UNO is not available
        """
        if uno is None:
            raise LibreOfficeConnectionError(uno_err)

        self.host = host
        self.port = port
        self._local_context = None
        self._resolver = None
        self._context = None
        self._service_manager = None
        self._desktop = None
        self._connected = False

    def connect(self) -> None:
        """
        Connect to the running LibreOffice instance.

        Raises:
            LibreOfficeConnectionError: If connection fails

        Example:
            >>> conn = UNOConnection()
            >>> conn.connect()
            >>> doc = conn.open_document("file:///path/to/file.ods")
        """
        if self._connected:
            return

        # Get the local component context
        self._local_context = uno.getComponentContext()

        # Create the UnoUrlResolver
        self._resolver = self._local_context.ServiceManager.createInstanceWithContext(
            "com.sun.star.bridge.UnoUrlResolver", self._local_context
        )

        # Build connection string and connect
        connection_string = f"uno:socket,host={self.host},port={self.port};urp;StarOffice.ComponentContext"

        try:
            self._context = self._resolver.resolve(connection_string)
        except Exception as e:
            # Detect if we're running in a proxy context
            in_proxy_context = os.getenv("MCP_PROXY_PORT") or os.getenv("MCP_LIBREOFFICE_PATH")

            if in_proxy_context:
                # Running through the proxy - more technical error
                raise LibreOfficeConnectionError(
                    f"Could not connect to LibreOffice at {self.host}:{self.port}. "
                    f"Make sure you ran 'npm start' or 'node start.js' first to auto-start LibreOffice."
                ) from e
            else:
                # Running directly - helpful instructions
                raise LibreOfficeConnectionError(
                    f"LibreOffice Calc connector isn't currently running.\n\n"
                    f"To fix this:\n"
                    f"  1. Use the proxy wrapper which auto-starts LibreOffice:\n"
                    f"     - Windows: Double-click 'start.bat' in packages/libreoffice-calc-mcp/\n"
                    f"     - Or run: node packages/libreoffice-calc-mcp/start.js\n\n"
                    f"  2. Or manually start LibreOffice with socket mode:\n"
                    f"     soffice --accept=\"socket,host={self.host},port={self.port};urp;StarOffice.ServiceManager\""
                ) from e

        # Get the service manager
        self._service_manager = self._context.ServiceManager

        # Get the desktop object - main entry point for document operations
        self._desktop = self._service_manager.createInstanceWithContext(
            "com.sun.star.frame.Desktop", self._context
        )

        self._connected = True

    def disconnect(self) -> None:
        """Disconnect from LibreOffice."""
        self._connected = False
        self._desktop = None
        self._service_manager = None
        self._context = None
        self._resolver = None
        self._local_context = None

    @property
    def is_connected(self) -> bool:
        """Check if currently connected to LibreOffice."""
        return self._connected

    @property
    def desktop(self) -> Any:
        """
        Get the desktop object.

        The desktop is the main entry point for working with LibreOffice documents.

        Returns:
            The UNO desktop object

        Raises:
            LibreOfficeConnectionError: If not connected
        """
        if not self._connected or self._desktop is None:
            raise LibreOfficeConnectionError("Not connected to LibreOffice")
        return self._desktop

    @property
    def service_manager(self) -> Any:
        """Get the service manager."""
        if not self._connected or self._service_manager is None:
            raise LibreOfficeConnectionError("Not connected to LibreOffice")
        return self._service_manager

    def open_document(
        self,
        path: str,
        hidden: bool = True,
    ) -> Any:
        """
        Open a LibreOffice document.

        Args:
            path: File path to the document (local file system path)
            hidden: Whether to open the document hidden (default: True)

        Returns:
            The UNO document object

        Raises:
            LibreOfficeConnectionError: If not connected or document fails to open

        Example:
            >>> conn = UNOConnection()
            >>> conn.connect()
            >>> doc = conn.open_document("/path/to/spreadsheet.ods")
            >>> sheet = doc.Sheets.getByIndex(0)
        """
        if not self._connected:
            raise LibreOfficeConnectionError("Not connected to LibreOffice")

        # Convert path to file URL if needed
        if not path.startswith("file://"):
            # Convert to absolute path and URL-encode
            abs_path = os.path.abspath(path)
            # Handle Windows drive letters (e.g., C: -> /C:)
            if abs_path[1] == ":":
                abs_path = "/" + abs_path[0] + ":" + abs_path[2:]
            # URL encode
            abs_path = abs_path.replace("\\", "/")
            file_url = "file://" + abs_path
        else:
            file_url = path

        # Set load properties
        props = ()
        if hidden:
            hidden_value = PropertyValue()
            hidden_value.Name = "Hidden"
            hidden_value.Value = True
            props = (hidden_value,)

        try:
            doc = self._desktop.loadComponentFromURL(file_url, "_blank", 0, props)
            return doc
        except Exception as e:
            raise LibreOfficeConnectionError(f"Failed to open document {path}: {e}") from e

    def create_spreadsheet(self) -> Any:
        """
        Create a new empty spreadsheet.

        Returns:
            The new spreadsheet document object

        Raises:
            LibreOfficeConnectionError: If not connected or creation fails
        """
        if not self._connected:
            raise LibreOfficeConnectionError("Not connected to LibreOffice")

        try:
            return self._desktop.loadComponentFromURL(
                "private:factory/scalc", "_blank", 0, ()
            )
        except Exception as e:
            raise LibreOfficeConnectionError(f"Failed to create spreadsheet: {e}") from e

    @contextmanager
    def document(self, path: str, hidden: bool = True) -> Generator[Any, None, None]:
        """
        Context manager for opening and closing a document.

        Args:
            path: File path to the document
            hidden: Whether to open the document hidden

        Yields:
            The UNO document object

        Example:
            >>> with UNOConnection().document("spreadsheet.ods") as doc:
            ...     sheet = doc.Sheets.getByIndex(0)
            ...     # Work with document
            ... # Document is automatically closed
        """
        doc = self.open_document(path, hidden=hidden)
        try:
            yield doc
        finally:
            try:
                doc.close(True)
            except Exception:
                pass  # Document may already be closed


# Singleton connection instance for reuse
_connection: UNOConnection | None = None


def get_connection(
    host: str | None = None,
    port: int | None = None,
) -> UNOConnection:
    """
    Get or create a UNO connection.

    This function maintains a singleton connection that can be reused
    across multiple calls.

    Args:
        host: Host to connect to (uses env var LIBREOFFICE_HOST if not specified)
        port: Port to connect to (uses env var LIBREOFFICE_PORT if not specified)

    Returns:
        A connected UNOConnection instance

    Example:
        >>> conn = get_connection()
        >>> doc = conn.open_document("file.ods")
    """
    global _connection

    # Read from environment if not specified
    if host is None:
        host = os.getenv("LIBREOFFICE_HOST", "localhost")
    if port is None:
        port = int(os.getenv("LIBREOFFICE_PORT", "2002"))

    # Create new connection if needed or if connection parameters changed
    if _connection is None:
        _connection = UNOConnection(host=host, port=port)

    # Connect if not already connected
    if not _connection.is_connected:
        _connection.connect()

    return _connection


def close_connection() -> None:
    """Close the global UNO connection if it exists."""
    global _connection
    if _connection is not None:
        _connection.disconnect()
        _connection = None
