# Investigate hook error root cause

**Agent:** Engineer
**Captured:** 2026-03-15T22:25:36+03:00
**Tool Use ID:** toolu_01UfoBGNJGCuyzzaxJfvPbsG
**Tokens:** 80553
**Duration:** 435s
**Source:** PostToolUse hook capture

---

Now I have the complete picture. Let me compile the definitive report.

Here is the comprehensive bug analysis:

---

## ROOT CAUSE ANALYSIS: "PreToolUse:Write/Edit hook error"

### PRIMARY BUG: Deprecated JSON Output Format (Both Hooks)

Both hooks use the **deprecated** top-level `decision` field for PreToolUse output. According to the Claude Code documentation (as of v2.1.76):

> PreToolUse previously used top-level `decision` and `reason` fields, but these are **deprecated for this event**. Use `hookSpecificOutput.permissionDecision` and `hookSpecificOutput.permissionDecisionReason` instead.

**SecurityValidator.hook.ts** uses the deprecated format in 3 places:
- **Line 518-521**: `{"decision": "ask", "message": "..."}` (Bash confirm)
- **Line 610-613**: `{"decision": "ask", "message": "..."}` (path confirmWrite)
- **Line 652-655**: `{"decision": "ask", "message": "..."}` (content confirm)

**LearnGate.hook.ts** uses the deprecated format in 1 place:
- **Line 94-97**: `{"decision": "block", "reason": "..."}` (block phase:complete without LEARN.md)

The **correct** format for PreToolUse is:
```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "reason text"
  }
}
```

Where the mapping is: `"block"` -> `"deny"`, `"ask"` -> `"ask"`, `"approve"` -> `"allow"`.

**However**, the deprecated format might still work (backward compat). This alone may not explain "every time" errors. Let me check the second issue:

### SECONDARY BUG: `console.error()` Writes to Stderr (SecurityValidator)

Claude Code documentation states:
> **Any other exit code** (not 0, not 2): stderr is shown in verbose mode. Execution continues.
> **Exit 0**: stderr shown in verbose mode only.

SecurityValidator writes to stderr even on normal (exit 0) paths via `console.error()`:

1. **Line 134**: `console.error('Warning: Failed to log security event')` -- fires if `logSecurityEvent()` can't write to `MEMORY/SECURITY/` directory. This writes to stderr on exit 0.

2. **Line 316**: `console.error('Failed to parse ${patternsSource} patterns:', error)` -- fires if patterns.yaml parsing fails. Writes to stderr on exit 0.

3. **Lines 535-536**: `console.error('[PAI SECURITY] ALERT: ...')` -- fires on alert-level Bash commands. Writes to stderr AND stdout on exit 0.

4. **Lines 555, 564**: `process.stderr.write('[SecurityValidator] error description: ...')` -- fires if any content pattern regex is invalid.

5. **Line 741**: `process.stderr.write('[SecurityValidator] stdin parse error...')` -- fires on malformed stdin JSON.

6. **Line 774**: `process.stderr.write('[SecurityValidator] CRITICAL: main() crashed...')` -- fires on any unhandled error.

While the docs say stderr on exit 0 is only shown in verbose mode, the UI message "PreToolUse:Write hook error" strongly suggests Claude Code **does** treat stderr output as reportable, at least as a warning in the transcript.

### TERTIARY BUG: `process.exit(0)` Before Stdout Flush

There is a potential race condition in both hooks. `console.log()` is asynchronous in Node.js/Bun -- it may not flush to stdout before `process.exit(0)` terminates the process.

**SecurityValidator.hook.ts** -- the pattern is:
```typescript
console.log(JSON.stringify({ continue: true }));
process.exit(0);  // May kill process before stdout is flushed
```

This appears on lines: 729-730, 734-735, 742-743, and many others.

**LearnGate.hook.ts** -- same pattern:
```typescript
console.log(CONTINUE);
process.exit(0);  // Same flush race
```

This appears on lines: 44-45, 50-51, 59-60, 83-84.

If `process.exit(0)` fires before `console.log()` flushes stdout, Claude Code receives **empty stdout** with exit code 0. Per the docs, this would be treated as a "JSON validation failed" non-blocking error -- the action proceeds, but an error message appears.

**My testing shows this does NOT reproduce consistently** in manual testing (piped stdin closes fast), but under Claude Code's process management (which may not close stdin immediately or may have different buffering), the race window could be larger.

### COMPLETE INVENTORY OF ERROR PATHS

#### SecurityValidator.hook.ts

| Line | Type | Trigger | Severity |
|------|------|---------|----------|
| 134 | `console.error()` on exit 0 | `logSecurityEvent()` write failure | stderr on success path |
| 316 | `console.error()` on exit 0 | patterns.yaml parse failure | stderr on success path |
| 502-504 | `console.error()` + `process.exit(2)` | Bash blocked pattern | Intentional block |
| 535-536 | `console.error()` on exit 0 | Bash alert pattern | stderr on success path |
| 555 | `process.stderr.write()` on exit 0 | Invalid content blocked regex | stderr on success path |
| 564 | `process.stderr.write()` on exit 0 | Invalid content confirm regex | stderr on success path |
| 594-596 | `console.error()` + `process.exit(2)` | Path zeroAccess block | Intentional block |
| 637-639 | `console.error()` + `process.exit(2)` | Content blocked pattern | Intentional block |
| 687-689 | `console.error()` + `process.exit(2)` | Read path zeroAccess block | Intentional block |
| 741 | `process.stderr.write()` on exit 0 | stdin JSON parse error | stderr on success path |
| 774 | `process.stderr.write()` on exit 0 | main() uncaught exception | stderr on success path |
| 518-521 | Deprecated JSON format | Bash confirm pattern | Wrong output format |
| 610-613 | Deprecated JSON format | Path confirmWrite | Wrong output format |
| 652-655 | Deprecated JSON format | Content confirm | Wrong output format |
| All `process.exit(0)` after `console.log` | Stdout flush race | Every successful path | Potential empty stdout |

#### LearnGate.hook.ts

| Line | Type | Trigger | Severity |
|------|------|---------|----------|
| 94-97 | Deprecated JSON format | Block phase:complete without LEARN.md | Wrong output format |
| All `process.exit(0)` after `console.log(CONTINUE)` | Stdout flush race | Every path | Potential empty stdout |

#### prd-utils.ts (parseFrontmatter import)

| Risk | Assessment |
|------|------------|
| Module resolution failure | **Not a risk** -- verified that `import { parseFrontmatter } from './lib/prd-utils'` resolves correctly |
| parseFrontmatter throws | **Not a risk** -- pure regex + string ops, no throws possible |

### RECOMMENDED FIXES

**Fix 1: Update JSON output format (both hooks)**

Replace deprecated `{"decision": "ask/block"}` with correct `hookSpecificOutput`:

```typescript
// SecurityValidator - lines 518-521, 610-613, 652-655
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason: `[PAI SECURITY] ${result.reason}`
  }
}));

// LearnGate - lines 94-97
console.log(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: `LEARN phase requires persistence...`
  }
}));
```

**Fix 2: Replace `console.log` + `process.exit(0)` with `process.stdout.write` + flush guarantee**

```typescript
// Instead of:
console.log(CONTINUE);
process.exit(0);

// Use:
process.stdout.write(CONTINUE + '\n', () => process.exit(0));
```

Or alternatively, remove all `process.exit(0)` calls and let the event loop drain naturally (the `clearTimeout` + `reader.cancel()` should allow this).

**Fix 3: Remove console.error on exit-0 paths (SecurityValidator)**

Replace `console.error()` calls on non-blocking paths with either:
- Silent operation (no stderr)
- Or use `process.stderr.write()` only if you intentionally want verbose-mode logging

Specifically line 134 (`logSecurityEvent` failure) should be silent since the doc comment already says "should not block operations."

---

**Files requiring changes:**
- `/home/ser/.claude/hooks/SecurityValidator.hook.ts` (lines 134, 316, 518-521, 535-536, 555, 564, 610-613, 652-655, and all `process.exit(0)` sites)
- `/home/ser/.claude/hooks/LearnGate.hook.ts` (lines 94-97, and all `process.exit(0)` sites)