---
task: Apply TUI best practices to Kitty dashboards
slug: 20260304-164500_kitty-tui-best-practices
effort: extended
phase: complete
progress: 20/20
mode: algorithm
started: 2026-03-04T16:45:00
updated: 2026-03-04T16:45:00
---

## Context

Research-driven TUI improvements for 3 Kitty dashboards + lib/ui.sh. Based on btop/k9s/lazygit patterns. Focus on: alternate buffer, cursor management, ellipsis truncation, responsive width, hyperlinks, tab titles, time-ago helper.

### Risks
- Alternate buffer may interfere with Kitty session manager
- tput commands may not work in all terminal contexts
- Adding too many helpers bloats lib/ui.sh

## Criteria

lib/ui.sh new helpers:
- [x] ISC-1: alt_screen_enter() uses tput smcup + cursor hide
- [x] ISC-2: alt_screen_exit() uses tput rmcup + cursor show + tab_reset
- [x] ISC-3: truncate() adds … for strings exceeding max width
- [x] ISC-4: truncate() works on plain text (caller strips ANSI before calling)
- [x] ISC-5: right_align() uses ANSI cursor-to-column (\033[NG)
- [x] ISC-6: set_tab_title() uses OSC 2 escape (\033]2;title\007)
- [x] ISC-7: time_ago() returns с/м/ч/д/н for seconds/minutes/hours/days/weeks

All 3 scripts — alternate buffer:
- [x] ISC-8: telos-dashboard uses alt_screen_enter on start
- [x] ISC-9: command-center uses alt_screen_enter on start
- [x] ISC-10: brigade-watch uses alt_screen_enter on start
- [x] ISC-11: All 3 scripts trap EXIT/INT/TERM for alt_screen_exit

All 3 scripts — tab titles:
- [x] ISC-12: telos-dashboard sets tab title "🎯 TELOS"
- [x] ISC-13: command-center sets tab title "⬢ Center"
- [x] ISC-14: brigade-watch sets tab title "🤖 Brigade"

Ellipsis truncation:
- [x] ISC-15: command-center uses truncate() for PR titles (×2)
- [x] ISC-16: command-center uses truncate() for session titles
- [x] ISC-17: brigade-watch uses truncate() for Jules session titles

Footer right-alignment:
- [x] ISC-18: command-center + brigade-watch footers right-align timestamp in box_line

Tests:
- [x] ISC-19: 105/105 tests pass (was 99, +6 for new functions)
- [x] ISC-20: All helpers verified: truncate, time_ago, right_align, set_tab_title

## Decisions

## Verification
