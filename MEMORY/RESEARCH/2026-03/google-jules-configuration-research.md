# Google Jules: Complete Configuration Research

**Date:** 2026-03-13
**Agent:** Intern
**Status:** Comprehensive research complete

## 1. Configuration Overview

Jules has configuration at 3 levels: **Global Settings** (jules.google.com/settings), **Repository Settings** (per-repo), and **Task-level** (per prompt/session).

---

## 2. AGENTS.md — Primary Instruction File

- Jules reads `AGENTS.md` from repo root automatically before every task
- Supports hierarchical placement: closest AGENTS.md to edited file wins
- Standard Markdown format, no schema, no required fields
- Shared format with Codex, Cursor, Copilot, Claude Code, Windsurf
- Can include: coding standards, architectural patterns, tool usage, conventions, build steps, test commands
- **Does NOT read CLAUDE.md, JULES.md, or GEMINI.md** — only AGENTS.md

## 3. Language Settings

- **UI Language:** English only. No language selector in UI or API
- **No `language` parameter** in API session creation
- **No language field** in AGENTS.md spec
- **Workaround (unverified):** Could try adding "Respond in Russian" to AGENTS.md or task prompt — since Jules uses Gemini 2.5/3 Pro which supports Russian, it might comply, but this is not officially supported
- Programming languages: JavaScript/TypeScript, Python, Go, Java, Rust (best support), language-agnostic in principle

## 4. Global Settings (jules.google.com)

| Setting | Location | Options |
|---------|----------|---------|
| Theme | UI | Dark, Light, Auto |
| Notifications | Settings > Notifications | Enable/Disable browser notifications |
| Commit Authoring | Settings > Commit Authoring | Jules-only (default), Co-authored (Jules+You or You+Jules), User-only |
| Reactive Mode | Settings (global) | On/Off — when On, Jules only acts on @Jules mentions in PR comments |
| API Keys | Settings | Create up to 3 API keys |
| MCP Integrations | Settings > MCP | Linear, Stitch, Neon, Tinybird, Context7, Supabase (requires API keys) |

## 5. Repository Settings (per-repo)

| Setting | Location | Description |
|---------|----------|-------------|
| Environment Setup Script | Configuration > Environment | Shell commands run before each task (npm install, etc.) |
| Environment Variables | Repo Settings | Key-value pairs available to tasks |
| Environment Snapshot | Configuration | Cached after "Run and Snapshot" for faster task starts |
| Memory (Knowledge) | Repo Settings > Knowledge | On/Off toggle. Jules learns preferences/corrections per repo |
| Suggested Tasks (Proactivity) | Repo page toggle | On/Off. Scans for #TODO comments. Max 5 repos |
| Scheduled Tasks | Repo > Scheduled tab | Frequency: Daily/Weekly. Custom prompt. No edit (delete+recreate) |

## 6. Task Creation Options (Web UI)

| Parameter | Description |
|-----------|-------------|
| Prompt | Task description (free text) |
| Repository | Select connected repo |
| Branch | Target branch (defaults to main/default) |
| Environment variables | Toggle which repo-level env vars to include |

**NOT available in Web UI:** Model selection (auto), language, system instructions, custom persona.

## 7. API Parameters (POST /v1alpha/sessions)

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | Task description |
| `title` | string | No | Session title (auto-generated if omitted) |
| `sourceContext` | SourceContext | No | Repo + branch context |
| `requirePlanApproval` | boolean | No | If true, plans need manual approval |
| `automationMode` | enum | No | `AUTO_CREATE_PR` for automatic PRs |

**SourceContext contains:** `source` (resource name) + `githubRepoContext.startingBranch`

**NOT in API:** language, system instructions, custom instructions, model selection, temperature, persona.

**Other API endpoints:** GET/DELETE sessions, POST sendMessage, POST approvePlan, GET activities, GET sources.

## 8. Jules Tools CLI (npm @google/jules)

| Command | Key Flags |
|---------|-----------|
| `jules` | Interactive TUI mode |
| `jules login/logout` | Authentication |
| `jules remote new` | `--repo`, `--session "<prompt>"`, `--parallel <n>` |
| `jules remote list` | `--repo`, `--session` |
| `jules remote pull` | `--session <id>` |
| Global | `--theme dark/light`, `-h/--help` |

**NOT in CLI:** language, instructions, model, system prompt flags.

## 9. Gemini CLI Extension

- Install: `gemini extensions install https://github.com/gemini-cli-extensions/jules --auto-update`
- Usage: `/jules [task description]` or `/jules [status query]`
- Config files: `gemini-extension.json`, `GEMINI.md`, `jules.toml`
- Delegates to Jules background VM, tracks via Gemini CLI
- No language/instruction parameters exposed

## 10. Plans & Pricing

| Feature | Free | Pro ($19.99/mo) | Ultra |
|---------|------|-----------------|-------|
| Daily tasks | 15 | 100 | 300 |
| Concurrent | 3 | 15 | 60 |
| Models | Gemini 2.5 Pro | Gemini 3 Pro+ | Gemini 3 Pro+ (priority) |

## 11. What CANNOT Be Configured

- **No language/locale setting** anywhere (UI, API, CLI)
- **No system instructions** field in API or UI
- **No model selection** by user (auto-assigned by plan)
- **No temperature/sampling** controls
- **No custom persona/voice** settings
- **No JULES.md, CLAUDE.md, GEMINI.md** reading — only AGENTS.md
- **No webhook/callback** configuration for task completion
- **No timezone** setting for scheduled tasks
- **No granular memory** management (only on/off toggle)

## Sources

- https://jules.google/docs/
- https://jules.google/docs/api/reference/sessions
- https://jules.google/docs/api/reference/types
- https://jules.google/docs/environment/
- https://jules.google/docs/faq/
- https://jules.google/docs/changelog/
- https://jules.google/docs/cli/reference/
- https://jules.google/docs/usage-limits/
- https://jules.google/docs/tasks-repos/
- https://jules.google/docs/suggested-tasks/
- https://jules.google/docs/scheduled-tasks/
- https://developers.google.com/jules/api
- https://github.com/gemini-cli-extensions/jules
- https://github.com/google-labs-code/jules-awesome-list
- https://agents.md/
