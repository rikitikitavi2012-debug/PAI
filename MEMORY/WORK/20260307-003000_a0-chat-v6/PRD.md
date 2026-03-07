---
task: "A0 Chat v6 — fix header duplication, full content, WOW polish"
slug: "20260307-003000_a0-chat-v6"
effort: extended
phase: complete
progress: 18/18
mode: algorithm
started: 2026-03-07T00:30:00+03:00
updated: 2026-03-07T00:30:00+03:00
---

## Context

A0 Chat (a0-chat-tail.sh v5.0) — stream-based TUI for Agent Zero conversations in Kitty terminal. Ivan reports:
1. Header `◆ A0 CHAT ◆` duplicates every ~30s (HINT_CTR resets at 10, poll=3s)
2. Long A0 responses get truncated (content capped at 2000 chars in jq)
3. Progress/spinner lines accumulate as new lines instead of overwriting

Goal: Fix all bugs + polish to WOW level for maximum rating.

### Risks
- `\r` overwrite in stream mode can conflict with new message output
- Kitty scroll buffer may behave differently with `\r` lines
- Content limit increase may cause jq parsing issues with very long responses

## Criteria

- [x] ISC-1: Header prints exactly once per context switch
- [x] ISC-2: No periodic header reprint (HINT_CTR logic removed)
- [x] ISC-3: Status line (latency, msg counts) uses `\r` overwrite — single line
- [x] ISC-4: Status line cleared before printing new messages
- [x] ISC-5: Status line restored after new messages printed
- [x] ISC-6: Progress/thinking indicator inside status line, not new lines
- [x] ISC-7: Content limit increased from 2000 to 8000 chars
- [x] ISC-8: Connection indicator dot — green/yellow/red based on latency
- [x] ISC-9: Header design enhanced with double gradient border
- [x] ISC-10: Spinner frames animate in status line across polls
- [x] ISC-11: All keyboard shortcuts still work (m/n/v/r/h/q/c/l/t)
- [x] ISC-12: `clear_status` called before all interactive actions
- [x] ISC-13: Script passes bash -n syntax check
- [x] ISC-14: Visual verification — header appears once only
- [x] ISC-15: Visual verification — status line overwrites cleanly
- [x] ISC-16: Visual verification — full A0 response visible
- [x] ISC-17: Idle screen shows properly when no context
- [x] ISC-18: Voice notifications still work on new responses

## Decisions

## Verification
