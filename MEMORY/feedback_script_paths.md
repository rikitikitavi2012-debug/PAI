---
name: Абсолютные пути для скриптов
description: Всегда использовать абсолютные пути при запуске скриптов через bun/bash
type: feedback
---

Использовать абсолютные пути или `cd` перед запуском скриптов из PAI/Tools и других директорий.

**Why:** Ошибка `Module not found` в другом чате — запустили `bun PAI/Tools/LearningRecall.ts` не из `~/.claude/`, и bun не нашёл файл по относительному пути.

**How to apply:**
- Абсолютный путь: `bun ~/.claude/PAI/Tools/script.ts`
- Или cd: `cd ~/.claude && bun PAI/Tools/script.ts`
- Особенно важно для hooks и cross-session вызовов
