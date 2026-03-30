---
task: "PAI hook performance optimization — reduce critical path latency"
slug: "20260329-hook-performance-optimization"
effort: extended
phase: execute
progress: 0/8
mode: algorithm
trust_level: L2
execute_mode: autoresearch
iteration_cap: 50
started: 2026-03-29T22:00:00+03:00
updated: 2026-03-29T22:00:00+03:00
---

## Context

Hook performance directly impacts user experience. The critical path (UserPromptSubmit) currently adds ~1.7s latency before AI sees the prompt. PreToolUse blocking hooks add ~200ms per tool call.

### Baseline Measurements (2026-03-29)

**Critical Path — UserPromptSubmit:**
- UpdateTabTitle: 894ms (was 10006ms timeout on 2026-03-03 — FIXED)
- RatingCapture: 667ms
- SessionAutoName: 87ms
- AutoWorkCreation: 56ms
- ModeClassifier: 43ms
- **TOTAL: 1747ms**

**PreToolUse Blocking:**
- SetQuestionTab: 192ms
- AgentExecutionGuard: 80ms
- SecurityValidator (Write): 74ms
- SecurityValidator (Bash): 69ms
- SecurityValidator (Read): 67ms
- SkillGuard: 58ms

**Slowest Non-Critical:**
- LoadContext (SessionStart): 14667ms — outlier, but only runs once at session start

### Problem

1. UserPromptSubmit path too slow (1.7s) — user waits before AI processes
2. Blocking PreToolUse hooks add latency to every tool call
3. RatingCapture (667ms) and UpdateTabTitle (894ms) are the worst offenders

### Risks

- Aggressive optimization could break hook functionality
- Fire-and-forget patterns could lose important data
- Caching could cause stale state issues

## Criteria

- [ ] ISC-1 [Q]: UserPromptSubmit total latency < 1000ms
  metric: ups_latency_ms || cmd: bun /home/ser/.claude/PAI/Tools/HookBenchmark.ts --average || baseline: 1654 || target: 1000 || direction: lower
- [ ] ISC-2 [Q]: Blocking PreToolUse max latency < 100ms
  metric: ptu_max_ms || cmd: bun /home/ser/.claude/PAI/Tools/HookBenchmark.ts --average --metric ptu_max || baseline: 68.6 || target: 50 || direction: lower
- [x] ISC-3 [B-fast]: All hooks return valid JSON ({"continue":true} or block)
- [x] ISC-4 [B-fast]: settings.json remains valid JSON
- [ ] ISC-5 [B-slow]: No test regressions (bun test hooks/tests/)
- [ ] ISC-6 [B-fast]: ModeClassifier still classifies correctly (regex test)
- [ ] ISC-7 [B-fast]: SecurityValidator still blocks dangerous commands
- [ ] ISC-8 [B-fast]: Voice server still works (localhost:8888)
- [ ] ISC-A1: No hooks silently fail — must return valid JSON or exit with error

## Decisions

## Verification
