# Status Workflow

**Trigger:** "jules status", "check jules", "jules sessions"

Check the status of Jules sessions.

## Steps

### 1. Determine Filter

From user's request, determine the filter:

| User Says | Filter |
|-----------|--------|
| "active", "running", "in progress" | `IN_PROGRESS` |
| "completed", "done", "finished" | `COMPLETED` |
| "all", "everything", (default) | (no filter) |

### 2. List Sessions

```bash
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions [FILTER]
```

Examples:
```bash
# All sessions
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions

# Only in-progress
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions IN_PROGRESS

# Only completed
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions COMPLETED
```

### 3. Get Details (Optional)

If the user asks about a specific session:

```bash
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts status SESSION_ID
```

This returns full JSON with:
- Session state
- Title and prompt
- Source context (repo, branch)
- Created/updated timestamps
- Plan details (if available)

### 4. Present Results

Format output as a table:

```
State     | Title                                                        | Session ID
----------|--------------------------------------------------------------|------------------
IN_PROG   | Add unit tests for EventLogger                               | sessions/abc123
COMPLETED | Fix race condition in WisdomSync                             | sessions/def456
```

### 5. Suggest Next Actions

Based on state:
- **IN_PROGRESS**: "Check back later or send a message with `jules message <id>`"
- **COMPLETED**: "Review the PR with `review jules PRs`"
- **PAUSED**: "Session needs input -- approve plan or send message"
