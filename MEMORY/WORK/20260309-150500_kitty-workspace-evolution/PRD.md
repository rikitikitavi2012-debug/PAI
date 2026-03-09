---
task: Kitty Workspace Evolution — agent live tabs + smart workspace features
slug: 20260309-150500_kitty-workspace-evolution
effort: advanced
phase: execute
progress: 13/28
mode: algorithm
started: 2026-03-09T15:05:00+03:00
updated: 2026-03-09T15:05:00+03:00
---

## Context

Ivan wants to evolve the PAI Kitty workspace with 9 features across 3 phases.
Current state: 7 static tabs, kitty @ remote control works, ui.sh library, EventLogger hook handles SubagentStart/SubagentStop, transcript files at `.claude/projects/.../subagents/agent-ID.jsonl`.

Core request: when agents spawn, see their work live in a Kitty tab. Plus 8 more smart workspace features planned for iterative delivery.

### Architecture

**Phase 1 — Agent Live Tabs (core, this session):**
- Hook: SubagentStart → opens kitty tab with `kitty @ launch`
- Script: agent-live.sh — formats transcript jsonl via `tail -f | jq`
- Hook: SubagentStop → closes tab via `kitty @ close-tab`
- Tab title: `🚀 Engineer: security fixes` (agent_type + description)
- Tab color: purple domain (agent work)

**Phase 2 — Smart Tabs (next session):**
- Smart Tab Titles — hook updates tab titles with current state
- Tab Health Dots — HealthMonitor updates tab titles with 🟢/🔴
- Test Runner Tab — opens on `bun test`, auto-closes on pass

**Phase 3 — Advanced (межсезонье):**
- Focus Mode — hotkey hides non-essential tabs
- Auto-focus on errors — tab flashing on failures
- Split pane for diff
- Pipeline Kanban tab
- Session Timeline

### Risks

- Transcript file may not exist immediately at SubagentStart (race condition)
- Multiple parallel agents = multiple tabs = visual clutter
- Kitty @ launch needs correct shell env (bun, paths)
- Tab IDs tracking for cleanup — orphaned tabs on crash

## Criteria

### Phase 1: Agent Live Tabs (this session)
- [x] ISC-1: SubagentStart hook opens new kitty tab via `kitty @ launch`
- [x] ISC-2: Tab title contains agent_type and description (truncated)
- [x] ISC-3: Tab color is purple domain (agent work)
- [x] ISC-4: agent-live.sh script finds transcript file by agent_id glob
- [x] ISC-5: agent-live.sh handles 1-2s delay before transcript file appears
- [x] ISC-6: agent-live.sh formats transcript jsonl: assistant messages, tool calls, tool results
- [x] ISC-7: agent-live.sh shows spinner while waiting for new content
- [x] ISC-8: SubagentStop hook closes the agent's kitty tab by match title
- [x] ISC-9: Agent tab ID stored in temp file for reliable cleanup
- [x] ISC-10: Orphan tabs cleaned on session end (Stop hook or cleanup script)
- [x] ISC-11: Multiple parallel agents create separate tabs without conflict
- [x] ISC-12: Tab auto-positions after existing tabs (rightmost)
- [x] ISC-A1: Agent hooks do NOT block Claude Code (fail-open, <50ms for hook itself)

### Phase 2: Smart Tabs (planned, not this session)
- [ ] ISC-13: Smart Tab Titles — working tab shows current Algorithm phase
- [ ] ISC-14: Smart Tab Titles — Brigade tab shows active agent count
- [ ] ISC-15: Tab Health Dots — A0 status indicator in Brigade tab title
- [ ] ISC-16: Tab Health Dots — VoiceServer status in Telemetry tab title
- [ ] ISC-17: Test Runner Tab — opens on `bun test` invocation
- [ ] ISC-18: Test Runner Tab — shows live test output with pass/fail colors
- [ ] ISC-19: Test Runner Tab — auto-closes 10s after all-pass result

### Phase 3: Advanced (planned, межсезонье)
- [ ] ISC-20: Focus Mode — hotkey hides all tabs except working + 1 context
- [ ] ISC-21: Focus Mode — second press restores all tabs
- [ ] ISC-22: Auto-focus — tab flashes red on agent/A0 error
- [ ] ISC-23: Auto-focus — switches focus to error tab
- [ ] ISC-24: Split pane for diff — `kitty @ launch --location=hsplit`
- [ ] ISC-25: Pipeline Kanban — real-time pipeline status in kitty tab
- [ ] ISC-26: Session Timeline — horizontal progress bar of session events
- [ ] ISC-27: tab-colors.sh updated for new tab types (agent=purple, test=green/red)
- [ ] ISC-28: All scripts symlinked to ~/.config/kitty/ correctly

## Decisions

## Verification
