---
task: "Hook integration tests — test harness + 5 critical hook tests"
slug: "20260302-hook-tests"
effort: advanced
phase: complete
progress: 8/8
mode: algorithm
started: "2026-03-02T10:30:00-08:00"
updated: "2026-03-02T10:30:00-08:00"
---

## Context

Phase 2 of PAI hardening. 28 hooks, 0 tests. HookHealthCheck verifies syntax/imports but NOT behavior. This creates a test harness for hook subprocess execution and tests the 5 most critical hooks.

## Criteria

- [x] ISC-1: Test harness at hooks/tests/harness.ts — runHook(path, stdin, env) → { stdout, stderr, exitCode }
- [x] ISC-2: ModeClassifier test — greetings → MINIMAL, ratings → MINIMAL, complex tasks → not MINIMAL
- [x] ISC-3: SecurityValidator test — dangerous commands blocked, safe commands allowed
- [x] ISC-4: PreCompact test — writes snapshot file with algorithm + work state
- [x] ISC-5: PostCompactRecovery test — compact source → additionalContext in stdout
- [x] ISC-6: PRDSync test — Write to PRD.md → work.json updated
- [x] ISC-7: All tests pass via `bun test hooks/tests/` (76 pass, 0 fail)
- [x] ISC-8: Tests use temp dirs for side effects (no pollution of real state)
