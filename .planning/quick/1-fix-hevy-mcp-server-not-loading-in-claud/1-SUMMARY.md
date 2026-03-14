---
phase: quick
plan: 1
subsystem: mcp-http-proxy
tags: [bugfix, mcp-http-transport, sse]
dependency_graph:
  requires: []
  provides: [mcp-http-spec-compliance]
  affects: [ProxyServer.js]
tech_stack:
  added: []
  patterns: [request-id-tracking, structured-logging]
key_files:
  created: []
  modified:
    - path: packages/mcp-http-proxy/src/ProxyServer.js
      change: Added root path SSE endpoint for MCP HTTP transport spec compliance
decisions: []
metrics:
  duration: 15
  completed_date: "2026-03-14"
---

# Quick Task 1: Fix Hevy MCP Server Not Loading in Claude

## One-Liner

Added root path SSE endpoint to comply with MCP HTTP transport spec, fixing Claude Code CLI connectivity

## Objective

Fix Hevy MCP server not loading in Claude Code CLI. Ensure Claude Code CLI can successfully discover and use the Hevy MCP server via HTTP transport.

## Root Cause

The MCP HTTP transport specification requires that clients must be able to GET the base URL (root path `/`) and receive a Server-Sent Events (SSE) stream that sends an `endpoint` event pointing to the message endpoint. The proxy was only serving this endpoint at `/sse`, causing Claude Code CLI to fail during the initial connection/discovery phase.

## Changes Made

### 1. Root Path SSE Endpoint (`packages/mcp-http-proxy/src/ProxyServer.js`)

Added a new GET handler at the root path `/` that:
- Returns proper SSE headers (`Content-Type: text/event-stream`)
- Sends an `endpoint` event with the full URL to `/message`
- Implements keep-alive mechanism (15-second intervals)
- Includes connection logging with request IDs for debugging

### 2. Enhanced Logging

Improved request logging throughout the proxy:
- Added unique request IDs for tracking individual requests
- Separate log prefixes for root SSE (`[ROOT-SSE]`), alternate SSE (`[SSE]`), and message handling (`[MESSAGE]`)
- More detailed connection lifecycle logging

### 3. Improved Error Handling

Enhanced the `/sse` endpoint with:
- Try-catch wrapper for keep-alive writes
- Better error logging on connection failures
- Request ID correlation for debugging

## Verification

The fix was verified with:

1. **Root path SSE response:**
   ```
   event: endpoint
   data: http://127.0.0.1:8083/message
   ```

2. **Health endpoint confirms:**
   - `mcpRunning: true`
   - `mcpInitialized: true`

3. **All 20 Hevy tools accessible** via `/message` endpoint

## Deviations from Plan

None - this was a quick fix task executed exactly as needed.

## Technical Notes

- The root path handler is placed before the `/sse` handler to ensure proper route matching
- Both endpoints respect authentication middleware when enabled
- Keep-alive mechanism prevents connection timeouts during long-lived sessions
- Request ID format: 16-character hex string for uniqueness

## Files Modified

- `packages/mcp-http-proxy/src/ProxyServer.js`
  - Added lines 278-320: Root path SSE handler
  - Enhanced lines 322-362: Improved `/sse` endpoint with better logging
  - Enhanced lines 435-483: Added request ID logging to JSON-RPC handler

## Commit

- **Hash:** `9087c64`
- **Message:** `fix(quick-1): add root path SSE endpoint for MCP HTTP transport spec compliance`

## Impact

This fix enables Claude Code CLI (and other MCP HTTP transport clients) to properly discover and connect to MCP servers proxied through the HTTP gateway. The proxy is now compliant with the MCP HTTP transport specification for SSE endpoint discovery.

## Success Criteria

- [x] Root path SSE endpoint responds with proper event-stream format
- [x] Health endpoint shows MCP running and initialized
- [x] Tools endpoint returns all 20 Hevy tools
- [x] Message endpoint handles JSON-RPC correctly
- [x] MCP HTTP transport spec compliance achieved
