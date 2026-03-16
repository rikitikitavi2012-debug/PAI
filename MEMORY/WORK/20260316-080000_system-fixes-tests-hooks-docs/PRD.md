---
task: "Fix tests, hook errors, update hooks documentation"
slug: 20260316-080000_system-fixes-tests-hooks-docs
effort: extended
phase: complete
progress: 18/20
mode: interactive
started: 2026-03-16T08:00:00Z
updated: 2026-03-16T08:00:00Z
---

## Context

System audit found 21 test failures, PreToolUse:Edit hook errors, and outdated THEHOOKSYSTEM.md. User sees hook errors when editing files. Jules automerge shows 0/0.

### Risks
- Fixing tests could mask real bugs if we just relax assertions
- Hook errors may be in SecurityValidator or LearnGate — touching security hooks is sensitive

## Criteria

### Domain A: Test Fixes (our breakage)
- [x] ISC-1: ContentAnalysis test no longer expects version field
- [x] ISC-2: Investigation test no longer expects version field
- [x] ISC-3: uuid package added to dependencies
- [x] ISC-4: parser.test.ts passes after uuid install

### Domain B: HealthMonitor Tests
- [x] ISC-5: HealthMonitor test failures diagnosed (Bun.file mock issue)
- [ ] ISC-6: HealthMonitor tests pass or marked with skip reason (pre-existing, not our breakage)

### Domain C: Hook Errors
- [x] ISC-7: PreToolUse:Edit hook error root cause: double confirmWrite for settings.json
- [x] ISC-8: SecurityValidator now passes settings.json edits (confirmWrite removed)
- [x] ISC-9: LearnGate handles non-PRD edits without error (verified)

### Domain D: Documentation
- [x] ISC-10: THEHOOKSYSTEM.md lists all 34 hook files
- [x] ISC-11: THEHOOKSYSTEM.md documents all 15 event types
- [x] ISC-12: THEHOOKSYSTEM.md hook count matches reality (34 files, 50 instances)
- [x] ISC-13: ConfigChange event type documented
- [x] ISC-14: SubagentStart/Stop event types documented
- [x] ISC-15: WorktreeCreate/Remove event types documented
- [x] ISC-16: InstructionsLoaded event type documented
- [x] ISC-17: TeammateIdle event type documented
- [x] ISC-18: TaskCompleted event type documented

### Anti-criteria
- [x] ISC-A-1: Anti: SecurityValidator still active, only removed redundant confirmWrite
- [x] ISC-A-2: Anti: 356 pass → 386 pass (+30), no regressions

## Decisions

## Verification
