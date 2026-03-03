# PAI Hook Performance Baseline

**Date**: 2026-03-03
**Bun version**: 1.2.x
**Method**: 3 runs per hook, median latency, cold-start (no warmup)
**Benchmark script**: `/home/ser/.claude/hooks/tests/benchmark-hooks.ts`

## Results (sorted by median latency, descending)

| # | Hook | Event | Matcher | Blocking | Median (ms) | Min (ms) | Max (ms) | Status |
|---|------|-------|---------|----------|-------------|----------|----------|--------|
| 1 | UpdateTabTitle | UserPromptSubmit | - | no | 10006 | 8844 | 10007 | TIMEOUT |
| 2 | StartupGreeting | SessionStart | - | no | 699 | 692 | 803 | OK |
| 3 | ResponseTabReset | Stop | - | no | 397 | 391 | 399 | OK |
| 4 | SecurityValidator (Read) | PreToolUse | Read | **YES** | 317 | 288 | 326 | OK |
| 5 | SecurityValidator (Write) | PreToolUse | Write | **YES** | 282 | 273 | 297 | OK |
| 6 | SecurityValidator (Bash) | PreToolUse | Bash | **YES** | 282 | 279 | 292 | OK |
| 7 | UpdateCounts | SessionEnd | - | no | 262 | 116 | 283 | OK |
| 8 | AlgorithmTracker | PostToolUse | Bash | no | 260 | 242 | 266 | OK |
| 9 | SetQuestionTab | PreToolUse | AskUserQuestion | **YES** | 259 | 246 | 284 | OK |
| 10 | QuestionAnswered | PostToolUse | AskUserQuestion | no | 240 | 232 | 249 | OK |
| 11 | DocIntegrity | Stop | - | no | 238 | 233 | 238 | OK |
| 12 | VoiceCompletion | Stop | - | no | 224 | 222 | 230 | OK |
| 13 | SessionCleanup | SessionEnd | - | no | 212 | 197 | 212 | OK |
| 14 | LastResponseCache | Stop | - | no | 208 | 195 | 212 | OK |
| 15 | LoadContext | SessionStart | - | no | 100 | 85 | 106 | OK |
| 16 | WorkCompletionLearning | SessionEnd | - | no | 80 | 63 | 82 | OK |
| 17 | RelationshipMemory | Stop | - | no | 72 | 58 | 73 | OK |
| 18 | RatingCapture | UserPromptSubmit | - | **YES** | 70 | 67 | 71 | OK |
| 19 | IntegrityCheck | SessionEnd | - | no | 66 | 65 | 75 | OK |
| 20 | SessionAutoName | UserPromptSubmit | - | no | 62 | 58 | 89 | OK |
| 21 | EventLogger (SubagentStop) | SubagentStop | - | no | 60 | 49 | 64 | OK |
| 22 | EventLogger (SubagentStart) | SubagentStart | - | no | 56 | 55 | 56 | OK |
| 23 | KittyEnvPersist | SessionStart | - | no | 54 | 50 | 58 | OK |
| 24 | AutoWorkCreation | UserPromptSubmit | - | **YES** | 53 | 48 | 66 | OK |
| 25 | EventLogger (TaskCompleted) | TaskCompleted | - | no | 49 | 47 | 49 | OK |
| 26 | SkillGuard | PreToolUse | Skill | **YES** | 47 | 43 | 61 | OK |
| 27 | PreCompact | PreCompact | - | no | 45 | 40 | 46 | OK |
| 28 | WisdomSync | SessionEnd | - | no | 44 | 42 | 63 | OK |
| 29 | AgentExecutionGuard | PreToolUse | Task | **YES** | 42 | 42 | 48 | OK |
| 30 | PRDSync (Write) | PostToolUse | Write | no | 42 | 40 | 45 | OK |
| 31 | BuildCLAUDE | SessionStart | - | no | 38 | 33 | 39 | OK |
| 32 | PostCompactRecovery | SessionStart | compact | no | 36 | 36 | 40 | OK |
| 33 | ModeClassifier | UserPromptSubmit | - | **YES** | 21 | 20 | 24 | OK |

## Per-Event Aggregate Latency

| Event | Hook Count | Total (ms) | Blocking (ms) | Slowest Hook | Impact |
|-------|-----------|------------|---------------|--------------|--------|
| **UserPromptSubmit** | 5 | **10,253** | 144 | UpdateTabTitle (10006!) | CRITICAL |
| **Stop** | 5 | 1,139 | 0 | ResponseTabReset (397) | MEDIUM |
| **SessionStart** | 5 | 928 | 0 | StartupGreeting (699) | LOW (once) |
| **SessionEnd** | 5 | 664 | 0 | UpdateCounts (262) | LOW (once) |
| **PreToolUse** | 6 | 931 (all) | ~282 per Bash/Write/Read | SecurityValidator | HIGH |
| **PostToolUse** | 3 | 542 | 0 | AlgorithmTracker (260) | MEDIUM |

## Critical Path Analysis

### UserPromptSubmit (fires on EVERY user message)

```
ModeClassifier         21ms  (cumulative:  21ms) - BLOCKING
AutoWorkCreation       53ms  (cumulative:  74ms) - BLOCKING
RatingCapture          70ms  (cumulative: 144ms) - BLOCKING
SessionAutoName        62ms  (cumulative: 206ms)
UpdateTabTitle      10006ms  (cumulative: 10212ms) - TIMEOUT!
                   ────────
TOTAL              10,212ms  <-- user waits this long
Without TabTitle      206ms  <-- actual healthy latency
```

### PreToolUse: SecurityValidator (fires on EVERY Bash/Write/Read/Edit)

```
SecurityValidator     ~282ms per tool call (BLOCKING)
```

This adds 282ms to every single Bash, Write, Read, and Edit operation. Over a session with 100 tool calls, that is **28 seconds** of cumulative delay.

## Root Cause Analysis

### P0: UpdateTabTitle — 10s TIMEOUT (exit -1)
- **Root cause**: Calls `inference()` which is an LLM API call. When the inference endpoint is slow or unreachable, the 10-second timeout fires.
- **Impact**: Blocks the UserPromptSubmit pipeline for 10 seconds on every prompt when inference is unavailable.
- **Fix**: Move inference call to fire-and-forget background (don't await), or make it non-blocking with a 500ms timeout that falls back to the deterministic title.

### P1: SecurityValidator — 282ms BLOCKING
- **Root cause**: YAML parsing of `patterns.yaml` on every invocation. Imports `yaml` library. No caching across invocations (each hook run is a new process).
- **Impact**: 282ms added to every tool call (Bash, Write, Read, Edit). This is the most impactful because it fires dozens of times per session.
- **Fix**: Pre-compile patterns to JSON at startup (avoid YAML parse overhead). Or cache parsed patterns in a temp file.

### P2: StartupGreeting — 699ms
- **Root cause**: Spawns `Banner.ts` as child process, reads settings.json, builds banner layout.
- **Impact**: One-time at session start. Acceptable but could be faster.
- **Fix**: Pre-render banner, or simplify to avoid child process spawn.

### P3: ResponseTabReset / SetQuestionTab / QuestionAnswered — 240-400ms
- **Root cause**: All use the `tab-setter` library which communicates with Kitty terminal via IPC.
- **Impact**: Adds latency to Stop and AskUserQuestion flows.
- **Fix**: Fire-and-forget for tab operations (don't await IPC response).

### P4: AlgorithmTracker — 260ms
- **Root cause**: Reads/parses work state files on every Bash PostToolUse.
- **Impact**: Non-blocking but adds delay to the PostToolUse pipeline.

## Recommended Optimizations (Priority Order)

1. **UpdateTabTitle**: Wrap inference in `Promise.race` with 500ms timeout + deterministic fallback. Or move to fire-and-forget.
2. **SecurityValidator**: Replace YAML parse with pre-compiled JSON cache. Target: <50ms.
3. **Tab operations (ResponseTabReset, SetQuestionTab, QuestionAnswered)**: Make IPC fire-and-forget.
4. **AlgorithmTracker**: Lazy-load state only when needed, not on every Bash call.

## Health Summary

- **Fastest hook**: ModeClassifier (21ms) -- pure regex, zero I/O. Gold standard.
- **EventLogger**: 49-60ms -- clean, minimal. Good benchmark for "simple hook" cost.
- **Bun cold-start overhead**: ~20-40ms (the floor for any hook)
- **Total blocking latency per user prompt**: 144ms (healthy, without UpdateTabTitle)
- **Total blocking latency per tool call**: ~282ms (SecurityValidator only)
