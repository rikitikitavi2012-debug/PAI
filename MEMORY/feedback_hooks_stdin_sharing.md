---
name: Hooks stdin sharing — один хук на matcher entry
description: Множественные хуки в одном hooks[] массиве делят stdin pipe. Второй хук получает 0 bytes. Каждый хук = отдельный matcher entry.
type: feedback
---

НИКОГДА не ставить 2+ хука в один `hooks[]` массив одного matcher entry если оба читают stdin.

**Why:** Claude Code пайпит stdin в первый хук. Второй хук получает 0 bytes потому что stdin pipe уже прочитан первым. Это вызывает "PreToolUse:Edit hook error" на каждый Edit/Write. Обнаружено при добавлении LearnGate рядом с SecurityValidator в один matcher.

**How to apply:**
```json
// WRONG — второй хук не получит stdin:
{ "matcher": "Edit", "hooks": [
  { "command": "SecurityValidator.hook.ts" },
  { "command": "LearnGate.hook.ts" }  // ← gets 0 bytes stdin
]}

// CORRECT — каждый хук в своём matcher entry:
{ "matcher": "Edit", "hooks": [{ "command": "SecurityValidator.hook.ts" }] },
{ "matcher": "Edit", "hooks": [{ "command": "LearnGate.hook.ts" }] }
```

Проверить ВСЕ существующие matcher entries в settings.json — если есть 2+ хука в одном hooks[] и оба читают stdin, разделить.
