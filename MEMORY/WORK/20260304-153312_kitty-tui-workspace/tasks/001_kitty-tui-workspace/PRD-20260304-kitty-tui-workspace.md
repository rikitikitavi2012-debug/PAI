---
prd: true
id: PRD-20260304-kitty-tui-workspace
title: "Kitty TUI workspace — визуальная проверка после миграции на lib/ui.sh. Контекст"
session_id: "unknown"
status: ACTIVE
mode: interactive
effort_level: STANDARD
created: 2026-03-04
updated: 2026-03-04
completed_at: null
iteration: 0
maxIterations: 128
loopStatus: null
last_phase: null
failing_criteria: []
verification_summary: "0/0"
parent: null
children: []
---

# Kitty TUI workspace — визуальная проверка после миграции на lib/ui.sh. Контекст

> _To be populated during OBSERVE: what this achieves and why it matters._

## STATUS

| What | State |
|------|-------|
| Progress | 0/0 criteria passing |
| Phase | ACTIVE |
| Next action | OBSERVE phase — create ISC |
| Blocked by | nothing |

## APPETITE

| Budget | Circuit Breaker | ISC Target |
|--------|----------------|------------|
| <2min | 1 session | 8-16 criteria |

## CONTEXT

### Problem Space
Kitty TUI workspace — визуальная проверка после миграции на lib/ui.sh.



  Контекст (сессия 82ed8a4) и последняя:

  1. 3 скрипта мигрированы на shared lib/ui.sh: telos-dashboard, command-center, brigade-watch

  2. Flicker-free refresh (printf '\033[H\033[J' вместо clear)

  3. Dynamic tab colors (tab_ok/tab_warn/tab_crit)

  4. API spinners (spin_start/spin_stop в brigade-watch, command-center)

  5. Pulse indicator ● в заголовках всех 3 дашбордов

  6. DIM sub-separators в telos для снижения

### Key Files
_To be populated during exploration._

## RISKS & RABBIT HOLES

_To be populated during THINK phase._

## PLAN

_To be populated during PLAN phase._

## IDEAL STATE CRITERIA (Verification Criteria)

### Criteria

### Anti-Criteria

## DECISIONS

_Non-obvious technical decisions logged here during BUILD/EXECUTE._

## CHANGELOG

- 2026-03-04T12:33:12.669Z | CREATED | STANDARD effort | 8-16 ISC target
