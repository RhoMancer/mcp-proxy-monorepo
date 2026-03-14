# MCP HTTP Proxy - Multi-Context Access Fix: Roadmap

**Created:** 2026-03-13
**Granularity:** Standard (5-8 phases target)
**Coverage:** 15/15 requirements mapped

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Diagnostics | 4/4 | Complete | [01-00](.planning/phases/01-diagnostics/01-00-SUMMARY.md) - Test Stubs, [01-01](.planning/phases/01-diagnostics/01-01-SUMMARY.md) - Test Infrastructure, [01-02](.planning/phases/01-diagnostics/01-02-SUMMARY.md) - Diagnostic Test Files, [01-03](.planning/phases/01-diagnostics/01-03-SUMMARY.md) - NPM Script |
| 2. Local Access | 1/3 | In Progress| [02-01](.planning/phases/02-local-access/02-01-SUMMARY.md) - Local Mode Verification |
| 3. Tunnel Validation | 0/1 | Not started | - |

## Phases

- [x] **Phase 1: Diagnostics** - Build diagnostic tooling to identify connectivity failure point
- [ ] **Phase 2: Local Access** - Enable Claude Code to connect via localhost without OAuth
- [ ] **Phase 3: Tunnel Validation** - Verify existing Claude.ai tunnel access still works

## Phase Details

### Phase 1: Diagnostics

**Goal:** Systematic identification of where local Claude Code connectivity fails

**Depends on:** Nothing (first phase)

**Requirements:** DIAG-01, DIAG-02, DIAG-03, DIAG-04

**Success Criteria** (what must be TRUE):
1. Running `npm run test:diagnostics` produces clear pass/fail results for proxy, process, and network layers
2. Test output explicitly identifies which layer failed (proxy server not listening, MCP process not spawning, or JSON-RPC round-trip failing)
3. Diagnostic tests complete within 60 seconds and can be run repeatedly without manual cleanup
4. Failure output includes next-step suggestions (e.g., "Check if port 3000 is already in use")

**Plans:** 4 plans

| Plan | Wave | Description |
|------|------|-------------|
| [01-00](.planning/phases/01-diagnostics/01-00-PLAN.md) | 1 | Create test stubs with test.skip() placeholders |
| [01-01](.planning/phases/01-diagnostics/01-01-PLAN.md) | 1 | Create test directory structure and shared fixtures |
| [01-02](.planning/phases/01-diagnostics/01-02-PLAN.md) | 2 | Create three diagnostic test files (connectivity, process, JSON-RPC) |
| [01-03](.planning/phases/01-diagnostics/01-03-PLAN.md) | 3 | Add npm script and verify full diagnostic suite |

### Phase 2: Local Access

**Goal:** Claude Code can successfully connect to and use MCP tools via localhost

**Depends on:** Phase 1 (diagnostics identify root cause)

**Requirements:** LOCAL-01, LOCAL-02, LOCAL-03, LOCAL-04, CONFIG-01, CONFIG-02, CONFIG-03

**Success Criteria** (what must be TRUE):
1. Claude Code configured with `http://localhost:3000/sse` can discover available MCP tools
2. Claude Code can successfully call proxied MCP tools and receive responses without OAuth authentication
3. Connection failures (if any) produce error messages that specify the exact issue (CORS, authentication required, process not running)
4. Example config file exists that demonstrates local-only mode without any OAuth configuration

**Plans:** 1/3 plans executed

| Plan | Wave | Description |
|------|------|-------------|
| [02-01](.planning/phases/02-local-access/02-01-PLAN.md) | 1 | Verify local mode works correctly (LOCAL-01, LOCAL-02, LOCAL-03) |
| [02-02](.planning/phases/02-local-access/02-02-PLAN.md) | 1 | Add clear error messages (LOCAL-04) |
| [02-03](.planning/phases/02-local-access/02-03-PLAN.md) | 2 | Create local-only config and documentation (CONFIG-03) |

### Phase 3: Tunnel Validation

**Goal:** Existing Claude.ai access via Cloudflare Tunnel continues to work after local access changes

**Depends on:** Phase 2 (local access changes must not break tunnel)

**Requirements:** TUNNEL-01, TUNNEL-02, TUNNEL-03

**Success Criteria** (what must be TRUE):
1. Claude.ai Connector configured with tunnel URL can successfully authorize via OAuth provider mode
2. Authorized Claude.ai sessions can call MCP tools through the tunnel
3. README clearly documents the differences between local config (no OAuth) and tunnel config (OAuth required)

**Plans:** TBD

---

*Roadmap created: 2026-03-13*
*Last updated: 2026-03-14 (Phase 2 planned - 3 plans)*
