# Requirements: MCP HTTP Proxy - Multi-Context Access Fix

**Defined:** 2026-03-13
**Core Value:** MCP services accessible via HTTP in any context — local development, cloud IDEs, or web platforms

## v1 Requirements

Requirements for initial fix. Each maps to roadmap phases.

### Diagnostics

- [x] **DIAG-01**: Automated test script verifies proxy is accepting connections on configured port
- [x] **DIAG-02**: Automated test script verifies MCP server process spawns successfully
- [x] **DIAG-03**: Automated test script verifies JSON-RPC request/response round-trip works
- [x] **DIAG-04**: Diagnostic output clearly identifies failure point (proxy, MCP process, or network)

### Local Claude Code Connectivity

- [ ] **LOCAL-01**: Claude Code can connect to proxy running on localhost without authentication
- [ ] **LOCAL-02**: Proxy responds to MCP server list requests from Claude Code
- [ ] **LOCAL-03**: Claude Code can successfully call MCP tools through the proxy
- [x] **LOCAL-04**: Connection failures produce clear, actionable error messages

### Configuration

- [ ] **CONFIG-01**: Proxy can run in "local mode" without OAuth requirements
- [ ] **CONFIG-02**: CORS settings allow localhost connections
- [x] **CONFIG-03**: Example config provided for Claude Code local development

### Claude.ai Tunneling

- [x] **TUNNEL-01**: Existing Cloudflare Tunnel setup continues to work
- [x] **TUNNEL-02**: OAuth provider mode works for external Claude.ai access
- [ ] **TUNNEL-03**: Documentation clarifies tunnel vs local access differences

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Diagnostics

- **DIAG-10**: Health check endpoint that verifies MCP process responsiveness
- **DIAG-11**: Request/response logging toggle for debugging
- **DIAG-12**: Connection attempt audit trail

### Multi-Server Support

- **MULTI-01**: Proxy multiple MCP servers simultaneously on different paths
- **MULTI-02**: Dynamic server registration without restart

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| WebSocket transport | MCP uses JSON-RPC over HTTP, not WebSocket |
| Browser-based access | Target is Claude applications, not general web browsers |
| Load balancing | Single-instance design for v1 |
| MCP server implementation | Proxy only bridges existing stdio servers |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DIAG-01 | Phase 1 | Complete (01-02) |
| DIAG-02 | Phase 1 | Complete (01-02) |
| DIAG-03 | Phase 1 | Complete (01-02) |
| DIAG-04 | Phase 1 | Complete (01-03) |
| LOCAL-01 | Phase 2 | Pending |
| LOCAL-02 | Phase 2 | Pending |
| LOCAL-03 | Phase 2 | Pending |
| LOCAL-04 | Phase 2 | Complete |
| CONFIG-01 | Phase 2 | Pending |
| CONFIG-02 | Phase 2 | Pending |
| CONFIG-03 | Phase 2 | Complete |
| TUNNEL-01 | Phase 3 | Complete |
| TUNNEL-02 | Phase 3 | Complete |
| TUNNEL-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-03-13*
*Last updated: 2026-03-14 after Plan 01-02 completion*
