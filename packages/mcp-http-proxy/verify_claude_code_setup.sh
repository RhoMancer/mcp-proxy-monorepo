#!/bin/bash
# ========================================================================
# Verification Script for Claude Code CLI + Hevy MCP
# ========================================================================
#
# This script verifies that:
# 1. Both proxy instances are running (ports 8082 and 8083)
# 2. MCP connection works from local proxy
# 3. Claude Code CLI is configured correctly
# 4. All Hevy MCP tools are available
#
# Usage:
#   bash verify_claude_code_setup.sh
#
# ========================================================================

echo "========================================================================"
echo "Hevy MCP - Claude Code CLI Setup Verification"
echo "========================================================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track results
PASS=0
FAIL=0

# Test 1: Check OAuth Provider proxy (port 8082)
echo "[1/6] Checking OAuth Provider proxy (port 8082)..."
if curl -s http://127.0.0.1:8082/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} OAuth Provider proxy is running"
    ((PASS++))
else
    echo -e "${RED}✗${NC} OAuth Provider proxy is NOT running"
    ((FAIL++))
fi
echo ""

# Test 2: Check Local mode proxy (port 8083)
echo "[2/6] Checking Local mode proxy (port 8083)..."
if curl -s http://127.0.0.1:8083/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Local mode proxy is running"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Local mode proxy is NOT running"
    ((FAIL++))
fi
echo ""

# Test 3: Check MCP initialize on local proxy
echo "[3/6] Testing MCP initialization on local proxy..."
INIT_RESPONSE=$(curl -s -X POST http://127.0.0.1:8083/message \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}')

if echo "$INIT_RESPONSE" | grep -q "hevy-mcp"; then
    echo -e "${GREEN}✓${NC} MCP initialization successful (hevy-mcp v1.20.9)"
    ((PASS++))
else
    echo -e "${RED}✗${NC} MCP initialization failed"
    ((FAIL++))
fi
echo ""

# Test 4: Check available tools
echo "[4/6] Checking available Hevy MCP tools..."
TOOLS_RESPONSE=$(curl -s -X POST http://127.0.0.1:8083/message \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}')

TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | grep -o '"name":' | wc -l)

if [ "$TOOL_COUNT" -ge 18 ]; then
    echo -e "${GREEN}✓${NC} All $TOOL_COUNT Hevy MCP tools are available"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Only $TOOL_COUNT tools found (expected 18)"
    ((FAIL++))
fi
echo ""

# Test 5: Check Claude Code CLI configuration
echo "[5/6] Checking Claude Code CLI configuration..."
CLAUDE_DIR="$HOME/.claude"
MCP_CONFIG="$CLAUDE_DIR/mcp_servers.json"

if [ -f "$MCP_CONFIG" ]; then
    echo -e "${GREEN}✓${NC} MCP config file exists at $MCP_CONFIG"

    # Check if hevy server is configured
    if grep -q "hevy" "$MCP_CONFIG"; then
        echo -e "${GREEN}✓${NC} Hevy MCP server is configured"

        # Check if URL is correct
        if grep -q "8083" "$MCP_CONFIG"; then
            echo -e "${GREEN}✓${NC} Hevy is configured for port 8083 (local mode)"
            ((PASS++))
        else
            echo -e "${YELLOW}⚠${NC} Hevy is configured but not on port 8083"
            echo "  Current config:"
            cat "$MCP_CONFIG" | grep -A 5 "hevy" || true
            ((FAIL++))
        fi
    else
        echo -e "${YELLOW}⚠${NC} Hevy MCP server is NOT configured in $MCP_CONFIG"
        echo "  Add this configuration:"
        echo '  {'
        echo '    "mcpServers": {'
        echo '      "hevy": {'
        echo '        "transport": {'
        echo '          "type": "http",'
        echo '          "url": "http://127.0.0.1:8083/message"'
        echo '        }'
        echo '      }'
        echo '    }'
        echo '  }'
        ((FAIL++))
    fi
else
    echo -e "${YELLOW}⚠${NC} MCP config file not found at $MCP_CONFIG"
    echo "  Create it with:"
    echo "  mkdir -p ~/.claude"
    echo '  echo '"'"'{"mcpServers":{"hevy":{"transport":{"type":"http","url":"http://127.0.0.1:8083/message"}}}}'"'"' > ~/.claude/mcp_servers.json'
    ((FAIL++))
fi
echo ""

# Test 6: Verify with a simple tool call
echo "[6/6] Testing tool call (get-workout-count)..."
WORKOUT_COUNT=$(curl -s -X POST http://127.0.0.1:8083/message \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get-workout-count","arguments":{}}}' | grep -o '"result":[0-9]*' | grep -o '[0-9]*' || echo "")

if [ -n "$WORKOUT_COUNT" ]; then
    echo -e "${GREEN}✓${NC} Tool call successful - You have $WORKOUT_COUNT workouts in Hevy"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Tool call test failed - API key may not be configured"
    ((FAIL++))
fi
echo ""

# Summary
echo "========================================================================"
echo "Verification Summary"
echo "========================================================================"
echo -e "Passed: ${GREEN}$PASS${NC}/6"
echo -e "Failed: ${RED}$FAIL${NC}/6"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Your Hevy MCP setup is complete. You can now:"
    echo "  1. Use Hevy MCP in Claude Code CLI (this terminal)"
    echo "  2. Use Hevy MCP in Claude.ai web app (https://claude.ai)"
    echo ""
    echo "Available tools: get-workouts, get-workout, get-workout-count,"
    echo "                 create-workout, get-routines, get-routine,"
    echo "                 get-exercise-templates, and more..."
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
    echo ""
    echo "To fix issues:"
    echo "  1. Make sure both proxies are running:"
    echo "     .\\START_HEVY_DUAL_MODE.bat"
    echo "  2. Check your .env file has HEVY_API_KEY"
    echo "  3. Verify Claude Code CLI config at ~/.claude/mcp_servers.json"
    echo ""
    echo "For full documentation: DUAL_MODE_SETUP.md"
    exit 1
fi
