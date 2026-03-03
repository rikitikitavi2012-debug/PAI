---
task: Fix and improve Brigade dashboard in Kitty
slug: 20260303-153000_brigade-dashboard-ux
effort: extended
phase: complete
progress: 18/18
mode: algorithm
started: 2026-03-03T15:30:00
updated: 2026-03-03T15:30:00
---

## Context

Ivan reports the Brigade tab (Tab 4) in Kitty has issues:
1. AUTOMERGE check shows "Ошибка проверки" — timeout on Jules API (8s limit vs 20+ completed sessions requiring individual API calls)
2. Agent Zero only displays basic health "✅ is running" — no active tasks, scheduler, resource info
3. Events tail only extracts 1 field from JSON events, missing rich data
4. Overall UX can be improved with better formatting and more useful info

### Risks
- Jules API latency can exceed brigade-watch timeout (8s)
- Agent Zero API may not respond within timeout
- Events file may not exist yet in fresh sessions

## Criteria

- [x] ISC-1: `brigade-watch.sh` AUTOMERGE `check` completes without timeout
- [x] ISC-2: AUTOMERGE reads stats from local state file (no API call needed)
- [x] ISC-3: Jules API has explicit 10s timeout via `timeout` command
- [x] ISC-4: Jules active sessions show session title (truncated to 50 chars)
- [x] ISC-5: AUTOMERGE section shows recent merge stats (merged/failed/skipped counts)
- [x] ISC-6: Agent Zero section shows container info (3 containers, primary port)
- [x] ISC-7: Agent Zero section shows health endpoint JSON data (git info, errors)
- [x] ISC-8: Agent Zero section shows response latency as health indicator
- [x] ISC-9: Events tail extracts multiple data fields (source, phase, progress, slug, agent, worktree)
- [x] ISC-10: Events tail formats output with colors by event type (7 color categories)
- [x] ISC-11: Events tail shows icons per event category (🚀🏁🔊⭐📦🔄📋🌳⚡)
- [x] ISC-12: Brigade-watch header shows refresh interval
- [x] ISC-13: Brigade-watch sections use PAI 24-bit RGB palette (emerald/rose/amber/cyan/sky/violet)
- [x] ISC-14: Brigade-watch shows section separators with labeled headers
- [x] ISC-15: Agent Zero error state shows truncated error message from health endpoint
- [x] ISC-16: Jules section groups sessions by state (IN_PROGRESS vs COMPLETED count)
- [x] ISC-17: All API calls have explicit timeout guards (curl --max-time, timeout command)
- [x] ISC-18: All scripts are executable (chmod +x)

## Decisions

## Verification

- ISC-1..3: AUTOMERGE больше не вызывает `bun JulesAutoMerge.ts check` (таймаутящийся Jules API) — читает stats из локального файла. Timeout guards на всех вызовах.
- ISC-4,16: Jules показывает 2 IN_PROGRESS + 25 COMPLETED, активные с названиями (50 char).
- ISC-5: Merged/Failed/Skipped counts + последние 5 PR с результатами.
- ISC-6-8: Agent Zero: Online 299ms, container info, git error message truncated.
- ISC-9-11: Events tail: 7 цветовых категорий, иконки, поля source/phase/progress/slug/agent/worktree.
- ISC-12-14: Header с временем и интервалом, 24-bit RGB палитра, section separators.
- ISC-15: A0 error показывается: "SHA is empty, possible dubious ownership..."
- ISC-17: curl --max-time 10, timeout 10, timeout 5 — все вызовы защищены.
- ISC-18: -rwxr-xr-x оба скрипта.
- Bash errors: 0 (grep на "brigade-watch.sh: line" — чисто).
