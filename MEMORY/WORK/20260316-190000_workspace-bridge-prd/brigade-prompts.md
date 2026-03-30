# Промпты для бригады — Прорабская (Workspace Bridge)

Копируй промпты в соответствующие табы Kitty. Все агенты работают в `/home/ser/projects/prorabskaya/`.
Navi проверит и внедрит артефакты.

---

## Фаза 1: Pre-validation + Foundation

### Gemini CLI — Pre-validation MCP HTTP transport

```
Мне нужна твоя помощь с исследованием. Проект: MCP Bridge Server для координации AI-агентов в Kitty терминале.

Задача 1: Проверь как Gemini CLI подключается к HTTP MCP серверам.
- В проекте уже есть .gemini/settings.json с httpUrl конфигом
- Проверь что формат правильный для Streamable HTTP transport
- Есть ли ограничения? Какие MCP features поддерживаются (tools, resources, prompts)?
- Как Gemini определяет AGENT_ID при подключении к HTTP MCP серверу?

Задача 2: Создай минимальный MCP HTTP server тест.
- Напиши файл `bridge/test-mcp-echo.ts` — MCP сервер на bun с Streamable HTTP transport на порту 3847
- Один tool: `echo` (принимает text, возвращает text)
- Используй @modelcontextprotocol/sdk
- Проверь что сервер стартует: `bun bridge/test-mcp-echo.ts`

Сохрани результат исследования в `docs/gemini-mcp-research.md`
```

### OpenCode — Pre-validation Kitty IPC

```
Мне нужна помощь с валидацией Kitty terminal IPC для проекта Workspace Bridge.

Задача 1: Проверь работоспособность Kitty remote control команд.
Выполни последовательно и запиши результаты:

1. `kitten @ ls` — получить JSON дерево всех окон. Работает? Какой формат?
2. `kitten @ send-text --match 'title:OpenCode' 'test123'` — отправить текст в своё окно
3. `kitten @ get-text --extent last_cmd_output` — прочитать последний output
4. `kitten @ set-tab-title --match 'self' 'OCode [testing]'` — сменить заголовок таба
5. `kitten @ set-tab-color --match 'self' active_fg=green` — сменить цвет таба (может не существовать!)

Задача 2: Для каждой команды запиши:
- Работает ли (yes/no)
- Точный output или ошибку
- Если не работает — есть ли альтернатива?

Сохрани результат в `docs/opencode-kitty-ipc-validation.md`
```

---

## Фаза 1: MCP Bridge Server (параллельно с Jules J1)

### Gemini CLI — Architecture Review

```
Прочитай PRD проекта: `docs/PRD.md`

Проведи архитектурный review секции "### Plan" → "#### Архитектурное решение":

1. Правильный ли выбор Streamable HTTP transport? Какие edge cases?
2. In-memory state vs SQLite/JSON file — что лучше для MVP? Трейд-оффы?
3. Claim system с 5-min timeout — оптимальный ли timeout? Что если LLM думает 10 минут?
4. Max 3 exchanges per topic — как определить "topic"? По conversation_id? А если тема меняется?
5. Monitor через GET /status polling vs WebSocket — стоит ли усложнять ради real-time?
6. Как определить AGENT_ID при HTTP подключении? Query param? Header? Session?

Напиши review в `docs/gemini-architecture-review.md`

Формат: для каждого пункта — AGREE/DISAGREE/MODIFY + обоснование + альтернатива.
Если есть улучшения — добавь в `docs/PRD.md` → секцию `## Decisions` как `[Gemini]: РЕКОМЕНДАЦИЯ:`.
```

### OpenCode — MCP HTTP Server scaffolding

```
Прочитай спецификацию Jules задачи J1: `docs/jules-tasks.md`
Прочитай типы: `bridge/types.ts`

Создай scaffold для MCP Bridge Server с HTTP transport:

1. Файл `bridge/server.ts`:
   - Импорты: @modelcontextprotocol/sdk (McpServer, StreamableHTTPServerTransport или SSEServerTransport)
   - Импорт типов из bridge/types.ts
   - In-memory state: используй BridgeState из types.ts
   - HTTP сервер на порту 3847 (Bun.serve или express-like)
   - Endpoint /mcp — MCP Streamable HTTP
   - Endpoint GET /status — JSON с текущим state для Monitor
   - Заглушки для 9 tools (только schema + пустые handlers с TODO)

НЕ имплементируй логику tools — только scaffold с правильными типами. Navi заполнит handlers или передаст Jules.

Если заметишь возможности улучшения — добавь в docs/PRD.md → Decisions как [OpenCode]: РЕКОМЕНДАЦИЯ.
```

---

## Фаза 2: Monitor + Kitty Integration

### Gemini CLI — Monitor design research

```
Исследуй лучшие практики terminal dashboard/monitor для multi-agent систем.

1. Посмотри как реализованы мониторы в:
   - Termoil (мигает красным когда агент ждёт)
   - Agent-Deck (Conductors мониторят child sessions)
   - Claude Code Agent Teams (shared task list в Ctrl+T)

2. Для нашего Bridge Monitor (ANSI output в Kitty tab, polling GET /status) предложи:
   - Оптимальный layout (roster + claims + messages + context)
   - Цветовую схему (какие цвета для idle/thinking/editing/waiting)
   - Как показывать длинные сообщения (truncate? wrap? expand?)
   - Refresh rate (1s? 2s?)

3. Напиши mock-up: как будет выглядеть Monitor с 3 агентами, 2 claims и 5 сообщениями. Используй ANSI escape codes.

Сохрани в `docs/gemini-monitor-design.md`
```

### OpenCode — Kitty bridge wrapper

```
Прочитай свои результаты валидации из `docs/opencode-kitty-ipc-validation.md` (если есть).

Создай TypeScript модуль `bridge/kitty-bridge.ts` — обёртка над kitten @ командами.

Реализуй:

export async function listWindows(): Promise<KittyWindow[]>
// kitten @ ls → parse JSON → return typed array

export async function setTabTitle(match: string, title: string): Promise<void>
// kitten @ set-tab-title --match {match} {title}

export async function getLastOutput(match: string): Promise<string>
// kitten @ get-text --match {match} --extent last_cmd_output

export async function detectAgents(): Promise<{id: number, title: string, cmdline: string}[]>
// kitten @ ls → filter windows containing "claude" or "gemini" or "opencode"

export async function sendEmergencyStop(match: string): Promise<void>
// kitten @ send-key --match {match} ctrl+c

Каждая функция: Bun.spawn(["kitten", "@", ...]) + parse stdout + error handling.
Добавь тесты в `tests/kitty-bridge.test.ts` (mock Bun.spawn).
```

---

## Фаза 3: Protocol + Context Instructions

### Gemini CLI — Protocol stress-test

```
Прочитай PRD: `docs/PRD.md`

Проведи stress-test протокола координации (раздел "Протокол безопасности"):

1. **Сценарий deadlock:** Claude claims auth.ts, Gemini claims test.ts. Claude нужен test.ts, Gemini нужен auth.ts. Как bridge обнаружит и разрешит?

2. **Сценарий race condition:** Claude и Gemini одновременно вызывают bridge_claim на один файл. Кто победит? Детерминистично ли?

3. **Сценарий topic drift:** Claude и Gemini обмениваются по теме "auth". На 3-м обмене тема сдвигается на "testing". Новый topic или продолжение?

4. **Сценарий cascade failure:** Bridge Server падает. Claims при рестарте? Конфликты пока server down?

Для каждого: проблема → решение → влияние на ISC.
Сохрани в `docs/gemini-protocol-stress-test.md`
Улучшения → `docs/PRD.md` → Decisions как `[Gemini]: РЕКОМЕНДАЦИЯ:`
```

### OpenCode — Context instruction drafts

```
Прочитай docs/PRD.md и существующие context файлы: CLAUDE.md, GEMINI.md, AGENTS.md

Создай draft инструкций для Bridge Protocol — блок текста (~15-20 строк) для добавления в каждый context файл.

Файл: `docs/opencode-context-instructions-draft.md`

Для каждого CLI:
1. Что такое Bridge и зачем (2 строки)
2. Доступные tools (bridge_send, bridge_read, bridge_claim, bridge_release, bridge_context_write/read, bridge_roster, bridge_status)
3. Протокол: claim before edit, max 3 exchanges, broadcast = info-only
4. Статусы: idle/thinking/editing/reviewing/waiting
5. Пример flow: получил задачу → bridge_status("thinking") → bridge_claim(files) → работа → bridge_release → bridge_status("idle")
```

---

## Фаза 4: Launch + Polish

### Gemini CLI — Final review

```
Прочитай все артефакты в docs/:
- PRD.md, jules-tasks.md, research/research-index.md
- Все gemini-*.md и opencode-*.md файлы

Проведи финальный review:
1. Все ли ISC из PRD покрыты реализацией?
2. Есть ли пробелы между jules-tasks.md и PRD?
3. Что забыли? Какие edge cases не покрыты?
4. Готова ли система к Human Acceptance Test (Фаза 5)?

Сохрани в `docs/gemini-final-review.md`
```

### OpenCode — Launch scripts

```
Создай два bash скрипта для Workspace Bridge:

1. `scripts/bridge-start.sh`:
- Проверить что Kitty running (kitten @ ls)
- Проверить что bridge/server.ts существует
- Запустить MCP Bridge Server в фоне (bun bridge/server.ts &)
- Сохранить PID в /tmp/bridge-server.pid
- Подождать 2s, проверить что сервер отвечает (curl localhost:3847/status)
- Открыть Monitor tab (kitten @ launch --type=tab --title="Bridge Monitor" bun bridge/monitor.ts)
- Вывести статус с цветами

2. `scripts/bridge-stop.sh`:
- Прочитать PID из /tmp/bridge-server.pid
- SIGTERM → wait 3s → SIGKILL если жив
- Закрыть Monitor tab (kitten @ close-tab --match title:"Bridge Monitor")
- Удалить PID file
- Вывести статус

Оба скрипта: chmod +x, set -euo pipefail, цветной вывод.
```
