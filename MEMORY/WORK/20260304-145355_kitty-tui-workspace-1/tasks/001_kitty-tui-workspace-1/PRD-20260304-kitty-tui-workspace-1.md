---
prd: true
id: PRD-20260304-kitty-tui-workspace-1
title: "Продолжаем работу над Kitty TUI workspace. Контекст: 1. Создана shared UI"
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

# Продолжаем работу над Kitty TUI workspace. Контекст: 1. Создана shared UI

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
  Продолжаем работу над Kitty TUI workspace. Контекст:



  1. Создана shared UI library: config/kitty/scripts/lib/ui.sh (box_top, box_line, two_col, badges, vwidth, tab colors)

  2. events-tail.sh и a0-chat-tail.sh уже используют lib/ui.sh для headers

  3. pai.session Tab 4-6 — рамки расширены до 96 символов

  4. telos-dashboard.sh, command-center.sh, brigade-watch.sh — НЕ мигрированы на lib/ui.sh (у них свои inline хелперы)

  5. Jules пишет тесты: sessions/16225330439007004407

  6. Отчёт 

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

- 2026-03-04T11:53:55.221Z | CREATED | STANDARD effort | 8-16 ISC target
