---
task: Brigade improvements — AutoMerge A0 repo, dashboard, cross-review, auto-recovery
slug: 20260308-brigade-improvements
effort: advanced
phase: execute
progress: 13/25
mode: algorithm
started: 2026-03-08T00:00:00
updated: 2026-03-08T00:00:00
---

## Context

Brigade has 4 autonomous agents (Navi, Jules, A0, OpenCode) but integration between them is incomplete. Jules creates PRs that sit unreviewed, A0 results only visible at session start, no unified dashboard, no auto-recovery. Ivan wants fully autonomous brigade operation.

### Risks
- JulesAutoMerge for agent-zero-custom needs Python test runner (not bun test)
- A0 review of its own code = circular dependency (A0 reviews changes to A0)
- Auto-restart via container 1 needs careful error handling to avoid restart loops
- Dashboard expansion must fit 35-line terminal constraint

## Criteria

### Track 1: JulesAutoMerge for agent-zero-custom
- [x] ISC-1: agent-zero-custom added as 3rd repo in REPOS config
- [x] ISC-2: Test runner detects Python project (pytest, not bun test)
- [x] ISC-3: git remote 'a0custom' configured pointing to agent-zero-custom
- [x] ISC-4: autoMerge: true for a0custom repo
- [x] ISC-5: Pipeline tested with dry-run on existing PRs
- [x] ISC-6: First real merge cycle passes

### Track 2: Enhanced Brigade Dashboard
- [ ] ISC-7: Brigade briefing shows Jules active task count
- [ ] ISC-8: Brigade briefing shows A0 last health status
- [ ] ISC-9: Brigade briefing shows pending PR reviews count per repo
- [ ] ISC-10: Dashboard fits within 35 lines total

### Track 3: Cross-Agent Code Review for A0 Repo
- [x] ISC-11: A0 review enabled for a0custom PRs in pipeline
- [x] ISC-12: Z.AI review enabled for a0custom PRs in pipeline
- [x] ISC-13: HIGH severity blocks merge (same as PAI-personal)

### Track 4: A0 Auto-Recovery
- [ ] ISC-14: HealthMonitor detects A0 down (3 consecutive fails)
- [ ] ISC-15: Auto-restart script uses container 1 SSH escape hatch
- [ ] ISC-16: Restart has cooldown (max 1 restart per 30 min)
- [ ] ISC-17: Recovery event logged to events.jsonl
- [ ] ISC-18: Notification sent on recovery attempt

### Track 5: Jules Task Monitoring
- [x] ISC-19: Jules active tasks for a0 repo trackable via JulesAPI.ts
- [x] ISC-20: Completed tasks auto-detected by AutoMerge pipeline
- [ ] ISC-21: Failed tasks reported in dashboard briefing

### Track 6: Proactive Improvements
- [ ] ISC-22: agent-zero-custom remote added to local git config
- [ ] ISC-23: AutoMerge scheduled in cron (every 30min like existing)
- [ ] ISC-24: MEMORY.md updated with new brigade patterns
- [ ] ISC-25: All changes committed and verified

## Decisions

- Python test detection: check for pytest.ini, setup.py, conftest.py, or requirements*.txt in worktree root
- A0 reviewing its own code is acceptable — it reviews the diff, not the full codebase, and Z.AI provides independent second opinion
- Auto-restart cooldown prevents infinite restart loops
- Dashboard uses compact single-line format per agent to fit terminal

## Verification
