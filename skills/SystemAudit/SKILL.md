---
name: SystemAudit
description: Deep PAI system audit with multi-agent analysis and upstream comparison. USE WHEN system audit, health check, check system, audit PAI, system health, compare upstream, sync check, what's broken, diagnose system.
compatibility:
  min_model: sonnet
---

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/SystemAudit/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

```bash
curl -s -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the WORKFLOWNAME workflow in the SystemAudit skill to ACTION"}' \
  > /dev/null 2>&1 &
```

# SystemAudit

**Deep multi-agent PAI system audit, health checks, and upstream synchronization.**

Comprehensive system integrity verification across 8 domains: hooks, skills, tools, memory, config, voice, security, and upstream compatibility.

## Workflow Routing

| Trigger | Workflow | Speed |
|---------|----------|-------|
| "audit", "full audit", "deep check", "check everything" | `Workflows/FullAudit.md` | ~2-4 min |
| "quick check", "health check", "is system ok", "status" | `Workflows/QuickCheck.md` | ~30 sec |
| "compare upstream", "sync check", "what's new upstream" | `Workflows/UpstreamSync.md` | ~1 min |

## CLI Tool

```bash
# Full deterministic audit (no AI, pure checks)
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts

# Specific domain only
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts --domain hooks
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts --domain skills
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts --domain security

# JSON output for piping
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts --json

# Quick mode (critical checks only)
bun ~/.claude/skills/SystemAudit/Tools/SystemAudit.ts --quick
```

## Reference

**All check categories:** Read `AuditChecks.md` for the complete check registry.
