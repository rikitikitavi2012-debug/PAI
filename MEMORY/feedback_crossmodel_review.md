---
name: Cross-Model Review Required for Algorithm Changes
description: При изменениях Algorithm ОБЯЗАТЕЛЬНО запускать review через другие модели (Gemini, A0). Claude имеет слепые зоны которые только другие модели ловят.
type: feedback
---

Cross-model review обязателен для критических изменений Algorithm и PAI infrastructure.

**Why:** При создании Algorithm v4.0-alpha 3 уровня Claude review (RedTeam + Manual Audit + Architect Agent) пропустили 4 бага. Gemini 2.5 Pro нашёл 1 (amplitude state persistence), A0 Sonnet нашёл 3 (priority conflict, initialization header, consecutive definition). Разные модели = разные слепые зоны. Claude reviewing Claude has shared blind spots.

**How to apply:**
1. После финализации Algorithm/infrastructure изменений → отправить файлы на review Gemini CLI + A0
2. Gemini: `cat files.md | gemini -m gemini-2.5-pro` (pipe содержимое файлов)
3. A0: `curl http://72.56.86.51:50002/api_message` с X-API-KEY (port 50002, не 50001)
4. Каждая модель найдёт уникальные баги — это не опционально, а обязательный шаг
5. A0 нужен git pull перед review если файлы были только что запушены
