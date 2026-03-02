---
task: "Activate Unified Event System (events.jsonl) — first wave"
slug: "20260302-events-jsonl-activation"
effort: advanced
phase: verify
progress: 8/8
mode: algorithm
started: "2026-03-02T09:30:00-08:00"
updated: "2026-03-02T09:30:00-08:00"
---

## Context

ISC-14 from the PAI deep audit (41/42 pass) identified events.jsonl as documented but not on disk. The Unified Event System is described in PAI/THEHOOKSYSTEM.md (§Unified Event System) with full schema, but the library files `event-types.ts` and `event-emitter.ts` were never created. This task creates them and wires 5 key hooks as the first activation wave.

### Risks
- Hooks must not break if events.jsonl write fails → graceful failure required
- Import paths must match existing hooks/lib/ convention
- additive only — no replacing existing state writes

## Criteria

- [x] ISC-1: hooks/lib/event-types.ts created with BaseEvent + discriminated union for 13 event categories
- [x] ISC-2: hooks/lib/event-emitter.ts created with appendEvent() + getEventsPath() + auto-inject timestamp/session_id
- [x] ISC-3: RatingCapture.hook.ts emits rating.captured on both explicit and implicit paths (3 call sites)
- [x] ISC-4: PRDSync.hook.ts emits prd.synced after work.json sync
- [x] ISC-5: VoiceCompletion.hook.ts emits voice.sent after handler + voice.failed on error
- [x] ISC-6: WorkCompletionLearning.hook.ts emits learning.captured on significant work
- [x] ISC-7: SessionCleanup.hook.ts emits session.completed + work.completed
- [x] ISC-8: All 7 files pass bun build + smoke test creates events.jsonl on disk

## Decisions
- Create all 13 event category types from docs (not just 5 needed now) for completeness
- appendEvent() uses synchronous appendFileSync for simplicity and fire-and-forget semantics
- session_id from CLAUDE_SESSION_ID env var (same pattern as hooks/lib/hook-io.ts)
