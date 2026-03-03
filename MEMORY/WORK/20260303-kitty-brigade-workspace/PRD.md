---
task: Redesign Kitty workspace for AI Brigade architecture
slug: 20260303-kitty-brigade-workspace
effort: standard
phase: complete
progress: 10/10
mode: algorithm
started: 2026-03-03T12:00:00
updated: 2026-03-03T12:00:00
---

## Context

Ivan переработал PAI под AI Brigade: Navi (Claude Code), Jules (Google async), Agent Zero (VPS Docker ревьюер), JulesAutoMerge (auto pipeline). Текущий Kitty workspace (5 табов) не отражает новую архитектуру. Нужен таб мониторинга бригады с live-данными + events feed.

Экран 1920x1080, WSL2, Tokyo Night, Kitty remote control socket, SSH Kitten, Alt+1..9 shortcuts.

## Criteria

- [x] ISC-1: Session file contains exactly 6 tabs
- [x] ISC-2: Tab 4 named "🤖 Brigade" with tall layout and vsplit
- [x] ISC-3: brigade-watch.sh polls A0 health via AgentZero.ts
- [x] ISC-4: brigade-watch.sh polls Jules sessions via JulesAPI.ts
- [x] ISC-5: brigade-watch.sh polls AutoMerge via JulesAutoMerge.ts
- [x] ISC-6: events-tail.sh streams events.jsonl with jq formatting
- [x] ISC-7: Home tab navigation updated to show 6 tabs including Brigade
- [x] ISC-8: Tabs 2,3,5,6 content unchanged from original
- [x] ISC-9: Scripts are executable (chmod +x)
- [x] ISC-10: Watch script interval ≥ 30 seconds (low CPU)

## Decisions

## Verification
