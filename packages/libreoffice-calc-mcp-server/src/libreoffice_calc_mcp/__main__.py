#!/usr/bin/env python3
"""
Main entry point for libreoffice-calc-mcp server.

This allows the package to be run with: python -m libreoffice_calc_mcp
"""

import asyncio
from . import main

if __name__ == "__main__":
    asyncio.run(main())
