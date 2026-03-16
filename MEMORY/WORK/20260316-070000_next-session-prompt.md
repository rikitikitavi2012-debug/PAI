# Следующая сессия: Аудит скиллов + локализация PAI под русский язык

## Контекст предыдущей сессии (2026-03-16 ночь)

Сессия была масштабной — 8 задач закрыто:
1. ✅ Algorithm v4.0-alpha hardening — 17 spec gaps fixed
2. ✅ Learning loop closed — LEARN.md readback + experiments.tsv + active retrieval + performance correlation
3. ✅ FAILURES rotation — 188→87 MB, gzip on write, daily auto-rotation
4. ✅ Context recovery — 14th Autoresearch mechanism verified after /compact
5. ✅ Яндекс Директ — аналитический отчёт + PRD 48 ISC по 5 фазам
6. ✅ Яндекс API verified — единый OAuth (direct:api + wordstat:api + metrika:read)
7. ✅ Цели Метрики настроены — 3 goals через API + ym() трекинг в коде сайта
8. ✅ TELOS обновлён — G1, G14, P0, P1

PRD Яндекс Директа: `MEMORY/WORK/20260316-060000_yandex-direct-autoresearch/PRD.md` (12/48, paused)
Algorithm: v4.0-alpha hardened, 14/14 mechanisms verified, learning loop closed

## Задача этой сессии

### ПРИОРИТЕТ 1: Аудит скиллов — вызовы по триггерам на русском

**Проблема:** Все skill триггеры в SKILL.md написаны на английском ("USE WHEN research, do research, quick research..."). Ivan общается на русском. Неизвестно:
1. Вызываются ли скиллы когда Ivan говорит по-русски? (например "проведи исследование" → Research skill?)
2. Все ли скиллы реально работают при вызове?
3. Отвечают ли скиллы и их агенты на русском?

**Что проверить для КАЖДОГО скилла:**

1. Прочитать SKILL.md — найти trigger keywords
2. Проверить: есть ли русские триггеры? Если нет — добавить
3. Проверить: voice notifications в скиллах — на каком языке?
4. Проверить: если скилл спавнит агентов — инструктированы ли они отвечать на русском?

**Скиллы для аудита (из system prompt):**
- Research
- Thinking (FirstPrinciples, IterativeDepth, Council, RedTeam, Science, ThreatModel)
- ContentAnalysis
- TFContent
- YandexDirect
- Media (Art, Video)
- Telos
- Utilities (Browser, CLI, Jules, Delegation, Evals, Fabric, etc.)
- Investigation
- Agents

### ПРИОРИТЕТ 2: Локализация голосовых уведомлений

**Проблема:** Ivan слышит английский голос. Источники:
1. Скиллы — voice notifications ("Running the X workflow...")
2. Хуки — некоторые могут говорить по-английски
3. Агенты (subagents) — могут использовать voice curl с английским текстом

**Что найти и исправить:**
```bash
# Найти все английские voice messages
grep -r '"message":' hooks/ skills/ --include="*.ts" --include="*.md" | grep -v '"message": "' # look for english
grep -r 'Running the\|Starting\|Completed\|Processing' hooks/ skills/ --include="*.ts" --include="*.md"
```

### ПРИОРИТЕТ 3: Smoke-test каждого скилла

Для каждого скилла — минимальный тест что он запускается и даёт результат:
- Research: "исследуй тему X" → должен запустить агентов и вернуть отчёт
- Thinking: "проанализируй X методом первых принципов" → должен вызвать FirstPrinciples
- Media: "создай изображение X" → должен запустить Art workflow
- и т.д.

### ПРИОРИТЕТ 4: Системная проверка

1. `settings.json` — все ли matchers корректны?
2. Хуки — нет ли оставшихся stdin sharing violations?
3. CLAUDE.md.template — синхронизирован ли с CLAUDE.md?

## Как работать

Используй Algorithm mode (Extended+). Это задача G10 (Аудит 11 скиллов по v4 структуре).

1. OBSERVE: прочитать все SKILL.md, собрать матрицу триггеров (русский/английский)
2. THINK: определить scope — какие скиллы критичны, какие можно пропустить
3. PLAN: параллельный аудит через агентов (3-4 агента по 3 скилла каждый)
4. EXECUTE: добавить русские триггеры, локализовать voice, smoke-test
5. VERIFY: каждый скилл вызывается на русском, voice на русском, агенты отвечают на русском
6. LEARN: что сломано, что работает, паттерны

## Ожидаемые артефакты

1. Матрица скиллов: триггер (EN/RU) × voice language × agent language × smoke-test result
2. Фиксы: русские триггеры добавлены, voice локализован
3. PRD с ISC для G10
4. LEARN.md

## Важное

- НЕ ломай существующие английские триггеры — добавляй русские параллельно
- Voice notifications: message на русском, voice_id оставить тот же (3EuKHIEZbSzrHGNmdYsx = русский голос)
- Агенты в скиллах: добавить инструкцию "Отвечай на русском языке" в промпты
- Критически: SecurityValidator, ModeClassifier, LoadContext — не трогать без причины
