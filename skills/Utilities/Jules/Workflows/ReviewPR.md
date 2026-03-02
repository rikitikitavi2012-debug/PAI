# ReviewPR Workflow

**Trigger:** "review jules PR", "jules PRs", "merge jules"

Review, approve, or merge PRs created by Jules.

## Steps

### 1. List Jules PRs

Find PRs authored by Jules on the target repo:

```bash
gh pr list --repo rikitikitavi2012-debug/PAI-personal --author "app/jules-google" --state open
```

If no results, also try:
```bash
gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --search "jules"
```

### 2. Show PR Details

For each PR, display:
- PR number, title, branch
- Created date
- File change summary

To get full diff for a specific PR:
```bash
gh pr diff NUMBER --repo rikitikitavi2012-debug/PAI-personal
```

To view PR details:
```bash
gh pr view NUMBER --repo rikitikitavi2012-debug/PAI-personal
```

### 3. Review Options

Present the user with options:

| Action | Command |
|--------|---------|
| View diff | `gh pr diff NUMBER --repo rikitikitavi2012-debug/PAI-personal` |
| Approve | `gh pr review NUMBER --repo rikitikitavi2012-debug/PAI-personal --approve` |
| Request changes | `gh pr review NUMBER --repo rikitikitavi2012-debug/PAI-personal --request-changes --body "feedback"` |
| Merge | `gh pr merge NUMBER --repo rikitikitavi2012-debug/PAI-personal --squash` |
| Close | `gh pr close NUMBER --repo rikitikitavi2012-debug/PAI-personal` |

### 4. Review the Diff

Before recommending merge, ALWAYS review the diff:

1. Read the full diff with `gh pr diff`
2. Check for:
   - Code quality and correctness
   - Test coverage (did Jules write tests?)
   - No unintended changes
   - Follows PAI conventions (TypeScript, bun, TitleCase)
   - No secrets or personal data exposed
3. Summarize findings for the user

### 5. Post-Merge Sync

After merging a Jules PR, sync locally:

```bash
cd ~/.claude && git fetch private && git pull private master
```

Or if in a worktree:
```bash
git fetch private && git merge private/master
```

## Intent-to-Action Mapping

| User Says | Action |
|-----------|--------|
| "review", "show", "check" | List PRs + show diffs |
| "approve" | Approve specific PR |
| "merge", "accept" | Merge specific PR |
| "reject", "close" | Close specific PR |
| "merge all" | Review each, merge approved ones |
