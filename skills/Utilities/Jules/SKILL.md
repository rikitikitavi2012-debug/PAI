---
name: Jules
description: Delegate async coding tasks to Google Jules AI agent. Create tasks, monitor sessions, review PRs, batch delegate. USE WHEN jules, delegate to jules, async task, background coding, maintenance task, write tests jules, jules PR, review jules, jules status, batch tasks jules.
---

# Jules -- Async Coding Task Delegation

Delegate coding tasks to Google Jules AI for asynchronous background execution. Jules works on your repos independently, creates PRs, and reports back.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/Jules/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the Jules skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **Jules** skill to ACTION...
   ```

**Full documentation:** `~/.claude/PAI/THENOTIFICATIONSYSTEM.md`

## Core Paths

- **Tool:** `${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts`
- **API Key:** `~/.config/PAI/.env` (JULES_API_KEY)
- **Default Repo:** `rikitikitavi2012-debug/PAI-personal` (private)
- **Default Branch:** `master`

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **CreateTask** | "delegate to jules", "jules task", "send to jules" | `Workflows/CreateTask.md` |
| **Status** | "jules status", "check jules", "jules sessions" | `Workflows/Status.md` |
| **ReviewPR** | "review jules PR", "jules PRs", "merge jules" | `Workflows/ReviewPR.md` |
| **BatchDelegate** | "batch jules", "jules batch", "delegate batch" | `Workflows/BatchDelegate.md` |

## Examples

**Example 1: Delegate a task**
```
User: "delegate to jules: add unit tests for the EventLogger hook"
-> Invokes CreateTask workflow
-> Calls Jules API to create session with prompt
-> Returns session ID, title, and status
```

**Example 2: Check status**
```
User: "jules status"
-> Invokes Status workflow
-> Lists all sessions with state indicators
-> Shows IN_PROGRESS, COMPLETED, PAUSED sessions
```

**Example 3: Review Jules PRs**
```
User: "review jules PRs"
-> Invokes ReviewPR workflow
-> Lists PRs from jules[bot] on PAI-personal
-> Shows diffs, allows approve/merge/request changes
```

**Example 4: Batch delegate**
```
User: "batch jules: add tests for hooks A, B, C"
-> Invokes BatchDelegate workflow
-> Creates 3 parallel Jules sessions
-> Shows progress table with all session IDs
```

## Quick Reference

- **Runtime:** Bun + TypeScript
- **API:** Jules REST API v1alpha (`jules.googleapis.com`)
- **Auth:** `X-Goog-Api-Key` header from `JULES_API_KEY`
- **Default mode:** `AUTO_CREATE_PR` (Jules creates PR automatically)
- **Session states:** `IN_PROGRESS`, `COMPLETED`, `PAUSED`, `FAILED`

## Tool CLI Reference

```bash
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts sources              # List connected repos
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts sessions [filter]    # List sessions
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts create "prompt"      # Create task
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts status <id>          # Session details
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts approve <id>         # Approve plan
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts message <id> "msg"   # Send message
```

**Env overrides:**
- `JULES_REPO` -- override default repo source path
- `JULES_BRANCH` -- override default branch
