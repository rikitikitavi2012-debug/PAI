# Security Audit of Hooks

## Methodology

Performed a security review of 30 `.hook.ts` files in the `hooks/` directory.

The review checked for:
- Command injection vulnerabilities
- Path traversal
- Unsafe file operations
- Missing input validation
- Hardcoded secrets
- Unsafe `eval()` / `Function()`

## Findings

### 1. `hooks/SessionAutoName.hook.ts`
- **Risk Level**: HIGH
- **Finding**: Command injection vulnerability in `Bun.spawnSync(['find', projectsDir, '-maxdepth', '2', '-name', \`\${sessionId}.jsonl\`])`. If `sessionId` contains invalid characters or escapes, it might manipulate the `find` command. Additionally, `sessionId` is directly injected into shell scripts (`session-name-cache.sh`) without sanitization:
  ```typescript
  // Line 354:
  const cacheContent = \`cached_session_id='\${sessionId}'\\ncached_session_label='\${label}'\\n\`;
  ```
  If `sessionId` or `label` contains a single quote `'`, it will allow shell command injection when `session-name-cache.sh` is sourced.
- **Recommended Fix**: Ensure `sessionId` and `label` are sanitized before interpolating them into a shell script. In `session-name-cache.sh`, we should escape single quotes in `sessionId` and `label`. We should also validate that `sessionId` is alphanumeric + dashes to prevent directory traversal or unexpected arguments in `find`.

### 2. `hooks/WorktreeCreate.hook.ts`
- **Risk Level**: MEDIUM
- **Finding**: The `name` parameter from JSON input is directly used in `mkdirSync` and `Bun.spawn` as a branch name.
  ```typescript
  // Line 57
  const name = input.name || \`wt-\${Date.now()}\`;
  // Line 60
  const worktreePath = join(worktreesDir, name);
  ```
  A malicious or unexpected `name` containing `../` could cause `worktreePath` to point outside the `.claude/worktrees` directory (path traversal). Furthermore, `git worktree add -b name` could execute unexpected git behavior if `name` starts with `-`.
- **Recommended Fix**: Add a regex validation check for `name` (e.g. `^[a-zA-Z0-9-_]+$`) to ensure it is a safe directory and branch name, and cannot perform path traversal or act as a flag.

### 3. `hooks/WorktreeRemove.hook.ts`
- **Risk Level**: LOW
- **Finding**: `input.worktree_path` is passed into `Bun.spawn` for `git worktree remove`. While the spawn array format protects against shell injection, passing an arbitrary path to `git worktree remove` could remove unintended worktrees if it's outside the `.claude/worktrees` directory. However, since the only action is to call `git worktree remove` and `git branch -D`, the impact is limited to removing branches and git worktrees.
- **Recommended Fix**: Validate that `worktreePath` resides inside `.claude/worktrees` directory before executing the removal.

### General Observations
- No `eval()` or `new Function()` usages were found in the hooks directory.
- `SecurityValidator.hook.ts` was not modified during the audit, as per instructions.
- File operations generally rely on paths rooted in `getPaiDir()` and avoid directly trusting `input.cwd` or other unvalidated paths.
- Most subprocesses use `Bun.spawn` or `spawnSync` with arrays, avoiding string interpolation-based shell injection.
