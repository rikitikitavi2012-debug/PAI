# BatchDelegate Workflow

**Trigger:** "batch jules", "jules batch", "delegate batch"

Create multiple Jules sessions in parallel for batch task delegation.

## Steps

### 1. Extract Task List

Parse tasks from the user's request. Accepted formats:

**Inline list:**
```
batch jules:
- add tests for EventLogger hook
- add tests for WisdomSync hook
- fix typos in SKILL.md files
```

**From file:**
```
batch jules from ~/tasks.txt
```

File format: one task per line, lines starting with `#` are comments, empty lines ignored.

### 2. Validate Tasks

For each task:
- Ensure prompt is non-empty
- Ensure prompt is under 4000 characters
- Report total count to user before proceeding

Ask for confirmation:
```
Found N tasks to delegate. Proceed? (y/n)
```

### 3. Create Sessions in Parallel

For each task, run the create command:

```bash
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts create "TASK_PROMPT"
```

Run all creates sequentially (Jules API may rate-limit parallel requests). Add a 1-second delay between calls if creating more than 5 sessions.

### 4. Report Results

Show a progress table:

```
#  | Status | Title                                        | Session ID
---|--------|----------------------------------------------|------------------
1  | OK     | Add tests for EventLogger hook                | sessions/abc123
2  | OK     | Add tests for WisdomSync hook                 | sessions/def456
3  | FAIL   | Fix typos in SKILL.md files                   | (rate limited)
```

### 5. Summary

Report:
- Total tasks: N
- Successfully created: M
- Failed: N-M (with error details)
- Suggest: "Run `jules status` to monitor progress"

## Guardrails

- **Maximum batch size:** 10 tasks per batch (ask user to split larger batches)
- **Rate limiting:** 1-second delay between creates if batch > 5
- **Confirmation required:** Always confirm before creating sessions
- **Repo consistency:** All tasks in a batch target the same repo/branch unless explicitly varied
