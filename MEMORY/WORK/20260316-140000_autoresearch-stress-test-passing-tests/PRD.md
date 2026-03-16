---
task: Autoresearch stress-test — maximize passing PAI tests
slug: 20260316-140000_autoresearch-stress-test-passing-tests
effort: extended
phase: complete
progress: 1/3
mode: algorithm
started: 2026-03-16T14:00:00
updated: 2026-03-16T14:00:00
trust_level: L1
iteration_cap: 15
---

## Context

Stress-test of the /autoresearch skill on a real metric: PAI hook test pass count.
Currently 313 pass / 77 fail out of 391 tests. Goal: reach 350+ by fixing stale expectations and broken tests.

LearningRecall: test failures often = stale expectations from evolving data (schema changes), not code bugs.

## Criteria

- [~] ISC-1 [Q]: Passing test count > 350 (achieved: 313, target: 350 — BLOCKED: all failures are test pollution, not code bugs)
  metric: passing_tests || cmd: bun test hooks/tests/ 2>&1 | grep -oP '\d+ pass' | grep -oP '\d+' || baseline: 313 || target: 350 || direction: higher_is_better
- [x] ISC-2 [B]: No previously passing test regresses to failing
- [x] ISC-3 [B]: No test files deleted to inflate pass count

## Decisions

## Verification
