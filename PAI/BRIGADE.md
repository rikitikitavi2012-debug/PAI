# AI Brigade -- Roster & Reference

**Состав бригады, классификация, команды, лимиты.**

Дирижёр: Ivan. Архитектор: Navi.

*Последнее обновление: 2026-03-11*

---

## Классификация

| Tier | Тип | Описание |
|------|-----|----------|
| **T1 -- Autonomous Agents** | Полноценные работники | Получают задачу, работают самостоятельно, выдают результат. Могут создавать PR, деплоить, исследовать. |
| **T2 -- CLI Agents** | Интерактивные помощники | Открываются в отдельном окне терминала. Ivan или Navi работают с ними интерактивно. Аналоги Claude Code от других провайдеров. |
| **T3 -- Tools** | Инструменты | Вызываются программно (Inference.ts, MCP). Без автономии. Как электроинструмент в руках прораба. |

---

## Реестр бригады

| # | Имя | Tier | Роль | Провайдер | LLM | Алиас | Прокси |
|---|------|------|------|-----------|-----|-------|--------|
| 1 | **Navi** | T1 | Архитектор, ведущий | Anthropic | Opus 4.6 | `pai` | Да (NL) |
| 2 | **Jules** | T1 | Async-исполнитель | Google | Gemini | JulesAPI.ts | Нет |
| 3 | **Agent Zero** | T1 | Автономный 24/7 | Z.AI + OpenCode Zen | GLM-5 + Kimi 2.5 | AgentZero.ts | Нет |
| 4 | **Gemini CLI** | T1 | Второе мнение, research, PAI-интегрирован | Google | Gemini Pro | `gemi` | Да (NL) |
| 5 | **OpenCode CLI** | T1 | Мульти-провайдер кодер | OpenCode Go | Kimi 2.5 (default) | `oc` | Да (NL) |
| 6 | **GLM-5** | T3 | Bulk inference, резерв | Zhipu AI | GLM-5 744B | Inference.ts | Нет |
| 7 | **zai-cli** | T3 | Vision, search, read | Zhipu AI | GLM-4.6V | MCP stdio | Нет |
| 8 | **NotebookLM** | T3 | Grounded research, podcasts | Google | Gemini | notebooklm CLI | Нет |

---

## T1: Autonomous Agents

### 1. Navi (Claude Code / PAI)

**Роль:** Архитектор и ведущий инженер. Стратегический контекст (TELOS), сложные решения, архитектура, ревью, интерактивная работа с Ivan. Руководит бригадой -- делегирует задачи Jules, A0, использует T3 инструменты.
**LLM:** Claude Opus 4.6
**Инструкции:** `CLAUDE.md` (авто-загружается Claude Code)
**Конфигурация:** `settings.json`

**Запуск:**
```bash
pai                          # через прокси NL
claude                       # напрямую (если прокси активен)
```

**Здоровье:** Если работает -- значит здоров. Прокси: `_ensure_proxy()` в .bashrc.

**Лимиты:** Claude Max подписка ($100/мес). Без жёстких лимитов запросов.

**НЕ делегировать Navi:** Рутинные тесты (-> Jules). Длительные вычисления (-> A0).

---

### 2. Jules (Google Gemini)

**Роль:** Async-исполнитель. Тесты, баги, TODO, dependency updates, security scans. Работает пока Ivan спит. Создаёт PR автономно.
**LLM:** Gemini (Google)
**Инструкции:** `AGENTS.md` (в корне репо -- Jules читает при каждой задаче)

**Команды:**
```bash
bun skills/Utilities/Jules/Tools/JulesAPI.ts sources       # список репозиториев
bun skills/Utilities/Jules/Tools/JulesAPI.ts sessions       # активные сессии
bun skills/Utilities/Jules/Tools/JulesAPI.ts create <repo> "task"  # создать задачу
bun skills/Utilities/Jules/Tools/JulesAPI.ts status <session_id>   # статус задачи
bun skills/Utilities/Jules/Tools/JulesAPI.ts approve <session_id>  # одобрить PR
```

**Автоматизация:** JulesAutoMerge -- тесты в worktree -> A0 code review -> merge.

**Здоровье:** `bun JulesAPI.ts sessions` -- если отвечает, жив.

**Лимиты:** Pro plan = 100 задач/день, 15 параллельно. Провалы расходуют квоту.

**Репозитории:** PAI-personal (private, master). Подключить: digital-foreman-app, timber-frame-site.

**НЕ делегировать:** Архитектуру, сложный рефакторинг, MEMORY/USER файлы, settings.json, .env.

---

### 3. Agent Zero

**Роль:** Автономный исследователь и исполнитель 24/7. Code execution, browser, search, документы, DevOps. Работает на VPS.
**LLM:** Z.AI GLM-5 (chat) + OpenCode Zen Kimi 2.5 (utility). Провайдер переключаемый -- можно поставить Anthropic, OpenRouter, OpenAI.
**Сервер:** http://72.56.86.51:50002 (контейнер 2 -- primary brain)
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

**MCP (Claude Code -- нативные tool calls):**
```
mcp__agent-zero__send_message     -- отправить сообщение
mcp__agent-zero__finish_chat      -- завершить чат
```

**Навыки (9):** a0-deployer, chart-architect, doc-forge, exa-synergy, ops-commander, replicate-studio, telos, the-algorithm, create-skill

**Инструменты (14):** code_execution_tool, browser_agent, call_subordinate, search_engine, document_query, vision_load, memory_*, behaviour_adjustment, response, input, wait, notify_user, a2a_chat, scheduler:*

**Scheduler:** 2 задачи (ULC daily 06:00 MSK, TELOS adhoc). Управление через web UI.

**Стоимость LLM:** При Z.AI + Kimi -- $0 extra (подписка/free). При Anthropic -- расход виден в platform.claude.com -> Cost. При OpenRouter -- в openrouter.ai/activity.

**Контейнеры на VPS:**
| # | Порт | Назначение | Статус |
|---|------|-----------|--------|
| 1 | -- | Резерв (старая версия) | Backup |
| 2 | 50002 | Primary brain | Активен |
| 3 | 50003 | Строительный оркестратор | Чистая установка |

**НЕ делегировать:** Интерактивную работу (latency 20-30с). Изменения PAI hooks/settings.

---

### 4. Gemini CLI (PAI-integrated)

**Роль:** Второе мнение, параллельный research, Google-специфичные задачи, контент для TF. Полностью интегрирован в PAI (GEMINI.md + shared context + 5 skills + 2 hooks + 5 commands).
**LLM:** Gemini Pro (Google)
**Версия:** v0.31.0
**Инструкции:** `~/.gemini/GEMINI.md` (авто-загружается, импортирует ABOUTME, TELOS, Steering Rules через симлинки)

**Запуск:**
```bash
# Интерактивный (Ivan в отдельном окне):
gemi                                    # через прокси NL + --include-directories PAI

# Headless (Navi программно):
echo "задача" | gemi -p "" -y -o text   # headless + YOLO + text output
echo "задача" | gemini -p "" -y -o text --include-directories /home/ser/.claude/PAI/USER/

# Inference API (T3 уровень, без CLI контекста):
bun PAI/Tools/Inference.ts --level gemini "system" "user"
```

**PAI интеграция (2026-03-11):**
- `~/.gemini/GEMINI.md` — роль, принципы, context routing
- `~/.gemini/shared/` — симлинки на ABOUTME, TELOS (MISSION, GOALS, STATUS, CHALLENGES, STRATEGIES), AISTEERINGRULES
- 5 скиллов: ContentAnalysis, Investigation, Media, TFContent, Thinking
- 2 хука: SessionStart (PAI context), BeforeTool (PAI guard — read-only)
- 5 команд: /telos, /pai, /navi, /think, /tf
- `.bashrc` gemi() включает `--include-directories ~/.claude/PAI/USER/`

**Когда Navi делегирует Gemini:**
- Параллельный research (Navi спавнит Gemini пока сам делает другое)
- Jules задачи (масштабный рефакторинг через /jules extension)
- Google-специфичное (Google APIs, Android, GCP)
- Second opinion (проверка решения другой моделью)
- Batch content (TFContent статьи, SEO анализ)

**Лимиты:** Pro sub = 5x лимиты. Бесплатно (входит в Google One AI Pro).

**НЕ делегировать:** PAI инфраструктуру (hooks, skills, settings). Задачи требующие PAI Tools (Inference.ts, bun Tools/). Задачи требующие Claude Code agents (Task(), TeamCreate).

---

### 5. OpenCode CLI (PAI-integrated)

**Роль:** Мульти-провайдерный автономный кодер. Open-source аналог Claude Code с headless mode (`opencode run`). Полностью интегрирован в PAI (AGENTS.md + shared context + 5 skills). Navi вызывает программно, Ivan — в Kitty окне.
**LLM:** Kimi 2.5 (OpenCode Go, default). Можно переключить на Z.AI GLM-5, OpenAI, Anthropic через `-m provider/model`.
**Версия:** v1.2.24
**Инструкции:** `~/.config/opencode/AGENTS.md` (авто-загружается при каждом запуске)

**Запуск:**
```bash
# Интерактивный (Ivan в отдельном окне):
oc                                      # через прокси NL

# Headless (Navi программно):
opencode run "задача"                   # default model (Kimi 2.5)
opencode run -m zai/glm-5-air-0827 "задача"   # конкретная модель
opencode run --format json "задача"     # JSON output для pipeline
opencode run --dir /path/to/project "задача"   # в конкретной директории
opencode run -f file.ts "проанализируй"       # с файлом-вложением
opencode run -c "продолжай"             # продолжить сессию
opencode run --agent review "задача"    # конкретный агент
```

**PAI интеграция (2026-03-11):**
- `~/.config/opencode/AGENTS.md` — роль, принципы, context routing, build/test commands
- `~/.config/opencode/shared/` — симлинки на ABOUTME, TELOS (MISSION, GOALS, STATUS, CHALLENGES, STRATEGIES), AISTEERINGRULES
- 5 скиллов: ContentAnalysis, Investigation, Media, TFContent, Thinking
- OpenCode также читает `~/.claude/CLAUDE.md` как fallback (если AGENTS.md не найден)
- Поддержка плагинов: `@opencode-ai/plugin` (TypeScript hooks для lifecycle)

**Конфигурация:**
- Основная: `~/.config/opencode/opencode.json`
- Провайдеры: Z.AI (3 модели: GLM-4 Plus, GLM-4.1V Thinking, GLM-5 Air) + OpenCode Go (Kimi 2.5)
- MCP: zai-vision (13 tools) подключён
- Прокси: через `oc` алиас (NL VPS)

**Лимиты:** OpenCode Go sub ($10/мес). Z.AI через Coding Plan (входит в $27/мес).

**Когда Navi делегирует OpenCode:**
- Параллельный code review (Kimi 2.5 ревьюит пока Navi делает другое)
- Мульти-модель сравнение (одна задача на разных моделях через `-m`)
- Кодинг в проектах (timber-frame-site, digital-foreman-app)
- Bulk операции (анализ файлов, генерация, миграции)
- Альтернативный LLM провайдер (Z.AI, если Anthropic/Google недоступны)

**Когда Ivan работает с OpenCode:**
- Открывает `oc` в отдельном Kitty окне
- Параллельная работа с Navi на другой задаче
- Эксперименты с моделями Z.AI

**НЕ делегировать:** PAI инфраструктуру (hooks, skills, settings). Задачи требующие Claude Code agents (Task(), TeamCreate).

---

## T3: Tools (инструменты)

### 6. GLM-5 / Z.AI

**Роль:** Bulk inference и стратегический резерв. Прямой доступ из РФ (без прокси).
**LLM:** GLM-5 (744B MoE, Zhipu AI)

**Вызов:**
```bash
bun PAI/Tools/Inference.ts --level glm5 "system prompt" "user prompt"
bun PAI/Tools/Inference.ts --level glm5 --json "system" "user"
```

**Стратегическая ценность:** 3-й провайдер. Если заблокируют Anthropic + Google -- GLM-5 работает напрямую. Backup: `https://api.z.ai/api/anthropic` (Anthropic-совместимый endpoint).

---

### 7. zai-cli (MCP инструменты)

**Роль:** Vision (OCR, UI-to-code, screenshots), web search, web read, GitHub repo exploration.
**Провайдер:** Zhipu AI (Z.AI)

**13 MCP инструментов:**
- Vision (8): analyze_image, extract_text, diagnose_error, ui_diff, ui_to_artifact, diagram, data_viz, video
- Search (1): webSearchPrime
- Reader (1): webReader
- ZRead (3): search_doc, read_file, get_repo_structure

**Также:** `bun PAI/Tools/ZaiVision.ts screenshot|analyze|diff|check` -- прямой API fetch (обходит баг zai-cli search).

---

### 8. NotebookLM (CLI инструмент)

**Роль:** Grounded research (zero-hallucination), podcast generation, content pipeline, YouTube knowledge extraction, audio learning.
**Провайдер:** Google (NotebookLM via notebooklm-py)
**CLI:** `notebooklm` (v0.3.4)
**Auth:** `~/.notebooklm/storage_state.json` (browser cookies, отдельный Google аккаунт)

**Ключевые команды:**
- `notebooklm create/list/use` — управление notebooks
- `notebooklm source add` — URL, PDF, YouTube, файлы
- `notebooklm ask` — grounded Q&A с цитированием
- `notebooklm generate audio/video/report` — мультиформатный контент
- `notebooklm download` — скачивание артефактов

**PAI Skill:** `skills/NotebookLM/SKILL.md` (6 workflows)
**Лимиты:** 50 sources/notebook, cookie expiry (дни-недели), undocumented Google API

**НЕ делегировать:** Задачи требующие реального времени (latency 5-30с на запрос). Sensitive данные (отдельный аккаунт!).

---

## Unified Inference -- 5 уровней

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

| Задача | Navi (T1) | Jules (T1) | A0 (T1) | Gemini (T1) | OpenCode (T1) | Примечание |
|--------|:---------:|:----------:|:-------:|:-----------:|:-------------:|------------|
| PAI архитектура | **V** | -- | -- | -- | -- | Только Navi (контекст) |
| TELOS/settings/hooks | **V** | -- | -- | -- | -- | Только Navi |
| Написание тестов | . | **V** | -- | -- | . | Jules async приоритет |
| Баги, TODO | . | **V** | -- | -- | . | Jules или OpenCode |
| Dependency updates | -- | **V** | -- | -- | -- | Jules proactive |
| Security scans | . | **V** | -- | -- | -- | Jules proactive |
| Глубокий ресёрч | . | -- | **V** | **V** | -- | A0 browser, Gemini parallel |
| Code execution (Python) | -- | -- | **V** | -- | -- | A0 sandbox |
| DevOps, серверы | -- | -- | **V** | -- | -- | A0 ops-commander |
| Code review | . | -- | . | . | **V** | OpenCode = быстрый ревью |
| Кодинг без PAI контекста | -- | . | -- | . | **V** | P1, P3 проекты |
| Мульти-модель анализ | -- | -- | -- | . | **V** | -m provider/model |
| Параллельный research | . | -- | -- | **V** | -- | Gemini headless + PAI ctx |
| Контент TF/SEO | . | -- | -- | **V** | -- | Gemini TFContent skill |
| Второе мнение | -- | -- | -- | **V** | . | Cross-check |
| Google-специфичное | -- | -- | -- | **V** | -- | GCP, APIs, Android |
| Интерактивная работа | **V** | -- | -- | **V** | **V** | Navi/Gemini/OC |

Легенда: **V** = приоритет, **.** = может, **--** = не делегировать

---

## Health Check -- вся бригада

```bash
# T1: Autonomous Agents
# Navi -- если ты это читаешь, я жив
bun ~/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts sessions   # Jules
bun ~/.claude/PAI/Tools/AgentZero.ts health                       # A0

# T2: CLI Agents
gemi --prompt "health check OK"                                   # Gemini CLI
oc run "say OK"                                                   # OpenCode CLI

# T3: Tools
bun ~/.claude/PAI/Tools/Inference.ts --level gemini "test" "OK"   # Gemini inference
bun ~/.claude/PAI/Tools/Inference.ts --level glm5 "test" "OK"     # GLM-5
bun ~/.claude/PAI/Tools/ZaiVision.ts check                        # zai-vision
```

---

## API ключи

Все ключи в `~/.config/PAI/.env` (symlink `~/.claude/.env`):

| Ключ | Для кого | Tier |
|------|----------|------|
| `ANTHROPIC_API_KEY` | Navi (Inference.ts), A0 (optional) | T1/T3 |
| `JULES_API_KEY` | Jules API | T1 |
| `A0_API_TOKEN` | Agent Zero REST API | T1 |
| `GOOGLE_API_KEY` | Gemini CLI + Inference.ts | T2/T3 |
| `ZAI_API_KEY` | GLM-5 + zai-cli + OpenCode Z.AI provider | T2/T3 |
| `EXA_API_KEY` | Exa search MCP | T3 |
| `ELEVENLABS_API_KEY` | Voice notifications | T3 |

---

## Стоимость бригады (месяц)

| Член | Подписка | API pay-per-use | Итого |
|------|----------|-----------------|-------|
| Navi (Claude Max) | $100 | -- | $100 |
| Jules (Google One AI Pro) | $20.83 | -- | $20.83 |
| A0 (Z.AI + Kimi) | $27 (Z.AI share) | ~$0 | ~$0* |
| Gemini CLI (Google) | -- (Google One) | -- | $0 |
| OpenCode CLI | $10 | -- | $10 |
| GLM-5 (Z.AI) | -- (Z.AI share) | -- | $0 |
| zai-cli (Z.AI) | -- (Z.AI share) | -- | $0 |
| **ИТОГО** | | | **~$131** |

*A0 при Z.AI/Kimi = $0 extra. При Anthropic = pay-per-use (~$1.51 за 8 дней).

---

*Обновлять при добавлении новых агентов/инструментов. Реестр = единый источник правды о бригаде.*
