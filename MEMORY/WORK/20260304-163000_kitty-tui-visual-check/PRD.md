---
task: Kitty TUI visual check post lib/ui.sh migration
slug: 20260304-163000_kitty-tui-visual-check
effort: standard
phase: complete
progress: 10/10
mode: algorithm
started: 2026-03-04T16:30:00
updated: 2026-03-04T16:30:00
---

## Context

Visual verification of 3 Kitty TUI dashboards after migration to shared lib/ui.sh. Previous session (82ed8a4) migrated telos-dashboard, command-center, brigade-watch. Need to confirm rendering correctness, check Jules async tasks, and investigate "question mark" artifacts.

## Criteria

- [x] ISC-1: telos-dashboard.sh runs without bash errors
- [x] ISC-2: command-center.sh runs without bash errors
- [x] ISC-3: brigade-watch.sh runs without bash errors
- [x] ISC-4: box_line right border │ aligned at column 96 (PAI_UI_WIDTH)
- [x] ISC-5: two_col borders aligned — fixed off-by-1 (was 95, now 96)
- [x] ISC-6: All 3 scripts source lib/ui.sh correctly
- [x] ISC-7: Jules ZaiVision session (17037718397508107583) — COMPLETED
- [x] ISC-8: Jules bash tests session (16225330439007004407) — AWAITING_USER_FEEDBACK (0 outputs)
- [x] ISC-9: "Question marks" = defensive fallbacks when APIs unreachable (not bugs)
- [x] ISC-10: 99/99 existing bash tests still pass

## Decisions

## Verification
