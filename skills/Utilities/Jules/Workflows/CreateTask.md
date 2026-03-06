# CreateTask Workflow

**Trigger:** "delegate to jules", "jules task", "send to jules"

Create a new Jules session to delegate an async coding task.

## Steps

### 1. Extract Task Details

From the user's request, extract:
- **Prompt**: The coding task description (REQUIRED)
- **Repo**: Target repository (default: `PAI-personal`)
- **Branch**: Starting branch (default: `master`)
- **Mode**: Automation mode (default: `AUTO_CREATE_PR`)

If the prompt is vague, ask the user to clarify before proceeding.

### 2. Load API Key

Verify `JULES_API_KEY` exists in `~/.config/PAI/.env`:

```bash
grep "JULES_API_KEY" ~/.config/PAI/.env > /dev/null 2>&1 || echo "ERROR: JULES_API_KEY not found"
```

### 3. Create Session

Run the Jules API tool:

```bash
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts create "TASK_PROMPT_HERE"
```

**Override repo/branch if needed:**
```bash
JULES_REPO="sources/github/OWNER/REPO" JULES_BRANCH="branch-name" \
  bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts create "TASK_PROMPT_HERE"
```

### 4. Report Result

Output the session details:
- Session name/ID
- Title
- State
- Next steps (check status, approve plan when ready)

### 5. Prompt Engineering Tips

When constructing the task prompt for Jules:
- Be specific about file paths and what to change
- Include acceptance criteria
- Mention test requirements if any
- Reference specific patterns or conventions to follow
- Keep under 4000 characters for best results

## Intent-to-Flag Mapping

| User Says | Env/Flag | Effect |
|-----------|----------|--------|
| "on PAI-personal" | (default) | Uses default PAI-personal repo |
| "on repo X" | `JULES_REPO=sources/github/owner/X` | Targets different repo |
| "on branch X" | `JULES_BRANCH=X` | Starts from different branch |
| "don't auto-PR" | Modify automationMode in tool | Manual PR mode |
