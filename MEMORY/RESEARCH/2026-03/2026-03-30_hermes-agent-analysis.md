---
name: Hermes Agent Analysis
description: Ключевые инсайты из nousresearch/hermes-agent для PAI
type: reference
created: 2026-03-30
---

# Hermes Agent — Analysis for PAI

## Что позаимствовали

### 1. Session Search (FTS5) → PAI `/recall` skill
**Из:** `hermes_state.py` — SessionDB с FTS5 полнотекстовым поиском
**Реализовано:** `PAI/Tools/SessionSearch/` + `/recall` skill

```
/recall <query> [limit]
```

Features:
- FTS5 с BM25 ranking
- Fallback LIKE для Unicode/Russian
- Snippet highlighting
- Session grouping

## Что можно применить

### 2. Memory Guidance Pattern
**Из:** `agent/prompt_builder.py` (строки 144-156)

```python
MEMORY_GUIDANCE = (
    "You have persistent memory across sessions. Save durable facts using the memory "
    "tool: user preferences, environment details, tool quirks, and stable conventions. "
    "Memory is injected into every turn, so keep it compact and focused on facts that "
    "will still matter later.\n"
    "Prioritize what reduces future user steering -- the most valuable memory is one "
    "that prevents the user from having to correct or remind you again."
)
```

**Применение:** Добавить секцию в Algorithm v4.1 про MEMORY discipline

### 3. Tool-use Enforcement
**Из:** `agent/prompt_builder.py` (строки 173-186)

```python
TOOL_USE_ENFORCEMENT_GUIDANCE = (
    "# Tool-use enforcement\n"
    "You MUST use your tools to take action -- do not describe what you would do "
    "or plan to do without actually doing it. When you say you will perform an "
    "action (e.g. 'I will run the tests', 'Let me check the file', 'I will create "
    "the project'), you MUST immediately make the corresponding tool call in the same "
    "response. Never end your turn with a promise of future action -- execute it now.\n"
)
TOOL_USE_ENFORCEMENT_MODELS = ("gpt", "codex")  # применяется только к GPT/Codex
```

**Применение:** У нас уже есть VERIFICATION RIGOR — это дополняет

### 4. Context Files Hierarchy
**Из:** `agent/prompt_builder.py` (строки 777-816)

Иерархия загрузки контекста:
```
1. .hermes.md / HERMES.md  (walk to git root)
2. AGENTS.md / agents.md   (cwd only)
3. CLAUDE.md / claude.md   (cwd only)
4. .cursorrules            (cwd only)
+ SOUL.md (from HERMES_HOME, always)
```

**Применение:** У нас CLAUDE.md + AGENTS.md уже есть. Можно добавить SOUL.md как "личность"

### 5. Prompt Caching Auto-detection
**Из:** `run_agent.py` (строки 661-667)

```python
is_openrouter = self._is_openrouter_url()
is_claude = "claude" in self.model.lower()
self._use_prompt_caching = (is_openrouter and is_claude) or is_native_anthropic
```

**Применение:** PAI использует Claude напрямую — caching уже работает

### 6. Platform Hints (Platform-specific prompts)
**Из:** `agent/prompt_builder.py` (строки 192-259)

Разные инструкции для разных платформ:
- Telegram: "не используй markdown"
- Email: "plain text, concise"
- Cron: "нет пользователя, работай автономно"

**Применение:** Можно добавить для разных контекстов PAI (CLI vs Web vs API)

### 7. Skills System (create from experience)
**Из:** `skills/` directory + `agent/prompt_builder.py` (строки 164-171)

Hermes создаёт skills после сложных задач и улучшает их при использовании.

**Применение:** PAI skills уже есть, но нет автоматического создания. Можно добавить hook для LEARN phase

## Архитектурные идеи

### Toolset Composition
```python
TOOLSETS = {
    "debugging": {"tools": ["terminal", "process"], "includes": ["web", "file"]},
    "safe": {"tools": ["mixture_of_agents"], "includes": ["web", "vision", "image_gen"]},
}
```

`resolve_toolset()` рекурсивно разворачивает includes.

**Применение:** Можно использовать для skill composition в PAI

### Two-mode Architecture (RL + Production)
**Из:** `environments/hermes_base_env.py`

- Phase 1: OpenAI server — native tool call parsing (SFT data gen)
- Phase 2: VLLM server — exact token IDs + logprobs (full RL training)

**Применение:** Если будем делать RL training для PAI

### Parallel Tool Execution
**Из:** `run_agent.py` (строки 219-311)

Некоторые инструменты выполняются параллельно.

**Применение:** Уже есть в PAI — parallel agents

## Что НЕ нужно

- **Multi-platform gateway** — PAI работает только в Claude Code CLI
- **RL environments (Atropos)** — пока не тренируем модели
- **40+ tools** — PAI использует tools Claude Code напрямую
- **Home Assistant** — не используем smart home

## Итог

**Применено:**
1. ✅ FTS5 Session Search → `/recall` skill

**Кандидаты для v4.1:**
1. Memory Guidance паттерн
2. Tool-use Enforcement (для GPT моделей если будут)
3. SOUL.md концепция
4. Platform Hints для контекстов
5. Skill composition через includes
