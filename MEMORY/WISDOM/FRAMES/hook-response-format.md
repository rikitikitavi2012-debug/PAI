---
domain: development
confidence: 95
source: "PreToolUse hook error fix — 2026-03-16"
---

# Claude Code Hook Response Format

PreToolUse hooks MUST use the correct response format:
- **Allow:** `{"continue": true}` or exit 0 with no output
- **Ask/Confirm:** `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"ask","permissionDecisionReason":"..."}}`
- **Deny:** `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"..."}}`
- **Hard block:** exit(2) with stderr message

**NEVER use `{"decision":"ask","message":"..."}` — Claude Code does not recognize this format and shows "hook error".**

This format mismatch caused persistent "PreToolUse:Edit hook error" for months (Feb-Mar 2026), surviving multiple "fix" attempts that addressed wrong root causes (stdin sharing, permissions, etc.).
