---
task: PAI v2.1.70 system improvements + community contributions
slug: 20260306-154603_pai-v2170-improvements
effort: extended
phase: complete
progress: 16/16
mode: algorithm
started: 2026-03-06T15:46:03+03:00
updated: 2026-03-06T15:46:03+03:00
---

## Context

Claude Code v2.1.59-2.1.70 brought significant features useful for PAI: `includeGitInstructions` setting, HTTP hook type, `InstructionsLoaded` event, `TeammateIdle` event with stop control, `agent_id`/`agent_type` in hook data, `${CLAUDE_SKILL_DIR}` variable. Ivan wants to apply all useful improvements and evaluate community contributions.

### Risks
- Modifying settings.json could break hooks if format is wrong
- New hook events may not fire as expected — need testing
- HTTP hooks are simpler but less flexible than command hooks

## Criteria

- [x] ISC-1: `includeGitInstructions: false` set in settings.json
- [x] ISC-2: Built-in git instructions no longer consumed (token savings ~2K)
- [x] ISC-3: InstructionsLoaded handler added to EventLogger routing table
- [x] ISC-4: InstructionsLoaded event registered in settings.json hooks section
- [x] ISC-5: InstructionsLoaded handler logs loaded file paths to events.jsonl
- [x] ISC-6: TeammateIdle handler added to EventLogger routing table
- [x] ISC-7: TeammateIdle event registered in settings.json hooks section
- [x] ISC-8: TeammateIdle handler stops teammates via `{"continue": false}` response
- [x] ISC-9: agent_type field logged in SubagentStop handler (parity with Start)
- [x] ISC-10: EventLogger tests updated for new handlers (13 tests, all pass)
- [x] ISC-11: All new hooks have chmod +x (EventLogger already executable)
- [x] ISC-12: `bun test hooks/tests/` passes — 230 tests, 0 failures
- [x] ISC-13: Community PR opportunities identified — 5 ranked by value
- [x] ISC-14: MEMORY.md updated with v2.1.70 settings and test counts
- [x] ISC-15: spinnerTips updated — 3 new tips about v2.1.70 features
- [x] ISC-16: All changes committed — 012e1eb (5 files, 208 insertions)

## Decisions

### Community PR Opportunities (ranked by value)
1. **feat(hooks): Unified Event System** — event-emitter.ts + event-types.ts + EventLogger routing pattern. Addresses #904 observability
2. **feat(hooks): Hook Testing Harness** — harness.ts + 230 test examples. No existing hook tests in community
3. **feat(paths): Portable getPaiDir()** — lib/paths.ts centralized path resolver. Fixes #830, #915
4. **feat(security): SecurityValidator + patterns.yaml** — PreToolUse security gate. Addresses #904
5. **feat(hooks): ModeClassifier** — deterministic regex mode router. Already PR #840

### v2.1.70 Settings Applied
- `includeGitInstructions: false` — saves ~2K tokens/session (we have our own git rules in CLAUDE.md)
- HTTP hook type available but not needed (our hooks have logic beyond simple POST)
- `${CLAUDE_SKILL_DIR}` variable available for SKILL.md references

## Verification

- settings.json has `includeGitInstructions: false` (grep confirmed)
- EventLogger has 5 handlers: SubagentStart, SubagentStop, TaskCompleted, InstructionsLoaded, TeammateIdle
- TeammateIdle outputs `{"continue": false, "stopReason": "PAI: teammate idle timeout"}`
- SubagentStop now logs agent_type (parity with Start)
- 13 EventLogger tests pass (5 new: InstructionsLoaded x2, TeammateIdle, SubagentStop agent_type, perf)
- 230 total suite tests pass, 0 failures
- Commit 012e1eb: 5 files, 208 insertions
- Community: 5 PR opportunities documented, top 3: Event System, Test Harness, getPaiDir()
