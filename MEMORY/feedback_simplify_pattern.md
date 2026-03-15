---
name: /simplify после нового кода
description: Запускать /simplify review после написания новых хуков, утилит или Extended+ Algorithm сессий — ловит дублирование и performance баги
type: feedback
---

Запускать `/simplify` после написания нового кода (хуки, утилиты, скрипты) или Extended+ Algorithm сессий.

**Why:** При создании LearnGate.hook.ts /simplify нашёл 4 реальных бага (P0 stall 295ms, false positive, 2x дублирование) которые автор пропустил. 3 параллельных агента (reuse, quality, efficiency) покрывают blind spots которые один Claude не видит.

**How to apply:**
- После нового хука/утилиты → `/simplify` обязательно
- После Extended+ Algorithm → `/simplify` перед коммитом
- НЕ запускать на 1-2 строчных правках или контент-only изменениях (overkill: ~75K токенов)
- Фиксить findings сразу, не откладывать
