# AI Brigade — Roster & Reference

**Состав бригады, должностные инструкции, команды, лимиты.**

Дирижёр: Ivan. Архитектор: Navi.

*Последнее обновление: 2026-03-03*

---

## Реестр бригады

| # | Имя | Роль | Тип | Провайдер | Связь | Прокси |
|---|------|------|-----|-----------|-------|--------|
| 1 | **Navi** | Архитектор, ведущий инженер | Sync, локальный | Anthropic (Opus) | Интерактивный (CLAUDE.md) | Да (NL) |
| 2 | **Jules** | Async-исполнитель | Async, облако | Google (Gemini) | JulesAPI.ts | Нет |
| 3 | **Agent Zero** | Автономный агент 24/7 | 24/7, VPS Docker | Anthropic (Sonnet) | AgentZero.ts + MCP SSE | Нет |
| 4 | **Gemini CLI** | Инструмент Navi | On-demand | Google (Gemini Pro) | Inference.ts `--level gemini` | Да (NL) |
| 5 | **GLM-5** | Инструмент Navi | On-demand | Zhipu AI | Inference.ts `--level glm5` | Нет |
| 6 | **zai-cli** | MCP tools (vision/search/read) | On-demand | Zhipu AI | CLI + MCP stdio | Нет |

---

## 1. Navi (Claude Code / PAI)

**Роль:** Архитектор и ведущий инженер. Стратегический контекст (TELOS), сложные решения, архитектура, ревью, интерактивная работа с Ivan.
**LLM:** Claude Opus 4.6
**Инструкции:** `CLAUDE.md` (авто-загружается Claude Code)
**Конфигурация:** `settings.json`

**Запуск:**
```bash
pai                          # через прокси NL
claude                       # напрямую (если прокси активен)
```

**Здоровье:** Если работает — значит здоров. Прокси: `_ensure_proxy()` в .bashrc.

**Лимиты:** Claude Max подписка. Без жёстких лимитов запросов.

**НЕ делегировать:** Рутинные тесты, dependency updates (→ Jules). Длительные вычисления (→ Agent Zero).

---

## 2. Jules (Google Gemini)

**Роль:** Async-исполнитель. Тесты, баги, TODO, dependency updates, security scans. Работает пока Ivan спит.
**LLM:** Gemini (Google)
**Инструкции:** `AGENTS.md` (в корне репо — Jules читает при каждой задаче)

**Команды:**
```bash
bun skills/Utilities/Jules/Tools/JulesAPI.ts sources       # список репозиториев
bun skills/Utilities/Jules/Tools/JulesAPI.ts sessions       # активные сессии
bun skills/Utilities/Jules/Tools/JulesAPI.ts create <repo> "task"  # создать задачу
bun skills/Utilities/Jules/Tools/JulesAPI.ts status <session_id>   # статус задачи
bun skills/Utilities/Jules/Tools/JulesAPI.ts approve <session_id>  # одобрить PR
```

**Здоровье:** `bun JulesAPI.ts sessions` — если отвечает, жив.

**Лимиты:** Pro plan = 100 задач/день, 15 параллельно. Провалы расходуют квоту.

**Репозитории:** PAI-personal (private, master). Подключить: digital-foreman-app, timber-frame-site.

**НЕ делегировать:** Архитектуру, сложный рефакторинг, MEMORY/USER файлы, settings.json, .env.

**Инструкции для Jules** (`AGENTS.md`):
- Bun, не Node.js
- `chmod +x` для хуков
- `getPaiDir()` для путей
- Тесты через `runHook()` из harness.ts
- Никогда не пушить в origin (public)

---

## 3. Agent Zero

**Роль:** Автономный исследователь и исполнитель. Code execution, browser, search, документы, DevOps. Работает 24/7 на VPS.
**LLM:** Claude Sonnet 4.6 (Anthropic)
**Сервер:** http://72.56.86.51:50002 (контейнер 2 — primary brain)
**Инструкции:** Встроены в контейнер (TELOS skill, TheAlgorithm v2.0)

**Команды (REST API):**
```bash
bun PAI/Tools/AgentZero.ts health                           # проверка сервера
bun PAI/Tools/AgentZero.ts message "Задача"                 # sync (до 5 мин)
bun PAI/Tools/AgentZero.ts message "Ещё" --context ABC      # продолжить диалог
bun PAI/Tools/AgentZero.ts async "Длинная задача"           # fire-and-forget
bun PAI/Tools/AgentZero.ts log <context_id>                 # лог разговора
bun PAI/Tools/AgentZero.ts terminate <context_id>           # завершить
```

**MCP (Claude Code — нативные tool calls):**
```
mcp__agent-zero__send_message     — отправить сообщение
mcp__agent-zero__finish_chat      — завершить чат
```

**Навыки (9):** a0-deployer, chart-architect, doc-forge, exa-synergy, ops-commander, replicate-studio, telos, the-algorithm, create-skill

**Инструменты (14):** code_execution_tool, browser_agent, call_subordinate, search_engine, document_query, vision_load, memory_*, behaviour_adjustment, response, input, wait, notify_user, a2a_chat, scheduler:*

**Здоровье:** `bun AgentZero.ts health` или `curl http://72.56.86.51:50002/health`

**Лимиты:** Ограничен серверными ресурсами VPS. Latency ~20-30с на задачу.

**Scheduler:** 2 задачи (ULC daily 06:00 MSK, TELOS adhoc). Управление через web UI (CSRF-protected).

**НЕ делегировать:** Интерактивную работу (latency). Изменения в PAI hooks/settings (нет доступа к ~/.claude).

**Контейнеры на VPS:**
| # | Порт | Назначение | Статус |
|---|------|-----------|--------|
| 1 | — | Резерв (старая версия) | Backup |
| 2 | 50002 | Primary brain | Активен |
| 3 | 50003 | Строительный оркестратор | Чистая установка |

---

## 4. Gemini CLI (инструмент Navi)

**Роль:** Второе мнение, cross-check, Google-специфичные знания. Navi вызывает программно.
**LLM:** Gemini Pro (Google)
**Не агент — инструмент.** Как электроинструмент в руках прораба.

**Команды:**
```bash
# Через Inference.ts (рекомендуется):
bun PAI/Tools/Inference.ts --level gemini "system prompt" "user prompt"
bun PAI/Tools/Inference.ts --level gemini --json "system" "user"

# Через CLI напрямую (интерактивно):
gemi                                    # через прокси NL
gemini --prompt "Question"              # одноразовый вопрос
```

**Здоровье:** `bun PAI/Tools/Inference.ts --level gemini "test" "Say OK"` — если ответил, работает.

**Конфигурация:**
- API ключ: `GOOGLE_API_KEY` + `GEMINI_API_KEY` в .bashrc (из ~/.config/PAI/.env)
- Прокси: обязателен (HTTP_PROXY через privoxy → SSH tunnel NL)
- Конфиг: `~/.gemini/` (settings, projects, oauth)

**Лимиты:** Free: 1000 req/day (Flash). Pro: 5x лимиты + Pro модель. Ivan имеет Pro.

**Когда использовать:** Второе мнение по коду, cross-check выводов Navi, Google-специфичные данные.

---

## 5. GLM-5 / Z.AI (инструмент Navi)

**Роль:** Bulk inference и стратегический резерв. Прямой доступ из РФ (без прокси).
**LLM:** GLM-5 (744B MoE, Zhipu AI)
**Не агент — инструмент.**

**Команды:**
```bash
bun PAI/Tools/Inference.ts --level glm5 "system prompt" "user prompt"
bun PAI/Tools/Inference.ts --level glm5 --json "system" "user"
```

**Здоровье:** `bun PAI/Tools/Inference.ts --level glm5 "test" "Say OK"`

**Конфигурация:**
- API ключ: `ZAI_API_KEY` в ~/.config/PAI/.env
- Env var: `Z_AI_API_KEY` в .bashrc
- Endpoint: `https://api.z.ai/api/coding/paas/v4/chat/completions` (Coding Plan!)
- Прокси: НЕ нужен (китайская компания)

**Лимиты:** Coding Plan (средний тариф). Конкретные лимиты — в UI z.ai.

**Стратегическая ценность:** Если заблокируют Anthropic + Google → GLM-5 работает напрямую из РФ. Backup endpoint: `https://api.z.ai/api/anthropic` (Anthropic-совместимый).

---

## 6. zai-cli (MCP инструменты)

**Роль:** Vision (OCR, UI-to-code), web search, web read, GitHub repo exploration.
**Провайдер:** Zhipu AI (Z.AI)

**Команды:**
```bash
zai-cli vision analyze ./image.png "Describe"     # анализ изображения
zai-cli search "query" --count 10                  # веб-поиск
zai-cli read https://example.com                   # чтение веб-страницы
zai-cli repo tree owner/repo                       # структура GitHub репо
zai-cli repo search owner/repo "query"             # поиск в коде
zai-cli tools                                      # список MCP инструментов
zai-cli doctor                                     # проверка настройки
```

**MCP в Claude Code:** `zai-vision` MCP сервер в settings.json (stdio, 8 vision tools).

**Здоровье:** `Z_AI_API_KEY=... zai-cli doctor`

**13 MCP инструментов:**
- Vision (8): analyze_image, extract_text, diagnose_error, ui_diff, ui_to_artifact, diagram, data_viz, video
- Search (1): webSearchPrime
- Reader (1): webReader
- ZRead (3): search_doc, read_file, get_repo_structure

---

## Unified Inference — 5 уровней

```bash
bun PAI/Tools/Inference.ts --level <level> "system" "user"
```

| Level | Модель | Провайдер | Timeout | Прокси | Когда |
|-------|--------|-----------|---------|--------|-------|
| `fast` | Haiku | Anthropic | 15с | Да | Классификация, простая генерация |
| `standard` | Sonnet | Anthropic | 30с | Да | Типичный анализ |
| `smart` | Opus | Anthropic | 90с | Да | Глубокие решения, стратегия |
| `gemini` | Gemini Pro | Google | 30с | Да | Второе мнение, cross-check |
| `glm5` | GLM-5 | Zhipu AI | 30с | Нет | Bulk inference, резерв |

---

## Матрица делегирования

| Задача | Navi | Jules | Agent Zero | Примечание |
|--------|:----:|:-----:|:----------:|------------|
| Архитектура, дизайн | ✅ | ❌ | ❌ | Только Navi |
| Написание тестов | ⚠️ | ✅ | ❌ | Jules = приоритет |
| Баги, TODO | ⚠️ | ✅ | ❌ | Jules async |
| Dependency updates | ❌ | ✅ | ❌ | Jules proactive |
| Security scans | ⚠️ | ✅ | ❌ | Jules proactive |
| Глубокий ресёрч | ⚠️ | ❌ | ✅ | A0 = browser + search |
| Code execution (Python) | ❌ | ❌ | ✅ | A0 sandbox |
| Генерация документов | ❌ | ❌ | ✅ | A0 doc-forge |
| DevOps, серверы | ❌ | ❌ | ✅ | A0 ops-commander |
| Визуализация данных | ❌ | ❌ | ✅ | A0 chart-architect |
| TELOS/settings/hooks | ✅ | ❌ | ❌ | Только Navi |
| Интерактивная работа | ✅ | ❌ | ❌ | Latency = Navi wins |

---

## Health Check — все агенты

```bash
# Navi — если ты это читаешь, я жив

# Jules
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions

# Agent Zero
bun ~/.claude/PAI/Tools/AgentZero.ts health

# Gemini CLI
bun ~/.claude/PAI/Tools/Inference.ts --level gemini "test" "OK"

# GLM-5
bun ~/.claude/PAI/Tools/Inference.ts --level glm5 "test" "OK"

# zai-cli
Z_AI_API_KEY=$(grep ZAI_API_KEY ~/.config/PAI/.env | cut -d= -f2) zai-cli doctor
```

---

## API ключи

Все ключи в `~/.config/PAI/.env` (symlink `~/.claude/.env`):

| Ключ | Для кого | Формат |
|------|----------|--------|
| `ANTHROPIC_API_KEY` | Navi (Claude Code) | sk-ant-... |
| `JULES_API_KEY` | Jules API | AIza... |
| `A0_API_TOKEN` | Agent Zero REST API | 16 char |
| `GOOGLE_API_KEY` | Gemini CLI | AIza... |
| `ZAI_API_KEY` | GLM-5 + zai-cli | hex.base64 |
| `EXA_API_KEY` | Exa search MCP | ... |
| `ELEVENLABS_API_KEY` | Voice notifications | ... |

---

*Обновлять при добавлении новых агентов/инструментов. Реестр = единый источник правды о бригаде.*
