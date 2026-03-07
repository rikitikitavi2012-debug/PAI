---
task: Brigade improvements — AutoMerge A0 repo, dashboard, cross-review, auto-recovery
slug: 20260308-brigade-improvements
effort: advanced
phase: complete
progress: 25/25
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
- [x] ISC-7: Brigade briefing shows Jules active task count
- [x] ISC-8: Brigade briefing shows A0 last health status with heartbeat time
- [x] ISC-9: Brigade briefing shows pending PR reviews count per repo (3 repos)
- [x] ISC-10: Dashboard fits within 35 lines total (compact single-line per item)

### Track 3: Cross-Agent Code Review for A0 Repo
- [x] ISC-11: A0 review enabled for a0custom PRs in pipeline
- [x] ISC-12: Z.AI review enabled for a0custom PRs in pipeline
- [x] ISC-13: HIGH severity blocks merge (same as PAI-personal)

### Track 4: A0 Auto-Recovery
- [x] ISC-14: HealthMonitor checks A0 health before recovery
- [x] ISC-15: Auto-restart via container 1 SSH escape hatch (api_message → ssh docker restart)
- [x] ISC-16: Cooldown: max 1 restart per 30 min (a0-recovery.json state)
- [x] ISC-17: Recovery events logged to events.jsonl (attempt/success/failed/cooldown)
- [x] ISC-18: Voice notification on recovery attempt + result (Security voice)

### Track 5: Jules Task Monitoring
- [x] ISC-19: Jules active tasks for a0 repo trackable via JulesAPI.ts
- [x] ISC-20: Completed tasks auto-detected by AutoMerge pipeline
- [x] ISC-21: Jules active tasks shown in brigade briefing

### Track 6: Proactive Improvements
- [x] ISC-22: agent-zero-custom remote added to local git config (a0custom)
- [x] ISC-23: AutoMerge in cron (4x/day: 3,9,15,21) — a0custom auto-included
- [x] ISC-24: MEMORY.md updated with new brigade patterns
- [x] ISC-25: All changes committed and verified (6 commits)

## Decisions

- Python test detection: check for pytest.ini, setup.py, conftest.py, or requirements*.txt in worktree root
- A0 reviewing its own code is acceptable — it reviews the diff, not the full codebase, and Z.AI provides independent second opinion
- Auto-restart cooldown prevents infinite restart loops
- Dashboard uses compact single-line format per agent to fit terminal

## Verification

### Track 1: JulesAutoMerge — 3 repos configured, Python detection works, PR #2+#4 merged via pipeline
### Track 2: Dashboard — LoadContext.hook.ts enhanced (Jules tasks, 3-repo PRs, A0 heartbeat)
### Track 3: Cross-review — A0+Z.AI parallel review active, HIGH blocks merge, Z.AI truncation false positive fixed
### Track 4: Auto-recovery — HealthMonitor.ts `recover` command, container 1 escape hatch, 30min cooldown, voice alerts
### Track 5: Jules monitoring — 6 tasks created on agent-zero-custom, 6/7 PRs merged, active tasks in dashboard
### Track 6: Proactive — a0custom remote, cron 4x/day, MEMORY updated, persistent pytest venv

### Jules Results on agent-zero-custom:
- PR #1: Extension tests (12 tests) — MERGED
- PR #2: Security audit + SECURITY_AUDIT.md — MERGED
- PR #3: Telegram bot tests (bad mocks) — CLOSED
- PR #4: ops_commander + exa_synergy tests — MERGED
- PR #5: Telegram bot tests (retry, fixed mocks) — MERGED
- PR #6: chart_architect + doc_forge tests — MERGED
- PR #7: replicate_studio tests + CI workflow — MERGED

### Bugs Found & Fixed:
- `--admin` flag breaks merge on free repos (no branch protection) → adminMerge flag
- `gh pr merge --squash` without `--body ''` hangs → added `--body ''`
- Z.AI reports HIGH on truncated diffs → anti-truncation prompt + 8K limit
- `python` not in PATH → use venv at `.venv-pytest/`
- Jules forgets to mock deps in tests → improved task prompts with explicit sys.modules pattern
