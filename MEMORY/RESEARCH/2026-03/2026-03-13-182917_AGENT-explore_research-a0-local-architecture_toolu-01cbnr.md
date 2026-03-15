# Research A0 local architecture

**Agent:** Explore
**Captured:** 2026-03-13T18:29:17+03:00
**Tool Use ID:** toolu_01CBNrweU71wxGQuvfPe3XpH
**Tokens:** 79107
**Duration:** 113s
**Source:** PostToolUse hook capture

---

Now I have comprehensive information. Let me compile the final report.

---

## Agent Zero (A0) Integration — Complete Architecture

Based on my thorough search of the PAI system, here's the complete end-to-end A0 integration:

### 1. CORE FILES — A0 Communication

**Primary Tool:**
- `/home/ser/.claude/PAI/Tools/AgentZero.ts` (426 lines)
  - REST API client for Agent Zero VPS instance
  - Runs on Bun (TypeScript runtime)
  - Primary interface between Navi (Claude Code) and A0

**Test Suite:**
- `/home/ser/.claude/hooks/tests/AgentZero.test.ts` (553 lines)
  - Comprehensive Bun test harness
  - Mock A0 server, event emission testing, async/sync patterns

### 2. HOW NAVI COMMUNICATES WITH A0

**AgentZero.ts API Commands:**

```bash
# Synchronous (blocks up to 5-10 minutes)
bun AgentZero.ts message "Your task here"              # Single sync message
bun AgentZero.ts message "Text" --context <ID>        # Continue existing conversation

# Asynchronous (fire-and-forget, <1s acknowledgment)
bun AgentZero.ts async "Long task"                    # Returns immediately with context_id

# Status & Control
bun AgentZero.ts health                               # Check A0 availability
bun AgentZero.ts log <context_id>                     # Get conversation history
bun AgentZero.ts status [context_id]                  # Poll for task progress
bun AgentZero.ts terminate <context_id>               # End conversation
bun AgentZero.ts poll                                 # Pull git results + show A0 reports

# Scheduler (cron-like tasks on A0)
bun AgentZero.ts scheduler list                       # Show all scheduled tasks
bun AgentZero.ts scheduler results                    # Show last run results
bun AgentZero.ts scheduler run "task description"     # Manually trigger task
```

**Communication Details:**
- Base URL: `http://72.56.86.51:50002` (VPS Docker container 2, production brain)
- Fallback: `http://72.56.86.51:50001` (Docker container 1, escape hatch for recovery)
- Authentication: `X-API-KEY: $A0_API_TOKEN` (stored in `~/.config/PAI/.env`)
- Endpoints used:
  - `/api_message` — sync messaging (POST, blocks up to 600s timeout)
  - `/message_async` — fire-and-forget (POST, <1s ack)
  - `/poll` — status polling with logs/progress
  - `/api_log_get` — retrieve conversation history
  - `/api_terminate_chat` — end session
  - `/scheduler_tasks_list` — list cron tasks
  - `/scheduler_task_run` — trigger ad-hoc task
  - `/health` — check server status

**Event Logging:**
- All A0 interactions emit to `~/.claude/MEMORY/STATE/events.jsonl`
- Event types: `a0.message_sent`, `a0.response`, `a0.async_sent`, `a0.async_delivered`
- Active context state saved to `~/.claude/MEMORY/STATE/a0-active-context.json`
- Pattern: §§include() macros in A0 responses indicate large output saved to A0 container

### 3. PAI-PERSONAL REPO SYNC

**GitHub Repository:**
- Public: `https://github.com/rikitikitavi2012-debug/PAI` (fork of Daniel Miessler's PAI)
- Private: `https://github.com/rikitikitavi2012-debug/PAI-personal` (A0 syncs here)
- Git remotes configured:
  - `private` → PAI-personal (A0 reads/writes to this)
  - `upstream` → original PAI repo
  - `origin` → fork

**Sync Workflow:**
1. A0 clones/pulls `PAI-personal` from GitHub
2. A0 executes tasks (code review, research, health checks)
3. A0 writes results to `MEMORY/STATE/` JSON files
4. A0 `git add -f`, commits, and pushes back to `private/master`
5. Navi polls via `bun AgentZero.ts poll` which runs `git pull --rebase private master`
6. Navi reads results from:
   - `health-report.json`
   - `telos-integrity.json`
   - `telos-progress.json`
   - `learning-patterns.json`
   - `memory-compaction-report.json`
   - `a0-comms-research.json`

### 4. A0-RELATED MEMORY & STATE FILES

**Active Context:**
- `/home/ser/.claude/MEMORY/STATE/a0-active-context.json` — Last message context_id for resuming conversations

**Research & Architecture:**
- `/home/ser/.claude/MEMORY/RESEARCH/2026-03/agent-zero-integration-plan.md` — Integration roadmap (9 coding integrations, priorities P1-P2)
- `/home/ser/.claude/MEMORY/STATE/a0-behavior-map.json` — A0 system prompts, settings, extensions, skills dump
- `/home/ser/.claude/MEMORY/STATE/a0-comms-research.json` — API endpoints, fire-and-forget patterns, polling architecture
- `/home/ser/.claude/MEMORY/STATE/a0-container-escape-hatch.md` — Recovery procedures via container 1 SSH access

**Configuration & Tasks:**
- `/home/ser/.claude/MEMORY/STATE/a0-scheduled-task-template-telos-integrity.json` — Weekly TELOS scan task template
- `/home/ser/.claude/MEMORY/STATE/a0-scheduler-cache.json` — Cached task list (fallback when A0 offline)
- `/home/ser/.claude/MEMORY/STATE/a0-tasks-created.json` — Audit trail of created scheduler tasks
- `/home/ser/.claude/MEMORY/STATE/a0-export/` — Backup of A0 skills (a0-deployer, the-algorithm, behaviour)

**Audit & Analysis:**
- `/home/ser/.claude/MEMORY/STATE/a0-comms-audit-2026-03-07.json` — Communication patterns audit
- `/home/ser/.claude/MEMORY/STATE/a0-events-analysis-2026-03-06.json` — Event stream analysis
- `/home/ser/.claude/MEMORY/STATE/a0-architecture-dump.json` — A0 internal architecture snapshot

### 5. INTEGRATION POINTS — WHERE A0 IS USED

**1. JulesAutoMerge Pipeline (PRIMARY)**
- File: `/home/ser/.claude/PAI/Tools/JulesAutoMerge.ts`
- Integration: Code review gate before auto-merging Jules PRs
- Process:
  1. Jules completes session → PR created
  2. Tests run in isolated worktree
  3. **A0 reviews diff** (parallel with Z.AI/Kimi review)
  4. If A0 finds HIGH severity → PR blocked with reason `a0_review_high`
  5. If all clear → auto-merge to `private`, `a0custom`, or manual review for `origin`
- Repos integrated:
  - `private` (rikitikitavi2012-debug/PAI-personal) — autoMerge: true
  - `a0custom` (rikitikitavi2012-debug/agent-zero-custom) — autoMerge: true
  - `origin` (rikitikitavi2012-debug/PAI) — autoMerge: false (A0 review only)
- Timeout: 120s for A0 review, fallback if unreachable

**2. Brigade Dashboard (MONITORING)**
- File: `/home/ser/.claude/config/kitty/scripts/brigade-watch.sh`
- Integration: Real-time health dashboard in Kitty terminal
- Displays:
  - A0 status (✅/⚠️/❌ with latency)
  - A0 scheduler tasks (live list, 5 most recent)
  - Container count from A0 health response
  - Fallback to cache if A0 offline
- Refresh: 30 seconds, polls `/health` and `/scheduler_tasks_list`
- Part of 7-member AI Brigade (Navi, A0, Jules, OpenCode, Gemini, VoiceServer, Z.AI)

**3. Brigade Audit Workflow (TELOS ANALYSIS)**
- File: `/home/ser/.claude/skills/Telos/Workflows/BrigadeAudit.md`
- Integration: Multi-model TELOS integrity audit
- A0 Role: External consultant (GLM-5 model, 200K context)
  - Clones PAI-personal repo
  - Analyzes `PAI/USER/TELOS/` for coherence, realism, gaps
  - Returns structured findings on contradictions, orphans, stale entries
  - Compares with Gemini and OpenCode perspectives for consensus
- Sync: Git push before audit, A0 pulls repo directly
- Timeout: 10 minutes (sync mode), async delivery for timeout

**4. HealthMonitor Integration Plan (PLANNED)**
- Concept: A0 scheduler task (hourly cron)
- Goal: Monitor all APIs (Claude, Gemini, A0, gh, VoiceServer)
- Results written to `MEMORY/STATE/health-report.json`

**5. Container Escape Hatch (RECOVERY)**
- File: `/home/ser/.claude/MEMORY/STATE/a0-container-escape-hatch.md`
- Mechanism: Container 1 (port 50001) has SSH access to docker host (172.18.0.1)
- Use when: Container 2 (production) unresponsive
- Commands:
  ```bash
  curl -s http://72.56.86.51:50001/api_message -H "X-API-KEY: $A0_API_TOKEN" \
    -d '{"message": "Run: ssh agentzero@172.18.0.1 docker restart agent-zero-2"}'
  ```
- Volume: `/a0` is ext4 mount (not ephemeral) — survives restarts

### 6. A0 CONFIGURATION & BEHAVIOR

**System Prompts (on A0):**
- Main: `agent.system.main.md` (composes 5 includes: role, environment, communication, solving, tips)
- Role: Autonomous JSON AI agent
- Environment: Kali Linux Docker container, /a0 folder, root access
- Communication: JSON response format with thoughts/headline/tool_name/tool_args
- Solving: 4-step framework (outline, check memory/skills, break into subtasks, solve/delegate)

**Custom Behavior (Russian-first):**
- All thoughts/reasoning in Russian
- User interactions in Russian
- Threshold tuning: 0.3 for memory recall (not 0.7) due to non-English text
- Context: Brigade member role, git as message bus, TELOS context from Navi

**14 Built-in Tools:**
1. `code_execution_tool` — Python/bash sandbox
2. `browser_agent` — browser-use (automated web navigation)
3. `call_subordinate` — delegate to sub-agents
4. `search_engine` — SearXNG (private search)
5. `document_query` — Q&A on documents/PDFs
6. `vision_load` — image analysis (OCR, UI screenshots)
7. `memory_*` — FAISS vector DB
8. `behaviour_adjustment` — runtime behavior tuning
9. `response` — response formatting
10. `input` — interactive prompts
11. `wait` — pause/rate limiting
12. `notify_user` — notifications
13. `a2a_chat` — agent-to-agent messaging
14. `scheduler:*` — cron scheduling

**9 Skills Available:**
1. `telos` — personal life management (TELOS sync from PAI)
2. `the-algorithm` — problem-solving framework
3. `a0-deployer` — infrastructure management
4. `chart-architect` — data visualization
5. `doc-forge` — document generation
6. `exa-synergy` — deep web research (Exa API)
7. `ops-commander` — remote DevOps
8. `replicate-studio` — AI media generation
9. `create-skill` — skill authoring

### 7. RECENT COMMITS (A0-related)

```
78a5414 feat(telos): add BrigadeAudit workflow
8930d30 feat(TELOS): brigade audit results applied
deb62d5 feat(brigade): A0 auto-recovery via container 1
5175edc feat(HealthMonitor): A0 auto-recovery escape hatch
67691ec feat(brigade): agent-zero-custom repo in JulesAutoMerge
934025c docs: A0 session patterns captured
79935d4 feat: A0 GitHub repo setup
```

### 8. KEY ARCHITECTURAL PATTERNS

**Fire-and-Forget vs Sync:**
- **Sync** (`/api_message`): Blocks up to 600s (10min), waits for completion
- **Async** (`/message_async`): Returns context_id in <1s, task continues in background
- **Pattern**: Use async for long tasks, poll with `/poll` endpoint

**Git as Message Bus:**
- A0 reads input context from PAI-personal repo
- A0 writes results back to repo
- Navi syncs via `git pull --rebase private master`
- Full audit trail in git history

**Context Persistence:**
- Each conversation has `context_id` (UUID-like)
- Navi saves active context to `a0-active-context.json`
- Can resume conversations with `--context <id>` flag
- Context lifetime: 1 hour (configurable in A0 settings)

**Multi-Model Brigade:**
- Navi (Claude Code) = architect/leader
- A0 (GLM-5) = 24/7 background agent
- Jules (async coder) = coding tasks
- OpenCode (headless) = alternative LLM
- Gemini = fast analysis
- Each agent has different strengths; sync for consensus

### 9. CURRENT STATUS (2026-03-13)

- **A0 Health**: Online (last verified in brigade-watch)
- **Last Active**: `bFqRPnyu` context (message about integration planning)
- **Repos Synced**: All 3 repos (private, origin, a0custom) integrated
- **JulesAutoMerge**: P1 feature, actively merging PRs with A0 code review
- **Brigade Audit**: Completed 2026-03-13 (multi-model TELOS scan with consensus)
- **Scheduler Tasks**: TELOS integrity scan template ready
- **Container Status**: Container 2 primary, container 1 escape hatch configured

---

**Files Summary (Absolute Paths):**

| Path | Purpose |
|------|---------|
| `/home/ser/.claude/PAI/Tools/AgentZero.ts` | Main A0 CLI tool (REST API client) |
| `/home/ser/.claude/hooks/tests/AgentZero.test.ts` | Test suite |
| `/home/ser/.claude/PAI/Tools/JulesAutoMerge.ts` | PR auto-merge with A0 code review gate |
| `/home/ser/.claude/config/kitty/scripts/brigade-watch.sh` | Dashboard showing A0 health |
| `/home/ser/.claude/skills/Telos/Workflows/BrigadeAudit.md` | A0-led TELOS audit workflow |
| `/home/ser/.claude/MEMORY/RESEARCH/2026-03/agent-zero-integration-plan.md` | Integration roadmap (9 tasks) |
| `/home/ser/.claude/MEMORY/STATE/a0-*` | 15+ A0-specific memory files |
| `~/.config/PAI/.env` | `A0_API_TOKEN` + `A0_BASE_URL` |
| `https://github.com/rikitikitavi2012-debug/PAI-personal` | Sync repo (A0 writes results here) |

The A0 integration is a production-ready system with code review gates, health monitoring, asynchronous task execution, and multi-model consensus auditing. It's designed as an autonomous 24/7 agent running on a VPS Docker container, communicating via REST API with git as the persistence layer.