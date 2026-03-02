---
task: "Hook health-check script — detect broken/orphaned hooks"
slug: "20260302-hook-health-check"
effort: advanced
phase: complete
progress: 7/7
mode: algorithm
started: "2026-03-02T09:35:00-08:00"
updated: "2026-03-02T09:35:00-08:00"
---

## Context

Action #4 from PAI deep audit roadmap. Currently all 26 hooks fail-silent (exit 0 on any error). A broken hook is invisible — no alerting, no health monitoring. This script provides on-demand verification of the entire hook system.

### Risks
- bun build may pass syntax but miss runtime import issues → also check imports resolve
- settings.json uses ${PAI_DIR} variable → must expand for checks

## Criteria

- [x] ISC-1: Script at PAI/Tools/HookHealthCheck.ts, executable with `bun run`
- [x] ISC-2: Registration check — 27/27 hooks in settings.json exist on disk
- [x] ISC-3: Orphan check — 0 orphaned .hook.ts files
- [x] ISC-4: Syntax check — all 27 hooks + 17 lib + 7 handlers pass bun build
- [x] ISC-5: Import check — all local imports resolve to existing files
- [x] ISC-6: Summary output — table + totals + --json mode, exit code 0/1
- [x] ISC-7: Smoke test — 27 PASS, 0 FAIL, 0 orphans on current system
