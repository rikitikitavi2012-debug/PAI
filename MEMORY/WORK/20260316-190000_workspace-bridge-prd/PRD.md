---
task: "PAI Workspace Bridge — PRD, архитектура и план реализации"
slug: 20260316-190000_workspace-bridge-prd
effort: deep
phase: complete
progress: 4/46
mode: interactive
started: 2026-03-16T19:00:00Z
updated: 2026-03-16T19:00:00Z
---

## Context

### Запрос
Ivan просит создать полноценный PRD для **PAI Прорабская** (Workspace Bridge) — системы, которая превращает Kitty-терминал в прорабскую — координационный центр где несколько AI-агентов (Claude Code, Gemini CLI, OpenCode) работают в видимых окнах, могут общаться друг с другом, а прораб (Ivan) наблюдает и управляет всем в реальном времени. Как настоящая прорабская на стройке — место где все нити сходятся, все бригады докладывают, все решения принимаются.

### Почему это важно
1. **G13 (PAI Workspace v2)** — прямая цель в TELOS
2. **G14 (Цифровая бригада)** — Workspace Bridge = физическая среда для бригады
3. **M1 (Инновации)** — уникальная реализация (40+ проектов на tmux, 0 на Kitty)
4. **M3 (Техно-суверенитет)** — собственная инфраструктура координации агентов
5. **S1 (AI-автоматизация)** — мультипликатор: каждый проект = быстрее с bridge
6. **S7 (Open Source)** — потенциальный PR в upstream PAI (Kitty MCP + Bridge)
7. **Compound effect** — инвестиция в систему → возврат при каждом использовании

### Связь с TELOS

```
M1 (Инновации) ──→ G13 (Workspace v2) ──→ Bridge PRD
M3 (Техно-суверенитет) ──→ G13 ──→ Bridge PRD
S1 (AI-автоматизация) ──→ G14 (Бригада) ──→ Bridge PRD
S7 (Open Source) ──→ G11 (Community) ──→ Bridge MCP Server → upstream PR
P0 (PAI) ──→ подпроект Workspace Bridge
```

### Исследовательская база
Проведено 7 параллельных исследований. Полный индекс и ссылки: [`research-index.md`](research-index.md)

| Агент | Фокус | Отчёт |
|-------|-------|-------|
| **ClaudeResearcher** | CrewAI/AutoGen/LangGraph, MCP+A2A, CHI 2026 paper | `agent-a654b35ce122a5f58.jsonl` |
| **Architect** | 3-tier архитектура, risk assessment, MVP plan | `agent-a7f83e195e8e44a89.jsonl` |
| **PerplexityResearcher** | 30+ проектов (Claude Squad, AionUi, Mux, etc.) | `agent-a21b1adc9bec70f13.jsonl` |
| **GrokResearcher** | 40+ проектов, Kitty gap analysis, IPC protocols | `agent-a0dee5e9e48d60d14.jsonl` |
| **GeminiResearcher** | tmux-mcp-rs, Agent-Deck, Claude Code Agent Teams | `agent-a9459262dcefb1861.jsonl` |
| **CodexResearcher** | Kitty IPC 35+ команд, wire protocol, encryption | `agent-a61b488668601e4f3.jsonl` |
| **Gemini 2.5 Pro** | Skynet, Parallel Code, A2A протокол, MVP план | [`research-gemini-cli.txt`](research-gemini-cli.txt) |

Транскрипты агентов: `~/.claude/projects/-home-ser--claude/ecf8e0b3-6eba-4bc2-bf6b-2bddb5c807e6/subagents/`

**Ключевые находки:**
- **40+ существующих проектов** (Claude Squad, AionUi, Architect, Mux, Agent-Deck, etc.)
- **Все на tmux** — Kitty-native = пустая ниша
- **Kitty IPC** — 35+ remote control команд, полная программная автоматизация
- **MCP** — стандарт де-факто для tool integration (Claude, Gemini, OpenCode поддерживают)
- **A2A** (Google) — agent-to-agent протокол, Q3 2026 joint spec с MCP
- **CHI 2026 paper** "Terminal Is All You Need" — валидация терминала как идеального medium
- **kitty-mcp** — MCP-сервер для Kitty уже существует (den-tanui/kitty-mcp)
- **Claude IPC MCP** — agent-to-agent коммуникация через MCP (jdez427/claude-ipc-mcp)

### Архитектурные ограничения
1. Terminal I/O однонаправлен — нет "query AI state" API
2. AI CLI = interactive REPL, не серверы
3. Context windows конечны и приватны — shared memory через файлы
4. Concurrent file edits = corruption (нужен claim system)
5. Kitty мощнее tmux по IPC, но нет headless (нужен display)
6. Сезон в апреле — реализация в межсезонье (до конца марта 2026)

### Что уже есть в PAI
- Kitty с `allow_remote_control` ✅
- MCP серверы в Claude Code ✅
- Gemini CLI с MCP ✅
- OpenCode с MCP ✅
- Hooks система ✅
- `agent-live.sh` мониторинг ✅
- Voice уведомления (ElevenLabs) ✅
- Memory система ✅
- `kitten @` используется в хуках (KittyEnvPersist, agent tabs) ✅

### Risks
- **R1:** Kitty `send-text` может случайно подтвердить permission prompt → нужен state detection
- **R2:** Infinite message loops (A→B→A→B) → max 3 exchanges per topic
- **R3:** Cognitive overload (3 AI одновременно) → Monitor tab + status highlighting
- **R4:** MCP server = single point of failure → stateless + auto-restart
- **R5:** Время: до начала сезона (апрель) ~2 недели → реалистичные фазы

### Plan

#### Архитектурное решение: MCP Bridge Server (Tier 2)

**Выбор:** MCP Bridge Server на bun (~200 LOC) как единый bridge для всех трёх CLI.

**Почему НЕ Tier 1 (File Bus):**
- Polling-based (AI проверяет inbox каждый ход, не в real-time)
- `kitten @ send-text '\n'` как "nudge" — хрупко, может подтвердить permission prompt
- Нет structured validation (парсинг JSON из файлов ненадёжен)

**Почему НЕ Tier 3 (Orchestrator):**
- Overengineered для текущих нужд (3 агента, 1 человек)
- Требует детерминистический state machine
- YAGNI — MVP сначала, orchestrator потом если нужен

**Почему Tier 2 (MCP Bridge):**
- MCP уже поддерживается всеми тремя CLI — zero custom code per AI
- Structured tool calls (validated JSON schema) — никакого text parsing
- Stateful server в памяти — claims, roster, context
- Один сервер, три клиента — минимум кода, максимум отдачи
- **Streamable HTTP transport** — один процесс, все клиенты по URL
- Monitor = HTTP polling endpoint на том же сервере
- Kitty IPC для UI enrichment (tab titles, status colors, get-text)

**Transport: Streamable HTTP (НЕ stdio)**
- stdio = каждый CLI запускает свой subprocess = 3 отдельных процесса = НЕТ shared state
- HTTP = один сервер-процесс на localhost:3847, все CLI подключаются по URL
- Все три CLI подтверждённо поддерживают HTTP transport:
  - Claude Code: `"url": "http://localhost:3847/mcp"` в .mcp.json
  - Gemini CLI: `gemini mcp add bridge http://localhost:3847/mcp -t http`
  - OpenCode: `"type": "remote", "url": "http://localhost:3847/mcp"` в opencode.json
- Monitor: GET /status endpoint на том же HTTP сервере (не MCP, просто JSON)

#### Компоненты системы

```
┌─────────────────────────────────────────────────────┐
│                    KITTY TERMINAL                    │
├────────────┬────────────┬────────────┬──────────────┤
│ Tab: Navi  │ Tab: Gemini│ Tab: OCode │ Tab: Monitor │
│ Claude Code│ Gemini CLI │ OpenCode   │ bridge-mon   │
│ HTTP MCP   │ HTTP MCP   │ HTTP MCP   │ HTTP poll    │
└──────┬─────┴──────┬─────┴──────┬─────┴──────┬───────┘
       │            │            │            │
       └────────────┼────────────┘            │
                    │ HTTP POST/SSE           │ GET /status
          ┌─────────▼──────────┐              │
          │  MCP Bridge Server │◄─────────────┘
          │  localhost:3847    │
          │  (bun, ~400 LOC)  │
          │                    │
          │  ┌──────────────┐  │
          │  │ Messages     │  │  inbox/outbox per agent
          │  │ Claims       │  │  file lock management
          │  │ Context      │  │  shared findings/decisions
          │  │ Roster       │  │  agent status tracking
          │  │ GET /status  │  │  JSON endpoint → Monitor
          │  └──────────────┘  │
          └────────────────────┘
```

#### MCP Tools (7 основных + 2 утилиты)

| Tool | Описание | Параметры |
|------|----------|-----------|
| `bridge_send` | Отправить сообщение агенту | to, subject, body, priority |
| `bridge_read` | Прочитать входящие сообщения | (none — returns pending) |
| `bridge_claim` | Забронировать файлы | files[], reason |
| `bridge_release` | Освободить бронь | files[] |
| `bridge_context_write` | Записать в shared context | key, value, category |
| `bridge_context_read` | Прочитать shared context | key? (all if omitted) |
| `bridge_roster` | Кто онлайн, что делает | (none) |
| `bridge_status` | Обновить свой статус | state (idle/thinking/editing/reviewing) |
| `bridge_history` | История сообщений за сессию | limit?, from_agent? |

#### Протокол безопасности

1. **Claim before edit** — AI должен вызвать `bridge_claim` перед редактированием файла
2. **Timeout claims** — 5 минут, автоматический release
3. **Max 3 exchanges** — после 3 обменов по теме → эскалация к человеку
4. **No re-delegation** — нельзя делегировать полученную задачу дальше
5. **Broadcast = info-only** — на broadcast-сообщения не нужно отвечать
6. **Human override** — Ivan может force-release любой claim через Monitor

#### Kitty Integration

| Kitty API | Использование в Bridge |
|-----------|----------------------|
| `kitten @ set-tab-color` | Красный = ждёт input, зелёный = работает, серый = idle |
| `kitten @ set-window-title` | Показывать текущий статус агента |
| `kitten @ get-text --extent last_cmd_output` | Monitor читает последний output |
| `kitten @ ls` | Roster: какие агенты запущены |
| `kitten @ send-text` | Emergency: послать Ctrl+C остановившемуся агенту |
| `set-user-vars` | Pub/sub: agent states через user variables |

#### Jules Tasks (блоки для делегирования)

**J1: MCP Bridge Server scaffolding** (~100 LOC)
- Bun + MCP SDK + TypeScript
- 9 tool definitions (schema + handlers)
- In-memory state (messages, claims, context, roster)
- Tests: 15+ unit tests для каждого tool

**J2: Bridge Monitor TUI** (~150 LOC)
- Bun + blessed/ink OR simple ANSI output
- WebSocket client → Bridge Server event stream
- Real-time message display с цветовой кодировкой
- Status panel: кто онлайн, claims, context size
- Tests: 5+ integration tests

**J3: Kitty Integration Layer** (~100 LOC)
- `kitty-bridge.ts` — wrapper для kitten @ commands
- Tab color management по agent status
- Window title updates
- Agent detection (kitten @ ls → parse)
- Tests: 8+ unit tests (mock kitten @)

**J4: Context Instruction Files** (~30 LOC each)
- Additions to CLAUDE.md: bridge protocol + tool descriptions
- Additions to GEMINI.md: bridge protocol
- Additions to AGENTS.md (OpenCode): bridge protocol
- Tests: validate instructions parse correctly

**J5: Bridge Launcher Script** (~50 LOC)
- `bridge-start.sh` — запуск всех компонентов
- Start MCP server, open Monitor tab, configure MCP in each CLI
- Graceful shutdown (stop server, clean claims)
- Tests: integration test (start → send message → verify → stop)

#### Тестовая стратегия

**Уровень 1: Unit tests** (Jules — J1)
- Каждый MCP tool: happy path + error cases
- Claim collision resolution
- Message routing
- Timeout expiry
- History limiting

**Уровень 2: Integration tests** (Jules — J5)
- Start server → connect 2 mock agents → send message → verify delivery
- Claim → conflict → deny → release → re-claim
- Context write from agent A → read from agent B

**Уровень 3: Chaos tests** (Navi)
- Simultaneous claims on same file
- Message flood (100 messages in 1 second)
- Agent crash mid-claim → timeout release
- Server restart → state recovery

**Уровень 4: Human acceptance test** (Ivan)
- Real task: "Fix auth middleware" with Claude + Gemini + OpenCode
- Claude архитектурит, Gemini ревьюит, OpenCode пишет тесты
- Ivan наблюдает в Monitor, вмешивается
- Success: все видно, все под контролем, никаких конфликтов

#### Предварительные шаги (до первой строчки кода)

По лучшим мировым практикам:

**Pre-1: Validate Kitty IPC** (30 мин)
- Проверить `kitten @ send-text --match title:X` работает между окнами
- Проверить `kitten @ get-text --extent last_cmd_output` читает output
- Проверить `kitten @ set-tab-color` меняет цвет вкладки
- Результат: подтверждение что Kitty API работает как документировано

**Pre-2: Validate MCP SDK** (30 мин)
- Scaffold минимальный MCP server на bun (1 tool: echo)
- Подключить к Claude Code через settings.json
- Убедиться tool call проходит → response возвращается
- Подключить к Gemini CLI → тот же тест
- Подключить к OpenCode → тот же тест
- Результат: подтверждение что один MCP server работает с 3 CLI

**Pre-3: Validate cross-agent message** (30 мин)
- Добавить bridge_send + bridge_read к echo server
- Claude вызывает bridge_send(to="gemini", body="test")
- Gemini вызывает bridge_read() → получает сообщение
- Результат: proof of concept что agent-to-agent messaging через MCP работает

**Pre-4: Architecture Decision Record** (1 час)
- Зафиксировать решения: MCP vs file bus, Kitty vs tmux, bun vs node
- Зафиксировать trade-offs: latency, reliability, complexity
- Review с Gemini CLI (second opinion на архитектуру)
- Результат: ADR в PRD/Decisions

**Pre-5: TELOS Update** (30 мин)
- Обновить G13 с Bridge подпроектом
- Обновить G14 Фаза 3 с Bridge как enabler
- Обновить P0 следующие шаги
- Результат: TELOS отражает Bridge как planned work

#### Фазы реализации

**Фаза 1: Foundation (день 1-2, ~6ч)**
1. Pre-1..Pre-3: валидация Kitty IPC, MCP SDK, cross-agent message
2. J1: MCP Bridge Server (Jules)
3. Unit tests для server (Jules)
4. Manual smoke test: Claude → bridge_send → Gemini → bridge_read

**Фаза 2: Visibility (день 3-4, ~4ч)**
1. J3: Kitty Integration Layer (Jules)
2. J2: Bridge Monitor TUI (Jules или Navi)
3. Tab colors по agent status
4. Window titles с текущим action
5. Integration tests

**Фаза 3: Protocol (день 5-6, ~4ч)**
1. J4: Context instruction files для всех CLI
2. Claim system + conflict resolution
3. Turn-taking protocol (max 3 exchanges)
4. Shared context (findings, decisions)
5. Chaos tests

**Фаза 4: Launch Script + Polish (день 7, ~3ч)**
1. J5: Bridge Launcher Script
2. Graceful shutdown
3. Error recovery (server crash → auto-restart)
4. Documentation (bridge protocol для бригады)

**Фаза 5: Human Acceptance (день 8, ~2ч)**
1. Real task с 3 AI агентами
2. Ivan наблюдает, вмешивается, оценивает
3. Feedback → adjustments
4. LEARN фиксация

#### Сценарии использования

**Сценарий 1: Code Review**
```
Ivan → Claude: "Добавь auth middleware в hooks/auth.ts"
Claude: bridge_claim(["hooks/auth.ts"]) → granted
Claude: пишет код
Claude: bridge_send(to="gemini", subject="Review auth.ts changes")
Gemini: bridge_read() → видит запрос
Gemini: читает hooks/auth.ts, пишет review
Gemini: bridge_send(to="claude", subject="Review: 2 issues found")
Claude: фиксит issues
Claude: bridge_release(["hooks/auth.ts"])
Claude: bridge_context_write("auth", "JWT middleware added, reviewed by Gemini")
```

**Сценарий 2: Research + Implementation**
```
Ivan → all: "Улучшить производительность калькулятора"
Gemini: bridge_claim(["research"]) → granted
Gemini: исследует подходы
Gemini: bridge_context_write("perf-research", {approaches: [...]})
Claude: bridge_context_read("perf-research")
Claude: выбирает подход, имплементирует
OpenCode: bridge_read() → видит запрос на тесты от Claude
OpenCode: пишет performance tests
```

**Сценарий 3: Parallel Development**
```
Ivan: "Добавить 3 страницы на сайт: /about, /pricing, /faq"
Claude: bridge_claim(["/about"]) → assigned to claude
Gemini: bridge_claim(["/pricing"]) → assigned to gemini
OpenCode: bridge_claim(["/faq"]) → assigned to opencode
Все: работают параллельно, bridge предотвращает конфликты
Claude: bridge_status("completed")
Gemini: bridge_status("completed")
OpenCode: bridge_status("completed")
Monitor: показывает "3/3 tasks done"
```

## Criteria

### Foundation (MCP Server)
- [ ] ISC-1 [B]: MCP Bridge Server запускается через `bun bridge/server.ts` (verify: process starts, logs "listening")
- [ ] ISC-2 [B]: `bridge_send` доставляет сообщение целевому агенту (verify: bridge_read returns sent message)
- [ ] ISC-3 [B]: `bridge_read` возвращает только непрочитанные сообщения (verify: second read returns empty)
- [ ] ISC-4 [B]: `bridge_claim` блокирует файл для одного агента (verify: second claim returns DENIED)
- [ ] ISC-5 [B]: `bridge_release` снимает блокировку файла (verify: claim after release succeeds)
- [ ] ISC-6 [B]: Claims expire after 5 minutes timeout (verify: claim succeeds after timeout without release)
- [ ] ISC-7 [B]: `bridge_context_write` сохраняет key-value в shared state (verify: context_read returns value)
- [ ] ISC-8 [B]: `bridge_context_read` без ключа возвращает весь контекст (verify: response contains all keys)
- [ ] ISC-9 [B]: `bridge_roster` показывает подключённых агентов и их статус (verify: roster includes agent after status update)
- [ ] ISC-10 [B]: `bridge_status` обновляет состояние агента в roster (verify: roster reflects new state)
- [ ] ISC-11 [B]: `bridge_history` возвращает N последних сообщений (verify: history with limit=5 returns 5)

### Kitty Integration
- [ ] ISC-12 [B]: Tab color меняется на красный когда агент ждёт input (verify: kitten @ get-tab-color)
- [ ] ISC-13 [B]: Tab color меняется на зелёный когда агент работает (verify: visual + kitten @)
- [ ] ISC-14 [B]: Window title содержит текущий статус агента (verify: kitten @ ls → title)
- [ ] ISC-15 [B]: `kitten @ ls` обнаруживает запущенных агентов по title/cmdline (verify: bridge_roster matches)

### Monitor
- [ ] ISC-16 [B]: Bridge Monitor отображает входящие сообщения в реальном времени (verify: send message → appears in monitor <2s)
- [ ] ISC-17 [B]: Monitor показывает текущие claims с владельцами (verify: claim → visible in monitor)
- [ ] ISC-18 [B]: Monitor показывает roster с цветовыми статусами (verify: status update → monitor reflects)
- [ ] ISC-19 [B]: Monitor работает в отдельном Kitty tab (verify: bridge-start.sh opens monitor tab)

### Protocol & Safety
- [ ] ISC-20 [B]: Максимум 3 обмена сообщениями на одну тему (verify: 4th message returns WARNING)
- [ ] ISC-21 [B]: Broadcast сообщения помечены type=broadcast (verify: broadcast message has type field)
- [ ] ISC-22 [B]: Конфликт claim → оба агента уведомлены (verify: denied claim triggers notification)
- [ ] ISC-23 [B]: Сервер переживает crash и восстанавливается (verify: kill → restart → claims empty, roster rebuilds)

### Context Instructions
- [ ] ISC-24 [B]: CLAUDE.md содержит bridge protocol описание (verify: grep bridge_send CLAUDE.md)
- [ ] ISC-25 [B]: GEMINI.md содержит bridge protocol описание (verify: grep bridge_send GEMINI.md)
- [ ] ISC-26 [B]: AGENTS.md (OpenCode) содержит bridge protocol описание (verify: grep bridge_send AGENTS.md)
- [ ] ISC-27 [B]: Каждый CLI может подключиться к Bridge MCP server (verify: mcpServers config exists for each)

### Launch & Lifecycle
- [ ] ISC-28 [B]: `bridge-start.sh` запускает server + monitor + configures MCPs (verify: all components running after script)
- [ ] ISC-29 [B]: `bridge-stop.sh` gracefully останавливает все компоненты (verify: no orphan processes)
- [ ] ISC-30 [B]: Server auto-restart при crash (verify: kill server → monitor shows reconnecting → server back)

### Tests
- [ ] ISC-31 [B]: Unit tests для каждого MCP tool (9 tools × 2+ cases = 18+ tests) (verify: bun test passes)
- [ ] ISC-32 [B]: Integration test: send message flow (verify: test script passes end-to-end)
- [ ] ISC-33 [B]: Integration test: claim conflict flow (verify: test script passes)
- [ ] ISC-34 [B]: Chaos test: 100 concurrent messages (verify: all delivered, no corruption)
- [ ] ISC-35 [B]: Chaos test: server crash mid-claim (verify: claims release after timeout)

### TELOS Integration
- [x] ISC-36 [B]: G13 обновлён с Bridge подпроектом и фазами (verify: read GOALS.md)
- [x] ISC-37 [B]: G14 Фаза 3 обновлена с Bridge как enabler (verify: read GOALS.md)
- [x] ISC-38 [B]: P0 следующие шаги включают Bridge (verify: read PROJECTS.md)

### Jules Tasks
- [ ] ISC-39 [B]: Jules task J1 создана для MCP Bridge Server (verify: jules task exists)
- [ ] ISC-40 [B]: Jules task J2 создана для Bridge Monitor (verify: jules task exists)
- [ ] ISC-41 [B]: Jules task J3 создана для Kitty Integration (verify: jules task exists)
- [x] ISC-42 [B]: Jules tasks содержат полные specs с test requirements (verify: task descriptions include test criteria)

### Anti-Criteria
- [ ] ISC-A-1: Anti: Bridge НЕ использует tmux (Kitty-native only)
- [ ] ISC-A-2: Anti: Bridge НЕ требует модификации AI CLI source code
- [ ] ISC-A-3: Anti: Bridge НЕ отправляет `kitten @ send-text '\n'` как "nudge" (хрупко)
- [ ] ISC-A-4: Anti: Агенты НЕ могут делегировать полученные задачи другим агентам

## Decisions

- 2026-03-16 19:00: Выбран Tier 2 (MCP Bridge) вместо Tier 1 (File Bus) — structured tools > file polling, MCP уже поддерживается всеми CLI
- 2026-03-16 19:00: Kitty-native вместо tmux — уникальная ниша, уже используем Kitty, богатый IPC
- 2026-03-16 19:00: Bun + TypeScript для сервера — consistency с PAI (hooks, tools), производительность
- 2026-03-16 19:00: In-memory state (не persistent) — stateless restart проще и безопаснее для MVP. Persistence = Phase 2
- 2026-03-16 19:00: Monitor как отдельный tab (не встроен в existing tabs) — separation of concerns, не засоряет рабочие окна
- 2026-03-16 19:00: Max 3 exchanges per topic — защита от infinite loops, proven pattern в multi-agent literature
- 2026-03-16 19:00: Claim timeout 5 min — баланс между "достаточно для работы" и "не блокирует надолго"
- 2026-03-16 21:30: [CRITICAL] Смена транспорта: stdio → Streamable HTTP. stdio = каждый CLI получает свой subprocess = 3 отдельных процесса без shared state. HTTP = один сервер на localhost:3847, все CLI подключаются по URL. Все три CLI подтверждённо поддерживают HTTP (Claude: url в .mcp.json, Gemini: --transport http, OpenCode: type: remote). Исследование: CodexResearcher audit
- 2026-03-16 21:30: Monitor: GET /status endpoint на том же HTTP сервере вместо WebSocket. Проще, не нужен отдельный протокол — monitor делает polling каждые 2s
- 2026-03-16 [Gemini]: РЕКОМЕНДАЦИЯ: Использовать HTTP заголовок `X-Agent-ID` для идентификации агента. Обоснование: Gemini CLI поддерживает кастомные заголовки, это чище чем Query params и надежнее чем сессии SDK.
- 2026-03-16 [Gemini]: РЕКОМЕНДАЦИЯ: Увеличить Claim Timeout до 10 минут (ISC-6) ИЛИ реализовать авто-продление при вызове `bridge_status("thinking")`. Обоснование: LLM может думать дольше 5 минут на сложных задачах.
- 2026-03-16 [Gemini]: РЕКОМЕНДАЦИЯ: Привязать счетчик обменов (ISC-20) строго к `conversation_id`. Обоснование: Это единственный надежный способ разделить темы внутри одной сессии.
- 2026-03-16 [OpenCode]: РЕКОМЕНДАЦИЯ: AGENT_ID должен извлекаться из HTTP заголовка `X-Agent-ID` при каждом запросе, а не из env при старте. Обоснование: Streamable HTTP transport = один серверный процесс, но разные сессии/запросы от разных агентов. Заголовок позволяет определять кто вызывает tool на уровне request, а не process. Альтернатива: query param `?agent_id=X`, но заголовок чище и не ломает MCP endpoint URL.
- 2026-03-16 [OpenCode]: РЕКОМЕНДАЦИЯ: Добавить валидацию входных данных на уровне tool schema: пустой `files[]` в bridge_claim должен возвращать ошибку до проверки conflicts. Обоснование: Fail fast, предотвращает бесполезные вызовы с некорректными параметрами. ISC-39 (тесты) требует проверки этого кейса.
- 2026-03-16 [OpenCode]: РЕКОМЕНДАЦИЯ: Предоставить утилитарные функции для работы с BridgeState в отдельном модуле `bridge/state.ts`. Обоснование: Разделение ответственности — server.ts отвечает только за HTTP/MCP layer, а state management выносится в отдельный модуль. Упрощает тестирование (unit tests без HTTP сервера) и позволяет переиспользовать state logic в Monitor (GET /status endpoint).
- 2026-03-16 [Navi]: РЕАЛИЗОВАНО: X-Agent-ID через AsyncLocalStorage. HTTP handler извлекает заголовок `X-Agent-ID`, оборачивает `transport.handleRequest()` в `agentContext.run(agentId, ...)`. Tool handlers читают через `getAgentId()`. Выбрано вместо custom transport wrapper (invasive) и session mapping (сложнее). Верифицировано: multi-agent тест с claude-code + opencode — оба в roster, сообщения маршрутизируются корректно.
- 2026-03-16 [Navi]: РЕАЛИЗОВАНО: Multi-session транспорт. WebStandardStreamableHTTPServerTransport = single-session. Для multi-agent bridge нужен transport-per-session: каждый `initialize` создаёт новую пару McpServer+Transport, sessions хранятся в Map<sessionId, transport>. Все сессии разделяют один stateManager singleton. Верифицировано: 2 параллельных агента, корректная маршрутизация сообщений.
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ: Внедрить `bridge_session_id` (Epoch), генерируемый при старте сервера. Обоснование: Позволяет агентам мгновенно обнаружить перезагрузку stateless сервера и аннулировать локальные claims, предотвращая конфликты правок (Сценарий Cascade Failure).
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ: Добавить активное обнаружение Deadlocks (циклов ожидания) в `StateManager.createClaims`. Обоснование: 5-минутный таймаут слишком инертен для интерактивной работы; при обнаружении цикла сервер должен принудительно освобождать ресурсы по приоритету.
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ: Реализовать автоматический broadcast "SYSTEM_RESET" при инициализации первой сессии после рестарта. Обоснование: Гарантирует, что все активные агенты синхронизируют свое состояние с "чистым" сервером.
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ: Строгая привязка `MAX_EXCHANGES_PER_TOPIC` к семантике темы через обязательную смену `conversation_id`. Обоснование: Предотвращает "размывание" лимита при смене темы внутри одной сессии и защищает от бесконечных циклов (Сценарий Topic Drift).
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ (FINAL REVIEW): Импортировать `kitty-bridge.ts` в `server.ts` для автоматизации UI (ISC-12..15). Обоснование: Текущая реализация J3 не используется сервером, что делает UI уведомления ручными.
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ (FINAL REVIEW): Добавить автоматическую инвалидацию claims в `stateManager` при детекции смены `bridge_session_id`. Обоснование: Защита от "фантомных" блокировок после рестарта сервера.
- 2026-03-17 [Gemini]: РЕКОМЕНДАЦИЯ (FINAL REVIEW): Реализовать авто-продление брони (heartbeat) при вызове `bridge_status("thinking")` или `bridge_status("editing")`. Обоснование: Предотвращает потерю ресурсов во время длительных пауз в работе LLM.

## Verification

**Выполненные ISC (PRD-планирование, 4/46):**
- [x] ISC-36: `grep "Workspace Bridge" PAI/USER/TELOS/GOALS.md` → G13 содержит "Bridge Phase 1..5", PRD ссылка
- [x] ISC-37: `grep "Workspace Bridge" PAI/USER/TELOS/GOALS.md` → G14 содержит "Workspace Bridge — MCP-based координация"
- [x] ISC-38: `grep "Workspace Bridge" PAI/USER/TELOS/PROJECTS.md` → P0 содержит подпроект Bridge с описанием
- [x] ISC-42: `cat MEMORY/WORK/20260316-190000_workspace-bridge-prd/jules-tasks.md | wc -l` → 186 строк, 4 задачи (J1/J2/J3/J5) с TypeScript interfaces, test specs, priorities

**Остальные ISC (35 TODO + 4 anti) — будут верифицированы при реализации Bridge (Phase 1-5)**

**Артефакты данного PRD:**
- PRD.md: 42 ISC + 4 anti-criteria, архитектура Tier 2 (MCP Bridge), 5 фаз, 5 pre-validation steps
- jules-tasks.md: 4 Jules задачи с полными specs (J1: Server ~300 LOC, J2: Monitor ~150 LOC, J3: Kitty ~100 LOC, J5: Launcher ~80 LOC)
- LEARN.md: reflections + patterns + actions
- TELOS: G13, G14, P0 обновлены
