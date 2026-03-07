# A0 Communications Polish — Task for Next Session

**Created**: 2026-03-07
**Status**: TODO
**Priority**: P2
**Context**: After full A0 scaffolding embedding + comms audit session

---

## Background

Session 2026-03-07 completed:
- Miessler 9 principles embedded in A0 system prompt
- ISC + Flywheel + Steering Rules in behaviour.md
- ISC + Flywheel in the-algorithm skill
- 10 failure patterns in FAISS memory
- 2 custom extensions created (_80_learn_enforcer, _81_wisdom_injector)
- Comms audit: API Message + MCP work, A2A = upstream bug (fasta2a v0.5.0)
- Container 2 crashed from broken extensions, fixed via container 1 escape hatch

## Tasks for Next Session

### 1. API Message Channel Polish
- [ ] AgentZero.ts: Handle `§§include()` references in A0 responses — detect pattern, fetch referenced file content via follow-up API call or strip to "[large output saved to file]"
- [ ] Test sync timeout behavior: what happens at exactly 600s? Graceful or crash?
- [ ] Consider retry logic for rate limit errors (429/500 with litellm.RateLimitError)

### 2. MCP Channel Verification
- [ ] Test MCP tools end-to-end from Claude Code: `send_message`, `finish_chat`
- [ ] Verify MCP session persistence (does session_id survive across tool calls?)
- [ ] Document when to use MCP vs API Message (MCP = interactive tools, API = task delegation)

### 3. Extensions Validation
- [ ] _80_learn_enforcer.py: Verify it actually triggers after 10 messages (send 10+ messages in test conversation)
- [ ] _81_wisdom_injector.py: Verify wisdom appears in A0's context (ask A0 to report what extras_temporary it sees)
- [ ] Check no errors in A0 startup after restart with both extensions
- [ ] Consider: should extensions use numbered slots _80/_81 or higher to avoid future A0 update conflicts?

### 4. A0 Response Parsing
- [ ] `§§include()` pattern: determine if this is configurable in A0 settings or code_execution_tool behavior
- [ ] If configurable — disable it for API responses (only useful for WebUI)
- [ ] If not — add parser in AgentZero.ts to detect and handle

### 5. Container Management
- [ ] Document container 1 escape hatch commands in a quick-reference
- [ ] Consider: add health-check that auto-restarts container 2 via container 1 if unresponsive for 5min
- [ ] Test: what happens to container 2 custom extensions after docker restart? (persistent via volume mount?)

### 6. A2A (LOW PRIORITY — only if upstream fixes)
- A2A POST returns 500 due to fasta2a v0.5.0 bug (ValidationError unhandled in _agent_run_endpoint)
- Agent card works at `/a2a/t-TOKEN/.well-known/agent.json`
- Method is `message/send` (not `tasks/send`)
- Would need upstream fasta2a patch or monkey-patch in DynamicA2AProxy

## Key Files
- `/a0/python/extensions/message_loop_prompts_after/_80_learn_enforcer.py`
- `/a0/python/extensions/message_loop_prompts_after/_81_wisdom_injector.py`
- `/a0/prompts/default/agent.system.md` (Miessler principles)
- `/a0/usr/memory/default/behaviour.md` (ISC + Flywheel + Steering Rules)
- `/a0/usr/skills/the-algorithm/SKILL.md` (ISC + Flywheel)
- `~/.claude/PAI/Tools/AgentZero.ts` (CLI tool)
- `~/.claude/settings.json` (MCP SSE config)

## Working Channels Summary
| Channel | Status | Use Case |
|---------|--------|----------|
| `/api_message` + X-API-KEY | PRIMARY | Task delegation, sync queries |
| MCP SSE | SECONDARY | Interactive tool calls from Claude Code |
| A2A | BROKEN | fasta2a bug, skip |
| Container 1 SSH | MGMT | Restart/logs/exec on container 2 |
