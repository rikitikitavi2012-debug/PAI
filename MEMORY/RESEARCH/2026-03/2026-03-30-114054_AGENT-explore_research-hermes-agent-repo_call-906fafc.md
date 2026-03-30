# Research Hermes Agent repo

**Agent:** Explore
**Captured:** 2026-03-30T11:40:54+03:00
**Tool Use ID:** call_906fafca3e8f489c9131cf69
**Tokens:** 94026
**Duration:** 168s
**Source:** PostToolUse hook capture

---

Теперь у меня достаточно информации для составления полного отчёта. Вот структурированный анализ:

---

# Структурированный отчёт: Hermes Agent (Nous Research)

## 1. Основная концепция -- что такое Hermes, какую проблему решает

Hermes Agent -- это **self-improving AI-агент** с полным жизненным циклом обучения из опыта. Он решает проблему создания агента, который:

- **Не привязан к одной модели**: поддерживает OpenRouter (200+ моделей), OpenAI, Anthropic, Nous Portal, Kimi/Moonshot, MiniMax, собственные эндпоинты
- **Не привязан к одному устройству**: работает на $5 VPS, GPU-кластере, серверлесс-инфраструктуре (Modal, Daytona)
- **Не привязан к одной платформе общения**: Telegram, Discord, Slack, WhatsApp, Signal, Email, CLI, SMS, Webhook, Home Assistant, Feishu, DingTalk, WeCom, Mattermost, Matrix
- **Обучается на собственном опыте**: создаёт навыки (skills) из сложных задач, улучшает их при использовании, запоминает факты в persistent memory

Ключевая философия: **закрытый цикл обучения** (closed learning loop). Агент не просто вызывает инструменты -- он рефлексирует, создаёт навыки, помнит предпочтения пользователя через сессии.

**Цитата из README**: "It's the only agent with a built-in learning loop -- it creates skills from experience, improves them during use, nudges itself to persist knowledge, searches its own past conversations, and builds a deepening model of who you are across sessions."

---

## 2. Архитектура -- ключевые компоненты

### 2.1 Общая структура проекта

Из `/tmp/hermes-agent/AGENTS.md` (строки 13-64):

```
hermes-agent/
├── run_agent.py          # AIAgent -- core conversation loop
├── model_tools.py        # Tool orchestration, discovery, dispatch
├── toolsets.py           # Toolset definitions, _HERMES_CORE_TOOLS list
├── cli.py                # HermesCLI -- interactive CLI orchestrator
├── hermes_state.py       # SessionDB -- SQLite session store (FTS5 search)
├── agent/                # Agent internals (prompt, compression, caching, etc.)
├── tools/                # Tool implementations (one file per tool)
│   ├── registry.py       # Central tool registry
│   ├── terminal_tool.py  # Terminal (local, docker, modal, ssh, daytona, singularity)
│   ├── file_tools.py     # File read/write/search/patch
│   ├── web_tools.py      # Web search/extract
│   ├── browser_tool.py   # Browser automation
│   ├── code_execution_tool.py # execute_code sandbox (Programmatic Tool Calling)
│   ├── delegate_tool.py  # Subagent delegation
│   ├── mcp_tool.py       # MCP client
│   └── memory_tool.py    # Persistent curated memory
├── gateway/              # Messaging platform gateway
│   ├── run.py            # Main loop, slash commands, message dispatch
│   ├── session.py        # SessionStore -- conversation persistence
│   └── platforms/        # Adapters: telegram, discord, slack, whatsapp, etc.
├── acp_adapter/          # ACP server (VS Code / Zed / JetBrains integration)
├── cron/                 # Scheduler (jobs.py, scheduler.py)
├── environments/         # RL training environments (Atropos)
├── skills/               # Bundled skills (26 categories)
└── batch_runner.py       # Parallel batch processing
```

### 2.2 Цепочка зависимостей

Из `/tmp/hermes-agent/AGENTS.md` (строки 68-78):

```
tools/registry.py  (no deps -- imported by all tool files)
       |
tools/*.py  (each calls registry.register() at import time)
       |
model_tools.py  (imports tools/registry + triggers tool discovery)
       |
run_agent.py, cli.py, batch_runner.py, environments/
```

### 2.3 Двухмодовая архитектура (для RL)

Из `/tmp/hermes-agent/environments/hermes_base_env.py` (строки 180-199):

```python
class HermesAgentBaseEnv(BaseEnv):
    """
    Handles two modes of operation:
    - Phase 1 (OpenAI server type): Uses server.chat_completion() directly.
      The server handles tool call parsing natively. Good for SFT data gen.
    - Phase 2 (VLLM server type): Uses ManagedServer for exact token IDs + logprobs
      via /generate. Client-side tool call parser reconstructs structured tool_calls
      from raw output. Full RL training capability.
    """
```

Это уникальная архитектура, позволяющая использовать Hermes как для продакшн-агента (Phase 1), так и для RL-тренировки новых моделей (Phase 2 с точным отслеживанием токенов).

### 2.4 Gateway (мультиплатформенность)

Из `/tmp/hermes-agent/gateway/run.py` -- единый процесс-шлюз, который одновременно подключается ко всем сконфигурированным платформам. Каждая платформа -- отдельный адаптер в `gateway/platforms/`. Сообщения приходят, создают `AIAgent` сессию, результат отправляется обратно.

---

## 3. Использование LLM -- модели и промптинг

### 3.1 Модели

Из `/tmp/hermes-agent/run_agent.py` (строка 470):

```python
class AIAgent:
    def __init__(self, model: str = "anthropic/claude-opus-4.6", ...):
```

Поддерживаемые провайдеры (из кода):
- **OpenRouter** (по умолчанию, 200+ моделей) -- `https://openrouter.ai/api/v1`
- **Anthropic** (нативный Messages API) -- `api.anthropic.com`
- **OpenAI** (Codex Responses API для GPT-5.x)
- **Nous Portal** -- `https://inference-api.nousresearch.com/v1`
- **Kimi/Moonshot**, **MiniMax**, **AI Gateway**, любые OpenAI-совместимые эндпоинты

Для summarization/context compression используется вспомогательная модель (дешёвая/быстрая):
- По умолчанию: `google/gemini-3-flash-preview` (из `/tmp/hermes-agent/trajectory_compressor.py`, строка 74)

### 3.2 Системный промпт

Системный промпт собирается из нескольких слоёв (`/tmp/hermes-agent/agent/prompt_builder.py`):

**Идентичность** (строки 134-142):
```python
DEFAULT_AGENT_IDENTITY = (
    "You are Hermes Agent, an intelligent AI assistant created by Nous Research. "
    "You are helpful, knowledgeable, and direct. You assist users with a wide "
    "range of tasks including answering questions, writing and editing code, "
    "analyzing information, creative work, and executing actions via your tools. "
    "You communicate clearly, admit uncertainty when appropriate, and prioritize "
    "being genuinely useful over being verbose unless otherwise directed below. "
    "Be targeted and efficient in your exploration and investigations."
)
```

**Memory Guidance** (строки 144-156):
```python
MEMORY_GUIDANCE = (
    "You have persistent memory across sessions. Save durable facts using the memory "
    "tool: user preferences, environment details, tool quirks, and stable conventions. "
    "Memory is injected into every turn, so keep it compact and focused on facts that "
    "will still matter later.\n"
    "Prioritize what reduces future user steering -- the most valuable memory is one "
    "that prevents the user from having to correct or remind you again. "
    ...
)
```

**Skills Guidance** (строки 164-171) -- указание агенту создавать навыки после сложных задач.

**Tool Use Enforcement** (строки 173-186) -- для моделей, которые "ленятся" вызывать инструменты:
```python
TOOL_USE_ENFORCEMENT_GUIDANCE = (
    "# Tool-use enforcement\n"
    "You MUST use your tools to take action -- do not describe what you would do "
    "or plan to do without actually doing it. When you say you will perform an "
    "action (e.g. 'I will run the tests', 'Let me check the file', 'I will create "
    "the project'), you MUST immediately make the corresponding tool call in the same "
    "response. Never end your turn with a promise of future action -- execute it now.\n"
    ...
)
TOOL_USE_ENFORCEMENT_MODELS = ("gpt", "codex")  # применяется только к GPT/Codex
```

**Platform Hints** (строки 192-259) -- платформо-специфичные инструкции (Telegram: "не используй markdown", Email: "plain text, concise", Cron: "нет пользователя, работай автономно").

### 3.3 Context Files

Из `/tmp/hermes-agent/agent/prompt_builder.py` (строки 777-816) -- иерархия контекстных файлов:

```
1. .hermes.md / HERMES.md  (walk to git root)
2. AGENTS.md / agents.md   (cwd only)
3. CLAUDE.md / claude.md   (cwd only)
4. .cursorrules            (cwd only)
+ SOUL.md (from HERMES_HOME, always)
```

Первый найденный выигрывает. Каждый файл сканируется на prompt injection перед инъекцией.

### 3.4 Prompt Caching

Из `/tmp/hermes-agent/run_agent.py` (строки 661-667):
```python
# Anthropic prompt caching: auto-enabled for Claude models via OpenRouter.
# Reduces input costs by ~75% on multi-turn conversations.
is_openrouter = self._is_openrouter_url()
is_claude = "claude" in self.model.lower()
is_native_anthropic = self.api_mode == "anthropic_messages"
self._use_prompt_caching = (is_openrouter and is_claude) or is_native_anthropic
```

---

## 4. Tools/Function Calling

### 4.1 Registry Pattern

Центральный реестр инструментов (`/tmp/hermes-agent/tools/registry.py`):

```python
class ToolRegistry:
    def register(self, name, toolset, schema, handler, check_fn=None, 
                 requires_env=None, is_async=False, ...):
        """Register a tool. Called at module-import time by each tool file."""
        self._tools[name] = ToolEntry(name, toolset, schema, handler, ...)

    def get_definitions(self, tool_names: Set[str], quiet=False) -> List[dict]:
        """Return OpenAI-format tool schemas for requested tool names.
        Only tools whose check_fn() returns True are included."""
        
    def dispatch(self, name: str, args: dict, **kwargs) -> str:
        """Execute a tool handler by name. 
        Async handlers are bridged automatically."""
```

Каждый файл с инструментом при импорте вызывает `registry.register()`. Пример регистрации (шаблон из кода):

```python
registry.register(
    name="terminal",
    toolset="terminal",
    schema={...},  # OpenAI function calling format
    handler=terminal_handler,
    check_fn=lambda: os.getenv("TERMINAL_ENV") is not None,
    is_async=False,
)
```

### 4.2 Toolset System

Из `/tmp/hermes-agent/toolsets.py` -- инструменты группируются в toolsets с композицией:

```python
TOOLSETS = {
    "web": {"tools": ["web_search", "web_extract"], "includes": []},
    "terminal": {"tools": ["terminal", "process"], "includes": []},
    "browser": {"tools": ["browser_navigate", "browser_snapshot", ...], "includes": []},
    "debugging": {"tools": ["terminal", "process"], "includes": ["web", "file"]},
    "safe": {"tools": ["mixture_of_agents"], "includes": ["web", "vision", "image_gen"]},
    "hermes-cli": {"tools": _HERMES_CORE_TOOLS, "includes": []},
    # 26+ toolsets...
}
```

`resolve_toolset()` рекурсивно разворачивает `includes` (diamond-safe).

### 4.3 Core Tools (40+)

Из `/tmp/hermes-agent/toolsets.py` (строки 31-67), полный набор:

| Категория | Инструменты |
|---|---|
| Web | `web_search`, `web_extract` |
| Terminal | `terminal`, `process` |
| Files | `read_file`, `write_file`, `patch`, `search_files` |
| Vision | `vision_analyze`, `image_generate` |
| Browser | `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_scroll`, ... (11 инструментов) |
| Planning | `todo`, `memory`, `session_search` |
| Skills | `skills_list`, `skill_view`, `skill_manage` |
| Execution | `execute_code`, `delegate_task` |
| Communication | `send_message`, `clarify`, `text_to_speech` |
| Automation | `cronjob` |
| Advanced | `mixture_of_agents` |
| Smart Home | `ha_list_entities`, `ha_get_state`, `ha_list_services`, `ha_call_service` |
| User Modeling | `honcho_context`, `honcho_profile`, `honcho_search`, `honcho_conclude` |

### 4.4 Agent Loop

Из `/tmp/hermes-agent/environments/agent_loop.py` (строки 196-500) и AGENTS.md (строки 110-124):

```python
# Core loop pattern:
while turn < max_turns:
    response = server.chat_completion(messages=messages, tools=tool_schemas, ...)
    
    if response.tool_calls:
        for tool_call in response.tool_calls:
            result = handle_function_call(tool_call.name, tool_call.args, task_id)
            messages.append({"role": "tool", "content": result})
    else:
        return  # Model finished naturally
```

Особенности:
- **Parallel tool execution**: некоторые инструменты могут выполняться параллельно (строки 219-311 в run_agent.py)
- **Budget warnings**: предупреждения при приближении к лимиту итераций (строки 669-674)
- **Fallback parser**: если сервер не вернул structured tool_calls, используется fallback-парсер для raw `<tool_call>ExitWorktree</tool_call>