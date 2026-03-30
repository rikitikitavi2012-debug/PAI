# Workspace Bridge — Индекс исследований

7 параллельных исследовательских агентов + Gemini CLI. Запущены 2026-03-16.

## Отчёты агентов (JSONL транскрипты)

Полные транскрипты в `~/.claude/projects/-home-ser--claude/ecf8e0b3-6eba-4bc2-bf6b-2bddb5c807e6/subagents/`:

| Агент | Фокус | Файл | Размер |
|-------|-------|------|--------|
| **ClaudeResearcher** | Фреймворки оркестрации (CrewAI, AutoGen, LangGraph), MCP+A2A протоколы, CHI 2026 paper | `agent-a654b35ce122a5f58.jsonl` | 156 KB |
| **Architect** | 3-tier архитектура (File Bus → MCP Bridge → War Room), risk assessment, MVP plan | `agent-a7f83e195e8e44a89.jsonl` | 162 KB |
| **PerplexityResearcher** | 30+ проектов multi-AI workspace (Claude Squad, AionUi, Architect, Mux, etc.) | `agent-a21b1adc9bec70f13.jsonl` | 220 KB |
| **GrokResearcher** | 40+ проектов bridge/orchestration, Kitty gap analysis, IPC protocols | `agent-a0dee5e9e48d60d14.jsonl` | 232 KB |
| **GeminiResearcher** | tmux-mcp-rs, Agent-Deck, Zellij, WezTerm AI, Claude Code Agent Teams deep dive | `agent-a9459262dcefb1861.jsonl` | 257 KB |
| **CodexResearcher** | Kitty IPC 35+ команд, send-text/get-text/watchers/kittens, wire protocol, encryption | `agent-a61b488668601e4f3.jsonl` | 290 KB |

## Gemini CLI отчёт (компактный)

| Агент | Фокус | Файл |
|-------|-------|------|
| **Gemini 2.5 Pro** | Skynet, Parallel Code, Kitty IPC, A2A протокол, MVP план | `research-gemini-cli.txt` (local copy) |

## Ключевые находки (синтез всех 7 отчётов)

1. **40+ проектов** multi-agent terminal orchestration (Oct 2025 — Mar 2026)
2. **Все на tmux** — Kitty-native = пустая ниша
3. **Git worktrees** = универсальный примитив изоляции
4. **MCP** = стандарт де-факто для tool integration
5. **A2A** (Google) = agent-to-agent протокол, joint spec с MCP в Q3 2026
6. **CHI 2026 paper** "Terminal Is All You Need" — валидация терминала
7. **kitty-mcp** уже существует (den-tanui/kitty-mcp)
8. **Claude IPC MCP** — agent-to-agent через MCP (jdez427/claude-ipc-mcp)
9. **Kitty IPC** — 35+ remote control команд, encrypted (X25519+AES-256-GCM)
10. **Filesystem coordination beats complex IPC** — JSON files as message bus is the dominant pattern
