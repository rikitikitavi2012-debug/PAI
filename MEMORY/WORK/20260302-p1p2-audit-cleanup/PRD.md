---
task: "P1+P2 audit cleanup — stale state, tests, getPaiDir, CONTEXT_ROUTING"
slug: 20260302-p1p2-audit-cleanup
effort: advanced
phase: complete
progress: 32/32
mode: algorithm
started: 2026-03-02T21:30:00Z
updated: 2026-03-02T22:00:00Z
---

## Context

Продолжение аудита PAI от 2 марта. P1 — очистка stale state. P2 — усиления: тесты, стандартизация путей, CONTEXT_ROUTING, SubagentStop hook.

### Risks
- getPaiDir() миграция может сломать хуки если import path неверный → RESOLVED: все 76 тестов pass
- Новые тесты могут не проходить из-за зависимостей от файловой системы → RESOLVED: 15/15 new tests pass

## Criteria

### P1: Stale State Cleanup
- [x] ISC-1: 20260226-002028 META.yaml status = COMPLETED
- [x] ISC-2: 20260227-131737 META.yaml status = COMPLETED
- [x] ISC-3: current-work-ad079287 file deleted from STATE/
- [x] ISC-4: MEMORY.md events count updated to 121+ (verified)
- [x] ISC-5: MEMORY.md hook count 29 documented

### P2.4: SubagentStop Hook
- [x] ISC-6: SubagentStop hook design decision documented in PRD

### P2.5: CONTEXT_ROUTING Cleanup (9 missing paths)
- [x] ISC-7: PAI/BROWSERAUTOMATION.md reference removed
- [x] ISC-8: PAI/USER/WRITINGSTYLE.md reference removed
- [x] ISC-9: PAI/USER/RHETORICALSTYLE.md reference removed
- [x] ISC-10: PAI/USER/TELOS/AUTHORS.md reference removed
- [x] ISC-11: PAI/USER/DAWRITINGSTYLE.md reference removed
- [x] ISC-12: PAI/USER/OUR_STORY.md reference removed
- [x] ISC-13: PAI/USER/FEED.md reference removed
- [x] ISC-14: PAI/USER/HEALTH/ reference removed
- [x] ISC-15: PAI/USER/FINANCES/ reference removed

### P2.6: Test Coverage (+3 hooks)
- [x] ISC-16: SkillGuard.test.ts created
- [x] ISC-17: SkillGuard.test.ts passing (6/6)
- [x] ISC-18: VoiceCompletion.test.ts created
- [x] ISC-19: VoiceCompletion.test.ts passing (4/4)
- [x] ISC-20: WorktreeCreate.test.ts created
- [x] ISC-21: WorktreeCreate.test.ts passing (5/5)

### P2.7: getPaiDir() Standardization
- [x] ISC-22: AutoWorkCreation.hook.ts uses getPaiDir()
- [x] ISC-23: AlgorithmTracker.hook.ts uses getPaiDir()
- [x] ISC-24: WisdomSync.hook.ts uses getPaiDir()
- [x] ISC-25: WorkCompletionLearning.hook.ts uses getPaiDir()
- [x] ISC-26: PreCompact.hook.ts uses getPaiDir()
- [x] ISC-27: LastResponseCache.hook.ts uses getPaiDir()
- [x] ISC-28: RatingCapture.hook.ts uses getPaiDir()
- [x] ISC-29: PostCompactRecovery.hook.ts uses getPaiDir()
- [x] ISC-30: SessionCleanup.hook.ts uses getPaiDir()
- [x] ISC-31: lib/event-emitter.ts uses getPaiDir()
- [x] ISC-32: lib/algorithm-state.ts uses getPaiDir()

### Anti-criteria
- [x] ISC-A1: 76/76 hook tests pass (was 61, now 76 with 15 new)

## Decisions

- ISC-6: SubagentStop hook NOT created. No separate event in Claude Code API. Stop event already fires for subagents (CLAUDE_CODE_AGENT_TASK_ID set). AlgorithmTracker tracks spawns. Duration/token metrics unavailable via hook API.
- ISC-7..15: All 9 broken CONTEXT_ROUTING references REMOVED (not replaced with placeholders). These are USER-specific content files (styles, health, finances) that should be added to routing when the content is actually created.
- getPaiDir migration: harness.ts and notifications.ts intentionally excluded (test infra / already separately handled).

## Verification

- P1: `grep status META.yaml` → COMPLETED for both dirs. `ls current-work-ad079287*` → not found. MEMORY.md verified.
- P2.5: All 35 remaining CONTEXT_ROUTING paths verified ✅ — zero broken.
- P2.6: `bun test hooks/tests/SkillGuard.test.ts` → 6/6, `VoiceCompletion.test.ts` → 4/4, `WorktreeCreate.test.ts` → 5/5.
- P2.7: `grep 'process.env.PAI_DIR ||'` in all 11 migrated files → zero matches.
- ISC-A1: `bun test hooks/tests/` → 76/76 pass, 0 fail.
