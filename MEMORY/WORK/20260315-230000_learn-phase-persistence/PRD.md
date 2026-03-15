---
task: Guarantee LEARN phase persists learnings to MEMORY files
slug: 20260315-230000_learn-phase-persistence
effort: extended
phase: complete
progress: 16/16
mode: algorithm
started: 2026-03-15T23:00:00
updated: 2026-03-15T23:00:00
---

## Context

Algorithm v4.0-alpha LEARN phase (7/7) outputs reflections as text, but nothing mandates writing to persistent files. Result: 0 out of 60+ completed Algorithm sessions created LEARN artifacts in MEMORY. Learnings vanish with context.

Root cause: LEARN phase says "Write to Wisdom Frames only if pattern is cross-domain applicable" — a soft instruction easily forgotten, especially after context compaction. No hook verifies compliance.

Approach: Two-part fix:
1. Algorithm.md edit — make LEARN phase mandate writing LEARN.md to PRD directory
2. Hook enhancement — AlgorithmTracker detects LEARN→COMPLETE transition and verifies LEARN.md exists

### Risks
- Hook feedback injection may not be noticed by AI after compaction → mitigated: hook blocks phase:complete edit, not just warns
- Too strict mandate may create low-value boilerplate LEARN files → mitigated: Standard tier LEARN is 5-10 lines, not essay
- AlgorithmTracker already has 4 responsibilities — adding 5th increases complexity → mitigated: new hook, not extension of AlgorithmTracker
- PRDSync extension could break dashboard → mitigated: separate hook with own trigger

## Criteria

### Algorithm.md changes (4)
- [x] ISC-1 [B]: LEARN phase has mandatory "Write LEARN.md" instruction
- [x] ISC-2 [B]: LEARN.md template defined with 3 sections (reflective, patterns, actions)
- [x] ISC-3 [B]: LEARN phase marks PRD phase: complete AFTER writing LEARN.md
- [x] ISC-4 [B]: Standard tier LEARN.md is minimal (5-10 lines max)

### Hook verification (4)
- [x] ISC-5 [B]: LearnGate hook detects phase:complete in Edit/Write of PRD.md
- [x] ISC-6 [B]: Hook derives PRD directory from file_path (dirname)
- [x] ISC-7 [B]: Hook checks LEARN.md exists in PRD directory
- [x] ISC-8 [B]: Hook returns decision:block with template if LEARN.md missing

### Quality gates (4)
- [x] ISC-9 [B]: Existing hooks not broken (SecurityValidator, PRDSync still work)
- [x] ISC-10 [B]: Hook runs in <50ms (19ms measured)
- [x] ISC-11 [B]: Solution works after context compaction (file-based, not prompt-based)
- [x] ISC-12 [B]: Algorithm-Autoresearch.md not modified

### Metric (2)
- [x] ISC-13 [Q]: LEARN persistence rate measurable via script (baseline: 0/60 = 0%)
  metric: learn_persistence_rate || cmd: bash measure-learn-rate.sh || baseline: 0 || target: 90 || direction: higher
- [x] ISC-14 [B]: Measurement script saved to PRD directory

### Anti-criteria (2)
- [x] ISC-A1: Existing v4.0-alpha.md LEARN phase reflective output NOT removed
- [x] ISC-A2: RatingCapture and FailureCapture hooks NOT modified

## Decisions

## Verification
- ISC-1..4: v4.0-alpha.md LEARN section has mandatory LEARN.md instruction with template ✅
- ISC-5..8: LearnGate.hook.ts blocks phase:complete without LEARN.md (tested 4 scenarios) ✅
- ISC-9: SecurityValidator and PRDSync return continue:true (no regression) ✅
- ISC-10: LearnGate runs in 19ms (< 50ms target) ✅
- ISC-11: Hook uses filesystem existsSync, no context dependency ✅
- ISC-12: Algorithm-Autoresearch.md has zero diff ✅
- ISC-13: Baseline measurement: 0/60 = 0% (script functional) ✅
- ISC-14: measure-learn-rate.sh in PRD directory, executable ✅
- ISC-A1: All 3 tracks of reflective output preserved in LEARN section ✅
- ISC-A2: RatingCapture/FailureCapture untouched ✅
- Capability: Thinking:FirstPrinciples invoked via Skill tool ✅
