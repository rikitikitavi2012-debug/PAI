---
task: Strategic metrics — Navi Growth + TELOS + Cost + Daily Timeline
slug: strategic-dashboard
effort: Advanced
phase: complete
progress: 14/14
mode: algorithm
started: 2026-03-05
updated: 2026-03-05
---

## Context
Telemetry dashboard — операционный центр (inference, errors, agents). Не хватает стратегического слоя: куда движемся, как растём, сколько стоит. Ivan подтвердил 4 направления, приоритет: Navi Growth > Timeline > TELOS > Cost.

## Criteria
- [x] ISC-1: NAVI GROWTH section in dashboard: today/week/month avg rating
- [x] ISC-2: Rating trend arrow (up/down/flat) based on week vs prev week
- [x] ISC-3: High (9-10) and low (1-4) rating counts displayed
- [x] ISC-4: Failure patterns count this month displayed
- [x] ISC-5: TELOS section: active goals count + top priority goal name + progress
- [x] ISC-6: TELOS reads from PAI/USER/TELOS/GOALS.md (not hardcoded)
- [x] ISC-7: COST section: monthly fixed + estimated API = total
- [x] ISC-8: Cost config in a simple file (not hardcoded in dashboard)
- [x] ISC-9: Daily digest tool: `bun PAI/Tools/DailyDigest.ts` aggregates all sources
- [x] ISC-10: DailyDigest outputs: events summary, ratings, brigade activity, work completed
- [x] ISC-11: DailyDigest saves to MEMORY/STATE/daily-digest-YYYY-MM-DD.json
- [x] ISC-12: bash -n passes on all modified .sh files
- [x] ISC-13: 226+ tests green
- [x] ISC-14: Visual verification confirms new sections render in dashboard

## Decisions
- Strategic sections go AFTER SYSTEM (bottom of dashboard) — operational metrics stay on top
- Cost config in simple YAML/JSON at PAI/config/cost-budget.json
- DailyDigest is a standalone tool, not a hook — can be run by cron or manually
- TELOS parsing via simple grep/regex on GOALS.md markdown (no full parser)
