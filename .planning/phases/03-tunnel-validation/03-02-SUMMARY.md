---
phase: 03-tunnel-validation
plan: 02
subsystem: Documentation
tags: [documentation, oauth-provider, tunnel-mode, local-mode]
dependency_graph:
  requires: []
  provides: [TUNNEL-03]
  affects: [README.md, docs/claude-connectors-guide.md]
tech_stack:
  added: []
  patterns: [Progressive documentation, Decision tree guidance]
key_files:
  created: []
  modified:
    - packages/mcp-http-proxy/README.md
    - packages/mcp-http-proxy/docs/claude-connectors-guide.md
decisions: []
metrics:
  duration_seconds: 300
  completed_date: 2026-03-14
---

# Phase 03 Plan 02: Documentation Clarity Summary

**One-liner:** Added tunnel mode vs local mode clarification to README and claude-connectors-guide with decision tree guidance and side-by-side configuration comparison.

## Objective Met

Users can now easily distinguish between local development mode (no auth, Claude Code CLI) and OAuth Provider mode (tunnel, Claude.ai Connectors) and understand when to use each.

## Completed Tasks

| Task | Name | Commit | Files Modified |
| ---- | ----- | ------ | -------------- |
| 1 | Add tunnel mode clarification to README | 7712bc2 | packages/mcp-http-proxy/README.md |
| 2 | Update claude-connectors-guide with tunnel context | 79aa4b5 | packages/mcp-http-proxy/docs/claude-connectors-guide.md |
| 3 | Documentation verification checkpoint | Approved | Verified by user |

## Changes Made

### README.md (Task 1 - Commit 7712bc2)

1. **Added "When to Use Each Mode" section** (lines 81-96):
   - Local Mode (No Auth): Claude Code CLI, local development, trusted networks
   - OAuth Provider Mode (Tunnel): Claude.ai Connectors, external HTTPS, Cloudflare Tunnel
   - OAuth 2.0 Redirect Mode: Personal use with GitHub/Google auth

2. **Added "Tunnel Mode Quick Start" section** (lines 132-164):
   - Clarifies tunnel mode requires OAuth Provider
   - Links to claude-connectors-guide.md for full setup
   - Shows minimal tunnel config snippet with `tunnel` and `oauthProvider` keys
   - References example config `claude-connectors-hevy.config.js`

3. **Enhanced comparison table** (lines 73-78):
   - Added "Tunnel Required?" column
   - Local: No | OAuth 2.0: Optional | OAuth Provider: Yes (for Claude.ai)

4. **Added note in OAuth Provider section** (line 256):
   - Clarifies OAuth Provider mode is designed for tunnel/Claude.ai use cases
   - Recommends Local Mode for local Claude Code CLI development

### claude-connectors-guide.md (Task 2 - Commit 79aa4b5)

1. **Added prominent "Local vs Tunnel Mode" note** (lines 25-33):
   - Positioned right after Overview section
   - Explains this guide is for OAuth Provider mode (tunnel access)
   - Links to README Local Development Mode for Claude Code CLI setup
   - Shows key differences in table format

2. **Added before-step decision guidance** in Quick Setup (lines 45-48):
   - "Before you start: Decide if you need tunnel access"
   - Decision points: Claude.ai Connectors vs Claude Code CLI
   - Directs users to appropriate documentation

3. **Added "Tunnel vs Local Configuration Comparison" section** (lines 101-156):
   - Side-by-side config comparison showing:
     - LOCAL MODE: No auth, no oauthProvider, no tunnel
     - TUNNEL MODE: oauthProvider, tunnel config
   - Key differences table comparing:
     - Authentication (None vs OAuth Provider)
     - Access (localhost only vs External HTTPS)
     - Use case (Claude Code CLI vs Claude.ai Connectors)
     - Tunnel required (No vs Yes)

## Deviations from Plan

None - plan executed exactly as written. All tasks completed without auto-fixes or deviations.

## Verification Results

### Automated Verification
- README.md contains "When to Use Each Mode" section
- README.md contains "Tunnel Mode Quick Start" section
- README.md comparison table includes "Tunnel Required?" column
- claude-connectors-guide.md contains "Local vs Tunnel Mode" note
- claude-connectors-guide.md contains "Tunnel vs Local Configuration Comparison" section

### Human Verification (Checkpoint Approved)
User reviewed and approved the documentation changes, confirming:
- Clear distinction between local and tunnel modes
- Proper cross-references between README and guide
- Decision guidance helps users choose the correct mode

## Requirements Satisfied

- **TUNNEL-03**: Documentation clearly explains tunnel vs local access differences

## Success Criteria Met

- README.md has clear mode selection guidance
- claude-connectors-guide.md distinguishes tunnel from local mode
- Both documents cross-reference each other appropriately
- Configuration examples clearly show differences (no auth vs oauthProvider)

## Key Decisions

None new in this plan. All decisions were inherited from previous plans:
- Progressive documentation pattern (Phase 02-03)
- Decision tree for mode selection (Phase 02-02)

## Self-Check: PASSED

### Files Exist
- FOUND: packages/mcp-http-proxy/README.md
- FOUND: packages/mcp-http-proxy/docs/claude-connectors-guide.md
- FOUND: .planning/phases/03-tunnel-validation/03-02-SUMMARY.md

### Commits Exist
- FOUND: 7712bc2 - docs(03-02): add tunnel mode clarification to README
- FOUND: 79aa4b5 - docs(03-02): add tunnel vs local mode clarification

### Artifacts Created
- FOUND: README.md with "When to Use Each Mode" section
- FOUND: README.md with "Tunnel Mode Quick Start" section
- FOUND: README.md comparison table with "Tunnel Required?" column
- FOUND: claude-connectors-guide.md with "Local vs Tunnel Mode" note
- FOUND: claude-connectors-guide.md with "Tunnel vs Local Configuration Comparison"
