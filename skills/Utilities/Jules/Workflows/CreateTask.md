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

Run the Jules API tool. It auto-detects the repo from git remote in cwd:

```bash
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts create "TASK_PROMPT_HERE"
```

**Override repo explicitly (short or full form):**
```bash
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts create --repo rikitikitavi2012-debug/timber-frame-site "TASK_PROMPT_HERE"
bun ${CLAUDE_SKILL_DIR}/Tools/JulesAPI.ts create --repo owner/repo --branch dev "TASK_PROMPT_HERE"
```

**Resolution order:** `--repo` flag > `JULES_REPO` env > git remote auto-detect > PAI-personal default

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

| User Says | Flag/Env | Effect |
|-----------|----------|--------|
| "on PAI-personal" | (default) | Uses default PAI-personal repo |
| "on timber-frame-site" | `--repo rikitikitavi2012-debug/timber-frame-site` | Targets TF site repo |
| "on repo X" | `--repo owner/X` | Targets any repo (short form OK) |
| "on branch X" | `--branch X` | Starts from different branch |
| (run from project dir) | (auto-detect) | Reads git remote, resolves repo automatically |
| "don't auto-PR" | Modify automationMode in tool | Manual PR mode |
