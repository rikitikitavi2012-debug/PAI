---
capture_type: FAILURE_ANALYSIS
timestamp: 2026-03-16 15:03:48 PST
rating: 3
description: assistant-suggested-config-with-unrecognized-sseurl-key
session_id: ecf8e0b3-6eba-4bc2-bf6b-2bddb5c807e6
---

# Failure Analysis: assistant suggested config with unrecognized sseurl key

**Date:** 2026-03-16
**Rating:** 3/10
**Summary:** Configuration error after Navi's changes broke bridge setup

---

## What Happened

Ivan was attempting to diagnose and fix the MCP bridge connection (which should show 🟢 but was showing 🔴). He followed a logical troubleshooting sequence: exit Gemini, restart it, check MCP status. After restarting, Gemini revealed a critical configuration error introduced by Navi's code changes — specifically, the bridge server configuration now contains an unrecognized key 'sseUrl' that doesn't match the current MCP specification. This is a direct consequence of Navi switching the backend from Bun.serve to node:http without properly updating the configuration schema. Ivan's implicit frustration stems from: (1) the configuration being broken after Navi's modification, (2) having to debug this mid-workflow, (3) the error message indicating Navi's approach doesn't align with gemini-cli's expected configuration structure. This is a 3 rather than 2 because it's a fixable configuration issue, not a complete system failure, but it required rework after Navi's implementation.

---

## Conversation Summary

**USER:** Configured MCP servers:

🔴 bridge - Disconnected

🟢 julesServer (from gemini-cli-jules) - Ready (1 tool)
  Tools:
  - mcp_julesServer_start_new_jules_task

**USER:** {
  "mcpServers": {
    "bridge": {
      "url": "http://localhost:3847/sse",
      "type": "sse",
      "trust": true,
      "headers": {
        "X-Agent-ID": "gemini"
      }
    }
  }
}

=== Test SSE endpoint ===
(timeout or error)

=== Server running? ===
SERVER DOWN

**ASSISTANT:** Сервер упал после переделки! Navi-кодер сменил с Bun.serve на node:http — возможно не перезапустил.

**USER:** 1059348
===
No server process
===
Started server PID: 1173484
{"status":"ok","server":"workspace-bridge","version":"1.0.0","timestamp":1773698389038,"active_sessions":0,"state":{"messages":{},"claims":{},"context":{},"roster":{},"history_count":0}} — SERVER OK

**USER:** Exit code 28
event: endpoint
data: /messages?sessionId=2e92f139-b8cc-41df-9811-864c3c130c67

**ASSISTANT:** SSE работает — возвращает `event: endpoint` с sessionId. Сервер просто был не запущен.

Теперь перезапусти Gemini в Таб 2:

1. `/exit`
2. `gemini`
3. `/mcp`

Сервер работает, SSE endpoint отвечает. Должно подключиться.

**USER:** Configured MCP servers:

🔴 bridge - Disconnected

🟢 julesServer (from gemini-cli-jules) - Ready (1 tool)
  Tools:
  - mcp_julesServer_start_new_jules_task

**USER:** [bridge] MCP Bridge Server running on http://localhost:3847
[bridge] Endpoints:
  POST /mcp       → Streamable HTTP (Claude Code, OpenCode)
  GET  /sse       → SSE stream (Gemini CLI)
  POST /messages  → SSE messages (Gemini CLI)
  GET  /status    → Monitor JSON
[bridge] Tools (9): bridge_send, bridge_read, bridge_claim, bridge_release, bridge_context_write, bridge_context_read, bridge_roster, bridge_status, bridge_history

=== Check if Gemini even tries to connect ===
Let me check if there are ...

**USER:** Trying sseUrl key
{
  "mcpServers": {
    "bridge": {
      "sseUrl": "http://localhost:3847/sse",
      "trust": true
    }
  }
}
Shell cwd was reset to /home/ser/.claude

**ASSISTANT:** Попробуй перезапустить Gemini и проверь `/mcp`. Если опять красный — попробуем другой подход: добавить через команду `gemini mcp add` с правильными параметрами прямо из таба Gemini.

---

## Tool Calls (220 total)

- **Bash**: {"command":"# Test with correct Accept header\ncurl -sf -X POST http://localhost:3847/mcp \\\n  -H \"Content-Type: application/json\" \\\n  -H \"Accept: application/json, text/event-stream\" \\\n  -H ...
- **Bash**: {"command":"# Try configuring Gemini with SSE transport instead of HTTP\ncd /home/ser/projects/prorabskaya\n\ncat > .gemini/settings.json << 'EOF'\n{\n  \"mcpServers\": {\n    \"bridge\": {\n      \"u...
- **Bash**: {"command":"# The problem might be that our server only has /mcp endpoint for Streamable HTTP\n# SSE transport expects GET /sse for event stream + POST /messages for sending\n# Let's check what Gemini...
- **Bash**: {"command":"# The issue is likely that SSE transport expects a GET endpoint that returns SSE stream\n# Our server only handles POST on /mcp\n# Let's check what the server returns on GET /mcp\n\ncurl -...
- **Bash**: {"command":"# The server needs to support legacy SSE transport for Gemini\n# SSE expects: GET /sse → SSE event stream, POST /messages → send messages\n# Our Streamable HTTP only handles POST /mcp\n# \...
- **Bash**: {"command":"# Check what config Gemini is reading\ncat /home/ser/projects/prorabskaya/.gemini/settings.json\n\necho -e \"\\n=== Test SSE endpoint ===\"\ncurl -sf http://localhost:3847/sse -H \"Accept:...
- **Bash**: {"command":"# Check if old PID is stale\ncat /tmp/bridge-server.pid 2>/dev/null\necho \"===\"\nps aux | grep \"bridge/server\" | grep -v grep || echo \"No server process\"\necho \"===\"\n# Try restart...
- **Bash**: {"command":"# Now test SSE endpoint\ncurl -sf http://localhost:3847/sse -H \"Accept: text/event-stream\" -H \"X-Agent-ID: gemini-test\" --max-time 3 2>&1","description":"Test SSE endpoint after restar...
- **Bash**: {"command":"# Check server logs for Gemini connection attempts\ntail -20 /tmp/bridge-server.log 2>/dev/null\n\necho -e \"\\n=== Check if Gemini even tries to connect ===\"\n# Run server with verbose l...
- **Bash**: {"command":"# Maybe Gemini uses 'sseUrl' instead of 'url' for SSE type\n# Or maybe the config format is different\n# Let me check Gemini's actual SSE client code behavior\n\n# Try different config key...

---

## Files in This Capture

| File | Description |
|------|-------------|
| `CONTEXT.md` | This analysis document |
| `transcript.jsonl` | Full raw conversation (1809 entries) |
| `sentiment.json` | Sentiment analysis metadata |
| `tool-calls.json` | Extracted tool invocations (220 calls) |

---

## Behavioral Rules

**AVOID:** Suggesting configuration keys without verifying they exist in current MCP specification or have been tested.
**INSTEAD:** Check MCP server documentation or test config locally before recommending non-standard keys like sseUrl.

---

## Learning System Notes

This failure has been captured for retroactive analysis. Behavioral rules above are auto-injected into future sessions via LoadContext → loadFailurePatterns().
