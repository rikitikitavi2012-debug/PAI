---
task: Redesign Telos dashboard with hierarchy and data connections
slug: 20260304-telos-dashboard-redesign
effort: extended
phase: complete
progress: 20/20
mode: interactive
started: 2026-03-04T07:30:00Z
updated: 2026-03-04T07:30:00Z
---

## Context

Ivan wants to redesign the Kitty Telos tab (Tab 1) — the strategic life dashboard. Current issues:
- 60s poll interval is 99.7% wasted (TELOS changes 2-5x/day during sessions)
- Flat layout with no visual hierarchy — all sections equal weight
- Missing data: weekly focus, blockers, spheres, wisdom, beliefs, learning metrics
- No visual flow showing cause→effect between sections
- TelosParser already parses STATUS.md (weeklyFocus, blockers, spheres) but dashboard doesn't render them

Brainstorm outcome: 5-section hierarchy with visual flow arrows:
1. HEADER: season + spheres + meta-metrics
2. ACTIONABLE: weekly focus + blockers (first 3 sec)
3. PROGRESS: missions + goals (separated active/frozen) + wins
4. REFERENCE: C→S graph + capital (compact) + compass (wisdom rotation)
5. Refresh: inotifywait + 5min fallback poll

### Risks
- inotifywait may not work reliably in WSL2 for all events
- Dashboard width must fit 100-col terminal (Kitty default)
- TelosParser extensions could break existing consumers (command-center.sh)

### Plan
1. Extend TelosParser.ts with new data sources (WISDOM, BELIEFS, IDEAS, LEARNED, MEMORY/WORK, ratings, frames)
2. Rewrite telos-dashboard.sh with new 5-section layout
3. Add inotifywait wrapper with fallback poll
4. Test on real data

## Criteria

- [x] ISC-1: TelosParser exports wisdom quotes array from WISDOM.md
- [x] ISC-2: TelosParser exports beliefs count from BELIEFS.md
- [x] ISC-3: TelosParser exports ideas count from IDEAS.md
- [x] ISC-4: TelosParser exports lessons count from LEARNED.md
- [x] ISC-5: TelosParser exports session count from MEMORY/WORK (7d window)
- [x] ISC-6: TelosParser exports performance rating trend from ratings.jsonl
- [x] ISC-7: TelosParser exports wisdom frames count from MEMORY/WISDOM/FRAMES
- [x] ISC-8: Dashboard header shows season countdown and sphere indicators
- [x] ISC-9: Dashboard renders weekly focus section from STATUS.md data
- [x] ISC-10: Dashboard renders blockers section with linked C/S references
- [x] ISC-11: Dashboard renders missions with expanded goal breakdown
- [x] ISC-12: Dashboard splits goals into active vs frozen/ideas columns
- [x] ISC-13: Dashboard renders C→S dependency graph (tree format)
- [x] ISC-14: Dashboard renders compact capital in single line
- [x] ISC-15: Dashboard renders compass section with rotating wisdom quote
- [x] ISC-16: Dashboard renders wins + growth metrics section
- [x] ISC-17: Visual flow arrows (▼) separate hierarchical levels
- [x] ISC-18: Refresh uses mtime-check poll (5min) skipping parse if unchanged
- [x] ISC-19: Existing telos-state.json schema backward-compatible for command-center.sh
- [x] ISC-A-1: Anti: dashboard does NOT exceed 100 columns width

## Decisions

## Verification

- ISC-1: 21 wisdom quotes parsed (9 personal W1-W9, 12 borrowed Q0-Q11)
- ISC-2: beliefsCount=6 (B0-B5 from BELIEFS.md)
- ISC-3: ideasCount=4 (I0-I3 from IDEAS.md)
- ISC-4: lessonsCount=25 (bullet items from LEARNED.md)
- ISC-5: sessionsWeek=95 (MEMORY/WORK directories, 7d window)
- ISC-6: performanceRating={current:9, weekAvg:7.2, trend:"up"}
- ISC-7: wisdomFramesCount=5 (MEMORY/WISDOM/FRAMES/*.md)
- ISC-8: Header shows "❄ Межсезонье ████████░ 77% 28д" + sphere indicators
- ISC-9: Weekly focus renders 7 items from STATUS.md
- ISC-10: Blockers render with severity icons and linked references
- ISC-11: Missions show progress bars + linked goal breakdown on next line
- ISC-12: Active goals (left) separated from frozen/ideas (right) with divider
- ISC-13: C→S graph renders tree with ├──→/└──→ branches + effectiveness icons
- ISC-14: Capital in single line at bottom: "💰 3.5M │Земля Б 1.5M│Акции п 450K│..."
- ISC-15: Compass rotates quotes by minute-of-day, shows quote + ID
- ISC-16: Wins (5) + Growth metrics (sessions, frames, lessons, rating) in 2 columns
- ISC-17: Three ▼ arrows: "фокус двигает" → "цели сталкиваются с" → "стратегии создают"
- ISC-18: INTERVAL=300, LAST_MTIME tracks source file changes, skips parse if unchanged
- ISC-19: Only `.learning` added (additive). command-center.sh reads .goals/.system/.status/.season — untouched
- ISC-A-1: Max rendered width = 100 columns (verified with awk strip+measure)
