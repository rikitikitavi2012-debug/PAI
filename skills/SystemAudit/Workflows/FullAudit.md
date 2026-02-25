# Full Audit Workflow

**Mode:** Multi-agent parallel audit across 8 domains | **Time:** ~2-4 min

## When to Use

- "audit", "full audit", "deep check", "check everything"
- Periodic system health verification
- Before starting major product work
- After PAI upgrades or significant changes

## Workflow

### Step 1: Run Deterministic CLI Tool

**FIRST, always run the CLI tool for instant baseline:**

```bash
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts
```

This gives you 21 deterministic checks in seconds — no AI needed.

### Step 2: Launch Parallel Agent Auditors (4 agents)

Based on CLI results, launch 4 Explore agents in parallel to deep-dive areas the CLI can't check (dead code analysis, pattern smells, architectural issues):

**Agent 1 — Hooks & Config Deep Dive:**
```
TASK: Deep audit of ~/.claude/hooks/ and ~/.claude/settings.json
- Read EVERY .hook.ts file. Find: dead code, unused imports, inconsistent patterns,
  hardcoded values that should be dynamic, missing error handling.
- Read settings.json thoroughly. Find: stale configs, unused keys, inconsistencies
  between what's configured and what's actually used.
- Check hooks/lib/ and hooks/handlers/ for unused modules.
- Cross-reference hook imports with lib/ exports — find dead exports.
OUTPUT: Structured findings list with file:line references.
EFFORT: Return within 90 seconds.
```

**Agent 2 — Skills & Tools Deep Dive:**
```
TASK: Deep audit of ~/.claude/skills/ and ~/.claude/skills/PAI/Tools/
- Compare skill-index.json entries with actual SKILL.md content per skill.
- Find skills with missing workflows, empty tools dirs, broken references.
- Check PAI/Tools/*.ts — find tools never referenced by any hook/skill/workflow.
- Look for duplicate functionality between tools.
- Check for hardcoded paths, API keys, deprecated patterns.
OUTPUT: Structured findings list with evidence.
EFFORT: Return within 90 seconds.
```

**Agent 3 — Memory & Learning Pipeline:**
```
TASK: Deep audit of ~/.claude/MEMORY/ system
- WORK/: Check each session dir for actual artifacts vs auto-generated empty shells.
- LEARNING/: Verify ratings.jsonl integrity (valid JSON per line), check SYNTHESIS/
  for recent reports, check REFLECTIONS/ for algorithm reflections.
- WISDOM/: Read domain files, check observation quality and freshness.
- RELATIONSHIP/: Verify structure, check for recent entries.
- SECURITY/: Count logs, check for excessive duplicates.
- RESEARCH/: Check for stale research artifacts.
OUTPUT: Health report with specific metrics and anomalies.
EFFORT: Return within 90 seconds.
```

**Agent 4 — Security & Voice:**
```
TASK: Security and voice system audit of ~/.claude/
- Scan ALL .ts files under hooks/ and skills/PAI/Tools/ for hardcoded API keys,
  tokens, passwords (regex: patterns with 20+ char hex/base64 strings).
- Check .gitignore completeness — does it cover all sensitive paths?
- Check file permissions on settings.json, .env files.
- Test voice server: curl localhost:8888, check response.
- Read hooks/lib/output-validators.ts — verify Cyrillic support in ALL regex patterns.
- Check VoiceServer/server.ts for known issues.
OUTPUT: Security findings with severity ratings.
EFFORT: Return within 90 seconds.
```

### Step 3: Synthesize Findings

Merge CLI results + agent findings:

1. **Deduplicate** — agents may find same issues as CLI
2. **Prioritize** — CRITICAL > HIGH > MEDIUM > LOW
3. **Group by domain** — present organized by the 8 audit domains
4. **Actionable** — each finding must have a concrete fix recommendation

### Step 4: Present Report

```markdown
# PAI System Audit Report
**Date:** YYYY-MM-DD | **Duration:** Xs

## CLI Results (Deterministic)
[Paste CLI output]

## Deep Findings (Agent Analysis)

### CRITICAL (fix now)
1. [finding with file:line and fix]

### HIGH (fix soon)
1. [finding with evidence and fix]

### MEDIUM (cleanup)
1. ...

### LOW (nice to have)
1. ...

## System Health Score
[X/10 based on findings distribution]

## Recommended Actions
1. [Prioritized fix list]
```

### Step 5: Offer to Fix

Ask user: "Исправить найденные проблемы? Все / Только критичные / Выбрать"
