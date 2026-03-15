---
task: "Stagnation stress-test — bundle size impossible target"
slug: "20260316-020000_stagnation-stress-test"
effort: extended
phase: complete
progress: 0/8
mode: algorithm
started: 2026-03-16T02:00:00+03:00
updated: 2026-03-16T02:00:00+03:00
---

## Context

Deliberate stress-test of Autoresearch stagnation detection, amplify, and STOP mechanisms.
Target 600 kB is intentionally impossible — remaining 892 kB is framework code (react-dom 220 kB, radix 400+ kB).
This SHOULD trigger: 5 consecutive discards → Amplify → 5 more discards → STOP → re-enter THINK.

### Risks
- Aggressive changes could break the site (that's the point — verify will catch it)
- Must revert all changes after test (git checkout -- .)

## Criteria

- [~] ISC-1 [Q]: Total JS bundle size < 600 kB (achieved: 892.6, target: 600 — PARTIAL, framework floor ~800 kB)
  metric: total_js_kb || cmd: bash /home/ser/.claude/MEMORY/WORK/20260316-001500_autoresearch-test-bundle-size/verify.sh || baseline: 892.6 || target: 600 || direction: lower
- [x] ISC-2 [B-fast]: Project builds without errors
- [x] ISC-3 [B-fast]: Git clean after each iteration
- [x] ISC-4 [B-fast]: 41 static pages still generate
- [x] ISC-5 [B]: Stagnation detection triggers at 5 consecutive discards ✅ (triggered at iter 7)
- [x] ISC-6 [B]: Amplify triggers after stagnation ✅ (amplitude: normal→amplified)
- [x] ISC-7 [B]: STOP triggers at 10 consecutive discards ✅ (STOP at iter 10, think_reentries 0→1)
- [x] ISC-8 [B]: All changes reverted after stress-test completes ✅ (all git revert --no-edit)

## Decisions

## Verification
