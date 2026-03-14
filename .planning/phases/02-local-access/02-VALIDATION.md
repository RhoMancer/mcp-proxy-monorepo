---
phase: 02
slug: local-access
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-03-14
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | mocha 10.x |
| **Config file** | `.mocharc.yml` |
| **Quick run command** | `npm test -- test/diagnostics/*.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- test/diagnostics/*.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | LOCAL-01 | integration | `npm test -- test/diagnostics/proxy-connectivity.test.js` | ✅ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | LOCAL-02 | integration | `npm test -- test/diagnostics/jsonrpc-roundtrip.test.js` | ✅ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | LOCAL-03 | integration | `npm test -- test/diagnostics/process-lifecycle.test.js` | ✅ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | CONFIG-01 | inspection | `grep -A 5 "function.*noAuthMiddleware\|protectedMiddleware.*=>" packages/mcp-http-proxy/src/ProxyServer.js` | ✅ W0 | ⬜ pending |
| 02-01-05 | 01 | 1 | CONFIG-02 | inspection | `grep "Access-Control-Allow-Origin" packages/mcp-http-proxy/src/ProxyServer.js` | ✅ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | LOCAL-04 | unit | `npm test -- test/diagnostics/proxy-connectivity.test.js` | ✅ W0 | ⬜ pending |
| 02-03-01 | 03 | 1 | CONFIG-03 | e2e | Manual verification of example config | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `test/diagnostics/proxy-connectivity.test.js` — LOCAL-01, LOCAL-04 coverage exists
- [x] `test/diagnostics/jsonrpc-roundtrip.test.js` — LOCAL-02 coverage exists
- [x] `test/diagnostics/process-lifecycle.test.js` — LOCAL-03 coverage exists
- [x] `packages/mcp-http-proxy/src/ProxyServer.js` — CONFIG-01, CONFIG-02 implementation exists
- [x] `npm test` — Framework installed and functional

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Example config demonstrates local-only mode | CONFIG-03 | Requires human verification of clarity | 1. Review `examples/local-only.config.js` 2. Verify no auth/OAuth keys present 3. Confirm comments explain local-only usage |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
