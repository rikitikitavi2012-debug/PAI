---
task: "Four system improvements — recall, tuning, quality gate, ISC CLI"
slug: 20260316-100000_four-system-improvements
effort: advanced
phase: complete
progress: 10/10
mode: interactive
started: 2026-03-16T10:00:00Z
updated: 2026-03-16T10:00:00Z
---

## Context

Four high-ROI system improvements to evolve Algorithm from 82/100 toward 90+.
All independent — parallel execution via 4 agents.

## Criteria

### 1. Automatic Learning Recall
- [x] ISC-1: LearningRecall.ts exists in PAI/Tools/ (verify: file exists)
- [x] ISC-2: Finds similar LEARN.md files by keyword overlap (verify: bun run test)

### 2. Self-Tuning Effort Level
- [x] ISC-3: EffortPredictor.ts exists in PAI/Tools/ (verify: file exists)
- [x] ISC-4: Analyzes work.json history and suggests effort level (verify: bun run test)

### 3. ISC Quality Gate Hook
- [x] ISC-5: ISCQualityGate.hook.ts exists in hooks/ (verify: file exists)
- [x] ISC-6: Blocks PRD write if >30% trivial criteria detected (verify: echo test)

### 4. ISCManager CLI
- [x] ISC-7: ISCManager.ts exists in PAI/Tools/ with create/update/show (verify: --help)
- [x] ISC-8: Reads and writes PRD.md criteria section directly (verify: bun run test)

### Anti-criteria
- [ ] ISC-A-1: Anti: No existing hooks broken
- [ ] ISC-A-2: Anti: No test regressions

## Decisions

## Verification
