---
name: MCP Transport Types and Multi-Client Architecture
description: MCP transport types (stdio, SSE, Streamable HTTP), per-CLI support matrix (Claude Code, Gemini CLI, OpenCode), shared server architecture via mcp-proxy
type: reference
---

## MCP Transport Types (spec 2025-11-25)

1. **stdio** — client launches server as subprocess, JSON-RPC over stdin/stdout. One client = one process = no shared state.
2. **Streamable HTTP** — server is standalone HTTP process, multiple clients connect via URL. Supports session management, resumability, SSE streaming.
3. **SSE (deprecated)** — replaced by Streamable HTTP as of spec 2025-03-26.

## Per-CLI Support Matrix

| Transport | Claude Code | Gemini CLI | OpenCode |
|-----------|-------------|------------|----------|
| stdio | YES (`--transport stdio`) | YES (`command` config) | YES (`"type": "local"`) |
| SSE | YES (`--transport sse`) — deprecated | YES (`--transport sse`) | YES (`"type": "remote"`, auto-negotiate) |
| Streamable HTTP | YES (`--transport http`) | YES (`--transport http`) | YES (auto-negotiate, issue #8058 resolved) |

**All three CLIs support all three transports.**

## Shared Server Architecture

**Problem**: stdio = per-client subprocess = no shared state.
**Solution**: Use Streamable HTTP — one server process, multiple clients connect via URL.

**Proxy options for stdio-only servers**:
- `mcp-proxy` (TypeScript, punkpeye/mcp-proxy) — bridges stdio to HTTP/SSE endpoints
- `mcp-proxy` (Python, sparfenyuk/mcp-proxy) — same concept, Python implementation
- Both create per-session server instances by default (not truly shared state)

**Why:** This informs the PAI multi-agent architecture — whether Claude Code, Gemini CLI, and OpenCode can share one MCP server.
**How to apply:** Use Streamable HTTP transport when shared state is needed. For custom MCP servers, build them as HTTP servers from the start.
