---
task: Brigade → Telemetry сквозная интеграция
slug: brigade-telemetry-integration
effort: Advanced
phase: verify
progress: 12/12
mode: algorithm
started: 2026-03-05
updated: 2026-03-05
---

## Context
Бригада (A0, Jules, Voice, AutoMerge) и оперативный центр (Telemetry tab) — два отдельных мира. Нужна сквозная интеграция: все участники эмитят события → events.jsonl → Telemetry Dashboard показывает BRIGADE STATUS.

## Criteria
- [x] ISC-1: HealthMonitor emits a0.health_check event after each run
- [x] ISC-2: JulesAutoMerge emits automerge.cycle event at cycle start/end
- [x] ISC-3: event-types.ts has A0HealthCheckEvent and AutoMergeCycleEvent types
- [x] ISC-4: telemetry-dashboard.sh has compute_brigade() function
- [x] ISC-5: BRIGADE STATUS section shows A0 online/offline + last response time
- [x] ISC-6: BRIGADE STATUS shows Jules merged/failed today counts
- [x] ISC-7: BRIGADE STATUS shows AutoMerge last cycle + result
- [x] ISC-8: events-format.sh has icons/colors for a0.health_check and automerge.cycle
- [x] ISC-9: brigade filter in events-format.sh includes automerge.* events
- [x] ISC-10: Voice alert fires when A0 goes offline (from HealthMonitor — already existed)
- [x] ISC-11: bash -n passes on all modified .sh files
- [x] ISC-12: Visual verification via ZaiVision screenshot confirms BRIGADE section renders

## Decisions
- Use events.jsonl as single source of truth for brigade status (not health-report.json API)
- HealthMonitor already sends voice alerts for failures — reuse that mechanism
- BRIGADE section goes between ALGORITHM and AGENTS in dashboard layout
