---
task: "Add EventLogger test suite to hooks/tests"
slug: 20260302-234000_eventlogger-tests
effort: standard
phase: complete
progress: 8/8
mode: interactive
started: 2026-03-02T23:40:00Z
updated: 2026-03-02T23:40:00Z
---

## Context

EventLogger.hook.ts consolidates 3 pure-logger hooks (SubagentStart, SubagentStop, TaskCompleted) with a routing table. Currently has 0 tests despite being part of the data pipeline. Adding tests to ensure routing, truncation, and fallback behavior are verified.

## Criteria

- [x] ISC-1: Test SubagentStart handler emits agent.start event
- [x] ISC-2: Test SubagentStop handler emits agent.stop event
- [x] ISC-3: Test TaskCompleted handler emits task.completed event
- [x] ISC-4: Test unknown event falls back to custom.unknown
- [x] ISC-5: Test empty stdin exits gracefully with code 0
- [x] ISC-6: Test description truncation at 100 chars
- [x] ISC-7: Test last_message_preview truncation at 200 chars
- [x] ISC-8: Test performance under 500ms

## Decisions

## Verification
