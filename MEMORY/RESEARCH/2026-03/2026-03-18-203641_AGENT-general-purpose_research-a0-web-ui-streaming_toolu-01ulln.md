# Research A0 web UI streaming

**Agent:** general-purpose
**Captured:** 2026-03-18T20:36:41+03:00
**Tool Use ID:** toolu_01ULLntqX3dHDr9WThCo5eyE
**Tokens:** 82216
**Duration:** 362s
**Source:** PostToolUse hook capture

---

I now have the full picture. Let me compile this into a comprehensive research report.

```
════ PAI | NATIVE MODE ═══════════════════════
```

Here is the complete A0 streaming architecture analysis:

---

## A0 Streaming Protocol: Architecture Overview

### Transport: WebSocket (Socket.IO) + HTTP Poll Fallback

A0 does **NOT** use SSE. It uses **Socket.IO WebSockets** as the primary transport with **HTTP polling** as a fallback. The protocol is a **push-based state synchronization** system.

### Protocol Flow

**1. WebSocket Handshake (`state_request` event)**

The frontend sends a `state_request` event via Socket.IO to the `/state_sync` namespace:

```json
{
  "context": "abc123",
  "log_from": 0,
  "notifications_from": 0,
  "timezone": "America/New_York"
}
```

The backend (`/a0/python/websocket_handlers/state_sync_handler.py`) registers the sid, assigns a `seq_base`, and immediately marks dirty to trigger the first snapshot push.

**2. Server Push (`state_push` event)**

The `StateMonitor` (`/a0/python/helpers/state_monitor.py`) debounces at **25ms** and emits `state_push` events to the relevant sids:

```json
{
  "runtime_epoch": "uuid-string",
  "seq": 2,
  "snapshot": { /* SnapshotV1 */ }
}
```

**3. Snapshot Payload (SnapshotV1)**

Built by `/a0/python/helpers/state_snapshot.py`, the snapshot contains:

```python
{
    "deselect_chat": false,
    "context": "abc123",
    "contexts": [...],        # list of all chat contexts
    "tasks": [...],           # scheduled/planned tasks
    "logs": [...],            # INCREMENTAL log items (from log_from)
    "log_guid": "uuid",       # changes on chat reset
    "log_version": 42,        # cursor for incremental fetching
    "log_progress": "A0: Thinking... ||||",  # current status text
    "log_progress_active": true,              # is agent still working?
    "paused": false,
    "notifications": [...],
    "notifications_guid": "...",
    "notifications_version": 5
}
```

### Log Item Format

Each log item (`/a0/python/helpers/log.py`) has this shape:

```python
{
    "no": 0,                # sequential number
    "id": "optional-guid",  # for matching frontend-created user messages
    "type": "agent",        # see types below
    "heading": "A0: Thinking... ||||",
    "content": "full response text so far",
    "kvps": {               # key-value pairs (type-dependent)
        "thoughts": "...",
        "reasoning": "...",
        "step": "Writing Python code... (234)",
        "tool_name": "code_execution_tool",
        "tool_args": { "runtime": "python", "code": "..." },
        "headline": "Analyzing the problem",
        "finished": true,
    },
    "timestamp": 1710000000.0,
    "agentno": 0            # 0=main agent, 1+=subagents
}
```

### Log Types (13 types)

Defined in `/a0/python/helpers/log.py`:

| Type | Purpose |
|------|---------|
| `agent` | LLM streaming output (thinking, tool calls, headlines) |
| `response` | Final response text to user |
| `tool` | Tool execution results |
| `code_exe` | Code execution output |
| `browser` | Browser automation results |
| `mcp` | MCP server interactions |
| `subagent` | Sub-agent delegated work |
| `user` | User input messages |
| `error` | Error messages |
| `warning` | Warning messages |
| `info` | Informational messages |
| `progress` | Progress updates |
| `hint` | System hints |
| `util` | Utility messages |

### Streaming Update Mechanism

Log items are **mutable** -- the same log item gets updated in place during streaming:

1. **`before_main_llm_call`** extension creates a `log_item_generating` with type `agent` and heading "Calling LLM..."
2. **`response_stream`** extension updates that same log item as tokens arrive:
   - Heading changes: "Thinking... |", "Thinking... ||", "Thinking... |||" (length indicates progress)
   - `kvps` populated with: `thoughts`, `tool_name`, `tool_args`, `step`, `headline`
   - `content` appended with full streamed text
3. **`reasoning_stream`** extension updates with reasoning tokens: heading "Reasoning... |||", kvps.reasoning
4. When a `response` tool is called, a **separate** `log_item_response` is created with type `response` and the final answer text
5. **`log_progress_active: false`** signals agent completion

### Dirty/Push Cycle

- Every `LogItem.update()` calls `mark_dirty_for_context(context_id)` on the `StateMonitor`
- StateMonitor debounces per-sid (25ms default), then builds a snapshot and emits via Socket.IO
- Sequence numbers enforce ordering; gaps trigger full resync
- Runtime epoch changes trigger full resync (server restart detection)

### How the Web UI Renders

`/a0/webui/js/messages.js` dispatches by log type to handler functions:
- `drawMessageAgent` -- renders thinking/tool steps as collapsible "process steps" in a process group
- `drawMessageResponse` -- renders final response with markdown
- `drawMessageUser` -- renders user messages on the right side
- Process steps auto-collapse previous ones after 2-4 seconds

### Current Telegram Bot: HTTP Poll (Degraded)

The existing Telegram bot (`/a0/telegram_bot/message_handler.py`) uses **HTTP polling** at 2-second intervals:
- Calls `POST /poll` with `context_id` and `log_from`
- Checks `log_progress_active` to detect completion
- Shows `log_progress` as a single editable status message
- Extracts final `response` type log entry as the answer
- No streaming of intermediate steps -- just a progress bar and final response

### What the Telegram Bot Should Replicate

To match the web UI experience, the Telegram bot should:

1. **Use Socket.IO WebSocket** instead of HTTP polling (the `/state_sync` namespace) -- or keep polling but at shorter intervals (250ms like the degraded fallback)
2. **Stream intermediate steps** by editing a message with the current `heading` from `agent` type logs (shows "Thinking...", "Using code_execution_tool...", etc.)
3. **Show reasoning/thinking** by updating a status message with the `kvps.step` field
4. **Stream the response** progressively by editing a message as `response` type log items are updated (content grows as tokens arrive)
5. **Detect completion** via `log_progress_active: false`
6. **Handle subagents** (agentno > 0) -- show which subagent is working

Key files:
- `/a0/python/helpers/log.py` -- LogItem class, types, output format
- `/a0/python/helpers/state_snapshot.py` -- SnapshotV1 schema, `build_snapshot_from_request()`
- `/a0/python/helpers/state_monitor.py` -- StateMonitor push system
- `/a0/python/websocket_handlers/state_sync_handler.py` -- WebSocket handshake handler
- `/a0/python/api/poll.py` -- HTTP poll endpoint (current bot uses this)
- `/a0/python/extensions/response_stream/_10_log_from_stream.py` -- how agent output streams into logs
- `/a0/python/extensions/response_stream/_20_live_response.py` -- how final response streams
- `/a0/python/extensions/reasoning_stream/_10_log_from_stream.py` -- reasoning token streaming
- `/a0/telegram_bot/api_client.py` -- existing bot API client (HTTP only, needs WebSocket)
- `/a0/telegram_bot/message_handler.py` -- existing bot message handler (poll at 2s)
- `/a0/webui/components/sync/sync-store.js` -- frontend WebSocket sync store
- `/a0/webui/js/messages.js` -- frontend log rendering logic