# Frame: Workflow Domain

## Meta
- **Domain:** workflow
- **Confidence:** 75%
- **Observation Count:** 30
- **Last Crystallized:** 2026-03-07
- **Source:** Converted from workflow.json

---

## Core Principles

### Ivan предпочитает MVP сначала, идеальное потом — YAGNI принцип активен [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

---

## Contextual Rules

- Задачи в конце дня нужно батчить — не прерывать deep work мелочами (learned 2026-02-22)
- Ivan uses autonomous loop mode with explicit verification criteria (EXISTS, grep, wc) — prefers measurable, checkable outcomes over subjective validation (learned 2026-02-25)
- Ivan cross-references upstream repos (Daniel Miessler's PAI) to distinguish own bugs vs. community issues before committing fixes (learned 2026-02-25)
- Ivan prefers automatic pattern detection over manual selection — dislikes remembering tool names/options, wants PAI to infer context and apply solutions natively (learned 2026-02-26)
- Ivan delegates audits to 3-4 parallel agents by functional/dependency domain, then consolidates and verifies findings before fixing (learned 2026-02-26)
- Ivan systematically audits subsystems he identifies as problematic — finds one issue, then audits entire subsystem for related problems (learned 2026-02-26)
- Ivan conducts multi-pass audits with explicit criteria checklists (ISC) — verifies each criteria with grep/spot-checks before considering work complete (learned 2026-02-26)
- Ivan audits parallel code paths (template vs function) by building diffs immediately—catches bugs others miss (learned 2026-02-26)
- Ivan compresses PAI phases when time-budgeted—combines THINK+PLAN, uses inline scripts for rapid data validation (learned 2026-02-26)
- Ivan prefers parallel task execution — asks Navi to launch multiple independent agents simultaneously rather than sequential fixes (learned 2026-02-27)
- Ivan plans multi-phase validation: combat test skill → audit related skill (Telos) → fix issues → update documentation, not just point fixes (learned 2026-02-27)
- Ivan asks 'what did this give us' after major audit cycles — wants concrete impact assessment, not just completion (learned 2026-02-27)

---

## Predictive Model

| Request Pattern | Predicted Want | Confidence |
|----------------|---------------|------------|
| After completing a multi-level audit, Ivan will ask 'should we commit now or is there more work for next session?' to close the loop | To be refined | 60% |
| After fixing bugs in one skill (Telos), Ivan immediately asks to audit all other skills for similar issues | To be refined | 60% |

---

## Anti-Patterns (from observations)

### When Ivan brings data from previous sessions — verify against current state FIRST before acting, old analyses can be stale
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-22

### Выполнение 3+ независимых задач последовательно вместо параллельного делегирования агентам — потеря времени в 3-5x. Всегда спавнить агентов для параллельной работы.
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26

### Ivan struggles with visual/interactive features (image insertion, text pasting in Kitty) — prefers text-based CLI explanations over live demos
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26

### Ivan discovers phantom file references through systematic audits, then maps them to real equivalents—reverse-engineer intent before deleting
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-27

### Parallel worktree agents on dirty main tree create reconciliation overhead — needs explicit merge strategy before spawning agents
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-27

### Ivan verifies Navi's research thoroughly before proceeding — catches incomplete data gathering (e.g., 'did you read the actual code?')
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-28


---

## Brigade Work Pattern (crystallized 2026-03-06) [CRYSTAL: 90%]

**Pattern: Git-as-Message-Bus for multi-agent collaboration**
- Navi (architect) delegates to Jules (async coder) and A0 (24/7 researcher/DevOps)
- All agents write structured JSON results to `MEMORY/STATE/` and git push
- LoadContext auto-pulls at session start → Brigade Briefing shows action items
- Key insight: `/message_async` requires CSRF (web session) — NOT usable with API key! Use `/api_message` with 30s timeout for fire-and-forget
- Key insight: `.gitignore` blocks `MEMORY/STATE/*.json` — A0 must use `git add -f`
- Scheduled tasks (A0) = autonomous maintenance loop: 8 tasks (health, TELOS, learning, compaction, intel, security, sync, snapshot)
- Jules best for: tests, mechanical refactoring, lint fixes (93% success rate)
- A0 best for: deep analysis, contradictions, scheduled maintenance, code review (24/7)
- Result: 22 TELOS issues found, 5 scheduled tasks running, 3 PRs merged in one session

## A0 Operational Knowledge (crystallized 2026-03-06) [CRYSTAL: 85%]

**Pattern: Know your subordinate's architecture to delegate effectively**
- A0 v0.9.8.2: 20 tools, 4 subordinate profiles, 8 skills, 8 scheduled tasks
- LLM stack: GLM-5 (chat, 200K ctx), kimi-k2.5 (utility), claude-opus-4-6 (browser)
- **Subordinate profiles** — use `call_subordinate` with profile for specialization:
  - `developer`: coding, debugging, architecture
  - `researcher`: data collection, reports, analysis
  - `hacker`: pentesting, security audit, vulnerability scan
  - `default`: general tasks
- When delegating to A0: specify which subordinate profile to use for best results
- **FAISS memory threshold: 0.3 for Russian** (default 0.7 misses Russian text!)
- A0 can self-manage scheduler tasks via `scheduler:create_scheduled_task`
- Context sync: Variant A (minimal) — TELOS lives only in Navi, A0 gets context per-task
- Extensions: 20 Python hook types for lifecycle events (agent_init → error_format)
- Architecture dump: `MEMORY/STATE/a0-architecture-dump.json` (full reference)

## A0 Delegation Patterns (crystallized 2026-03-06) [CRYSTAL: 85%]

**Pattern: Effective subordinate delegation to A0**
- Always specify subordinate profile: "делегируй researcher/developer/hacker субагенту"
- Include TELOS context (M#, G#, S#) with every task — A0 uses it for alignment
- Specify output format: JSON path + structure + git push instructions
- A0 can NOT access local WSL files — only VPS filesystem and git repo
- Files in .gitignore are invisible to A0 — push or send content inline
- Chain subordinates for complex tasks: researcher → developer (data → code)
- Async pattern: /api_message + 30s timeout, check results via git fetch later
- Research tasks take 3-5 min, code review 2-3 min, chains 5-8 min
- Always end task with "git add -f, commit, push" — A0 forgets without explicit instruction

## A0 Chat Streaming (crystallized 2026-03-06) [CRYSTAL: 90%]

**Pattern: TUI live chat with A0 via polling /api_log_get**
- A0 uses Socket.IO for web UI (Same-Origin only — NOT usable externally)
- External access: `/api_log_get` with X-API-KEY header — only option for TUI
- Polling every 3s, incremental (track `items[].no`, fetch only new)
- Log item types: user, response, agent, code_exe, tool, util
- **Critical**: `response` type — show `.content` (actual answer), NOT `.heading` ("A0: Responding")
- **Critical**: `heading` has `icon://` prefix — strip before display
- **Critical**: `agent` heading duplicates "A0: " — strip agent prefix
- Clean mode: show user + response + meaningful agent thoughts only
- Verbose mode: all types including internal tool calls
- Full API reference: `MEMORY/RESEARCH/2026-03/a0-streaming-api.md`

## Cross-Frame Connections

*To be discovered through cross-frame synthesis.*

---

## Evolution Log
- 2026-03-01: Frame created from workflow.json (21 observations)


- 2026-03-05: [anti-pattern] Frustrated with repeated index.lock failures
- 2026-03-05: [anti-pattern] Frustration over repeated failed attempts on same issue
- 2026-03-05: [anti-pattern] Frustrated by repeated failed attempts across sessions
- 2026-03-05: [anti-pattern] Frustrated — expected live event display not visible
- 2026-03-05: [principle] Strong approval — concise satisfaction with completed work
- 2026-03-06: [principle] High trust, ambitious vision, wants excellence
- 2026-03-06: [principle] Praised UI/UX concept and Navi's improvement on TUI tasks
- 2026-03-06: [anti-pattern] Frustrated with duplicate header and display issues in chat
- 2026-03-07: [anti-pattern] Frustrated — A0 broke after restart, needs diagnosis