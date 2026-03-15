---
name: Upstream Cherry-Pick Strategy
description: НИКОГДА не merge upstream/main. Только cherry-pick полезных фич. CLAUDE.md и Algorithm — наши, не трогать.
type: feedback
---

Cherry-pick only — НЕ делать git merge upstream/main.

**Why:** Наша структура (30+ hooks, 13 skills, Algorithm v4.0-alpha) далеко ушла от upstream Daniel Miessler. Merge сломает CLAUDE.md, settings.json, и кастомные системы.

**How to apply:**
1. `git fetch upstream` (раз в неделю)
2. `git log upstream/main --oneline` (что нового?)
3. Если полезная фича → cherry-pick или ручная адаптация под нашу структуру
4. CLAUDE.md и Algorithm — **НИКОГДА** не merge из upstream
5. Upstream даёт философию и идеи. Код — наш.
