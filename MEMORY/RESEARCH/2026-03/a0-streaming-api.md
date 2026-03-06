# A0 Chat API & Streaming Architecture (2026-03-06)

Source: A0 self-report via `/api_message`

## HTTP Endpoints

### `/api_log_get` (GET/POST) — Our primary endpoint
- **Auth**: `X-API-KEY` header
- **Params**: `context_id` (required), `length` (default 100)
- **Response**: `{ context_id, log: { guid, total_items, returned_items, start_position, progress, progress_active, items: [...] } }`

### `/poll` (POST) — Legacy, CSRF-protected
- **Auth**: Session cookie + CSRF token (NOT usable with API key)
- **Params**: `context`, `log_from`, `notifications_from`, `timezone`
- **Response**: SnapshotV1 with contexts, tasks, logs, notifications, paused state

## WebSocket (Socket.IO) — Web UI Only
- **Endpoint**: `ws://host:port/socket.io/`
- **Auth**: Origin validation (Same-Origin policy) — NOT usable externally
- **Client→Server**: `state_request` { context, log_from, notifications_from, timezone, correlationId }
- **Server→Client**: `state_push` { runtime_epoch, seq, snapshot: SnapshotV1 } — auto-push on changes (~25ms debounce)

## Web UI Update Mechanism
1. Socket.IO connection on page load
2. Sends `state_request` with current context
3. Server auto-sends `state_push` on any change (new messages, progress, paused state)
4. Fallback: HTTP polling via `/poll` if WebSocket unavailable

## Key Files (A0 codebase)
- `/a0/python/api/api_log_get.py` — HTTP log endpoint
- `/a0/python/helpers/state_snapshot.py` — SnapshotV1 schema
- `/a0/python/helpers/state_monitor.py` — Dirty tracking + debounced push
- `/a0/python/websocket_handlers/state_sync_handler.py` — WebSocket handler
- `/a0/webui/js/websocket.js` — Socket.IO client

## Log Item Types
| Type | Heading | Content | Notes |
|------|---------|---------|-------|
| `user` | empty | message text | Ivan's messages |
| `response` | `icon://chat A0: Responding` | actual markdown response | **Show content, not heading** |
| `agent` | `A0: <thought title>` | JSON with thoughts | Reasoning summaries |
| `code_exe` | `icon://terminal <output>` | command + output | Internal tool execution |
| `tool` | `icon://construction A0: Using tool 'X'` | result | Tool usage |
| `util` | description | details | Memorization, solutions found |

## Our TUI Implementation
- **Polling**: `/api_log_get` every 3s with API key
- **Clean mode**: user + response + meaningful agent thoughts
- **Verbose mode**: all event types including code_exe, tool, util
- Socket.IO not available (Same-Origin restriction) — polling is the only option

## Full A0 API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api_log_get` | GET/POST | Chat log |
| `/poll` | POST | State snapshot (CSRF) |
| `/api_message` | POST | Send message (sync) |
| `/message_async` | POST | Send message (CSRF!) |
| `/api_terminate_chat` | POST | Terminate chat |
| `/health` | GET | Health check |
| `/scheduler_tasks_list` | POST | List scheduled tasks |
| `/scheduler_task_create` | POST | Create task |
| `/scheduler_task_run` | POST | Run task |
| `/scheduler_task_delete` | POST | Delete task |
| `/chat_create` | POST | Create chat |
| `/chat_load` | POST | Load chat |
| `/chat_remove` | POST | Remove chat |
| `/chat_reset` | POST | Reset chat |
