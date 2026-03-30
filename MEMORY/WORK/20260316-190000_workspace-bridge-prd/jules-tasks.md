# Jules Tasks для Workspace Bridge

## J1: MCP Bridge Server

**Приоритет:** P0 (первый)
**Зависимости:** Нет
**Estimated LOC:** ~300
**Repo:** ~/.claude (PAI personal)
**Path:** bridge/server.ts

### Описание
Создать MCP сервер на bun + @modelcontextprotocol/sdk с 9 tools для координации AI-агентов. Сервер хранит state в памяти (Map/Set). Каждый tool принимает `agent_id` через env AGENT_ID при подключении.

### Спецификация Tools

```typescript
// bridge_send: отправить сообщение
// Input: { to: string, subject: string, body: string, priority?: "normal"|"high" }
// Output: { delivered: true, queue_depth: number }

// bridge_read: прочитать входящие
// Input: {} (none)
// Output: { messages: Message[] }  // marks as read

// bridge_claim: забронировать файлы
// Input: { files: string[], reason: string }
// Output: { granted: boolean, conflicts?: { file: string, owner: string }[] }

// bridge_release: освободить бронь
// Input: { files: string[] }
// Output: { released: string[] }

// bridge_context_write: записать в shared context
// Input: { key: string, value: any, category?: string }
// Output: { written: true }

// bridge_context_read: прочитать shared context
// Input: { key?: string }
// Output: { context: Record<string, any> }

// bridge_roster: кто онлайн
// Input: {}
// Output: { agents: { id: string, status: string, last_seen: number }[] }

// bridge_status: обновить свой статус
// Input: { state: "idle"|"thinking"|"editing"|"reviewing"|"waiting" }
// Output: { updated: true }

// bridge_history: история сообщений
// Input: { limit?: number, from_agent?: string }
// Output: { messages: Message[] }
```

### Структура данных

```typescript
interface Message {
  id: string;           // nanoid
  from: string;         // agent_id sender
  to: string;           // agent_id recipient, or "broadcast"
  subject: string;
  body: string;
  priority: "normal" | "high";
  type: "request" | "response" | "broadcast" | "info";
  timestamp: number;
  read: boolean;
  conversation_id?: string;  // для tracking exchanges
}

interface Claim {
  file: string;
  agent: string;
  reason: string;
  timestamp: number;  // для 5min timeout
}

interface AgentStatus {
  id: string;
  state: "idle" | "thinking" | "editing" | "reviewing" | "waiting";
  last_seen: number;
}
```

### Правила
- Claims expire после 5 минут (Date.now() - claim.timestamp > 300_000)
- bridge_read помечает сообщения как read
- bridge_send с to="broadcast" доставляет всем кроме sender
- exchange tracking: conversation_id группирует обмены, max 3 per conversation
- Сервер логирует все операции в stdout для Monitor

### Тесты (обязательно)
1. `bridge-server.test.ts` — 18+ unit tests:
   - send message → read returns it
   - read marks as read, second read empty
   - claim file → success
   - claim occupied file → denied
   - claim after timeout → success
   - release file → re-claimable
   - context write → read returns value
   - context read all → returns everything
   - roster empty initially
   - status update → roster reflects
   - history with limit
   - broadcast delivery to all
   - conversation exchange limit (3 max)
   - concurrent claims on different files → all succeed
   - high priority message ordering
   - agent disconnect → roster cleanup
   - empty message body → error
   - claim with empty files[] → error

---

## J2: Bridge Monitor TUI

**Приоритет:** P1 (после J1)
**Зависимости:** J1 (server must be running)
**Estimated LOC:** ~150
**Path:** bridge/monitor.ts

### Описание
CLI-приложение которое подключается к Bridge Server через WebSocket и отображает real-time activity в терминале. Формат — ANSI-colored text output (не TUI фреймворк). Запускается в отдельном Kitty tab.

### Секции вывода

```
╔═══════════════════════════════════════════════════╗
║  WORKSPACE BRIDGE MONITOR  │  uptime: 2h 15m     ║
╠═══════════════════════════════════════════════════╣
║  ROSTER                                           ║
║  🟢 claude   │ editing hooks/auth.ts    │ 2m ago  ║
║  🟡 gemini   │ idle                     │ 30s ago ║
║  ⚪ opencode │ offline                  │ —       ║
╠═══════════════════════════════════════════════════╣
║  CLAIMS                                           ║
║  hooks/auth.ts → claude (claimed 2m ago)          ║
║  tests/auth.test.ts → (free)                      ║
╠═══════════════════════════════════════════════════╣
║  MESSAGES (last 10)                               ║
║  19:05 claude→gemini: Review auth middleware      ║
║  19:06 gemini→claude: 2 issues found              ║
║  19:07 claude→broadcast: Auth middleware complete  ║
╠═══════════════════════════════════════════════════╣
║  CONTEXT (shared)                                 ║
║  auth: "JWT middleware added, reviewed"            ║
║  perf-research: {3 approaches listed}              ║
╚═══════════════════════════════════════════════════╝
```

### Обновление
- WebSocket подключение к Bridge Server (ws://localhost:PORT/stream)
- При каждом событии (message, claim, status) → перерисовка секции
- Fallback: polling Bridge Server REST endpoint каждые 2 секунды

### Тесты
1. `bridge-monitor.test.ts` — 5+ tests:
   - Connects to server WebSocket
   - Renders roster correctly
   - Updates on new message event
   - Updates on claim event
   - Handles server disconnect/reconnect

---

## J3: Kitty Integration Layer

**Приоритет:** P1 (параллельно с J2)
**Зависимости:** J1
**Estimated LOC:** ~100
**Path:** bridge/kitty-bridge.ts

### Описание
TypeScript модуль, обёртка над `kitten @` для управления Kitty из Bridge Server. Используется сервером для обновления tab colors/titles.

### API

```typescript
// Обнаружить запущенных агентов
async function detectAgents(): Promise<KittyWindow[]>

// Установить tab title
async function setTabTitle(match: string, title: string): Promise<void>

// Установить tab color (если поддерживается)
async function setTabColor(match: string, color: string): Promise<void>

// Отправить текст в окно (emergency only — Ctrl+C)
async function sendText(match: string, text: string): Promise<void>

// Прочитать последний output окна
async function getLastOutput(match: string): Promise<string>

// Полный JSON ls
async function listWindows(): Promise<KittyState>
```

### Реализация
Все функции = `Bun.spawn(["kitten", "@", ...args])` + parse stdout.

### Тесты
1. `kitty-bridge.test.ts` — 8+ tests:
   - detectAgents returns window list
   - setTabTitle calls kitten @ with correct args
   - setTabColor calls kitten @ (or skips if unsupported)
   - sendText escapes special characters
   - getLastOutput parses text correctly
   - listWindows parses JSON
   - handles kitten @ not found gracefully
   - handles connection refused gracefully

---

## J5: Bridge Launcher Script

**Приоритет:** P2 (после J1-J3)
**Зависимости:** J1, J2, J3
**Estimated LOC:** ~80
**Path:** scripts/bridge-start.sh, scripts/bridge-stop.sh

### Описание
Bash скрипты для запуска и остановки всей Bridge инфраструктуры.

### bridge-start.sh
1. Проверить что Kitty running (`kitten @ ls` не ошибка)
2. Запустить MCP Bridge Server в фоне (`bun bridge/server.ts &`)
3. Сохранить PID в `/tmp/bridge-server.pid`
4. Открыть Monitor tab (`kitten @ launch --type=tab --title="Bridge Monitor" bun bridge/monitor.ts`)
5. Вывести status: "Bridge started: server PID=X, monitor tab opened"
6. Watchdog: если server умирает → перезапуск

### bridge-stop.sh
1. Прочитать PID из `/tmp/bridge-server.pid`
2. Graceful stop: SIGTERM → wait 3s → SIGKILL
3. Закрыть Monitor tab: `kitten @ close-tab --match title:"Bridge Monitor"`
4. Удалить PID file
5. Вывести status: "Bridge stopped"

### Тесты
1. `bridge-launcher.test.ts` — 5+ tests:
   - start creates PID file
   - start opens monitor tab
   - stop kills server process
   - stop closes monitor tab
   - double start → error (already running)
