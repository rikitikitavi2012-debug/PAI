# Research Jules configuration docs

**Agent:** Intern
**Captured:** 2026-03-13T21:14:13+03:00
**Tool Use ID:** toolu_01JyqtN6Hy5qWGtbKHtxsF2p
**Tokens:** 39527
**Duration:** 516s
**Source:** PostToolUse hook capture

---

```
════ PAI | ALGORITHM MODE ═══════════════════════
```

**TASK:** Deep research on Google Jules configuration, API, language, instructions

**RESEARCH COMPLETE. VERIFIED FACTS ONLY.**

---

## 1. AGENTS.md — The Only Instruction File Jules Reads

- Jules reads `AGENTS.md` from your repo root **automatically before every task**
- Supports **hierarchical placement**: you can place AGENTS.md in subdirectories; the closest one to the edited file takes precedence
- Standard Markdown, no schema, no required fields
- Shared open standard with Codex, Cursor, Copilot, Claude Code, Windsurf, and others
- Can contain: coding standards, architectural patterns, tool usage, conventions, build steps, test commands
- **Jules does NOT read CLAUDE.md, JULES.md, or GEMINI.md** -- only AGENTS.md

---

## 2. Language Settings -- NONE EXIST

- **UI language: English only.** No language selector in the UI
- **No `language` parameter** in the API (session creation has only: prompt, title, sourceContext, requirePlanApproval, automationMode)
- **No language field** in CLI flags
- **No language configuration** anywhere in Settings
- **Potential workaround (unverified):** You could write "Always respond in Russian" in your AGENTS.md or in the task prompt itself. Since Jules uses Gemini 2.5/3 Pro which natively supports Russian, it *might* comply -- but this is not an official feature and behavior is not guaranteed.

---

## 3. Global Settings (jules.google.com Settings page)

| Setting | Location | Options |
|---------|----------|---------|
| **Theme** | UI | Dark, Light, Auto |
| **Notifications** | Settings > Notifications | Enable/Disable |
| **Commit Authoring** | Settings > Commit Authoring | Jules-only (default), Co-authored (Jules+You or You+Jules), User-only |
| **Reactive Mode** | Settings (global) | On/Off. When On, Jules only acts on PR comments where you @Jules |
| **API Keys** | Settings | Create up to 3 keys |
| **MCP Integrations** | Settings > MCP | Linear, Stitch, Neon, Tinybird, Context7, Supabase (each needs API key) |

---

## 4. Repository-Level Settings (per repo)

| Setting | Location | Description |
|---------|----------|-------------|
| **Environment Setup Script** | Configuration > Environment | Shell commands run before each task |
| **Environment Variables** | Repo Settings | Key-value pairs available to tasks |
| **Environment Snapshot** | Configuration | Cached state after "Run and Snapshot" |
| **Memory (Knowledge)** | Repo Settings > Knowledge | On/Off toggle. Jules remembers preferences, nudges, corrections per repo |
| **Suggested Tasks** | Repo page toggle | On/Off. Scans for #TODO. Max 5 repos (Pro/Ultra) |
| **Scheduled Tasks** | Repo > Scheduled tab | Frequency: Daily/Weekly. Custom prompt. Delete+recreate to edit |

---

## 5. Task Creation Options (Web UI)

When creating a task you can specify:
- **Prompt** (task description, free text)
- **Repository** (select from connected repos)
- **Branch** (target branch, defaults to main)
- **Environment variables** (toggle which repo-level vars to include)

**What you CANNOT specify:** model, language, system instructions, temperature, persona.

---

## 6. API (POST /v1alpha/sessions) -- Complete Parameter List

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | **Yes** | Task description |
| `title` | string | No | Session title (auto-generated if omitted) |
| `sourceContext` | SourceContext | No | Contains: source resource name + githubRepoContext.startingBranch |
| `requirePlanApproval` | boolean | No | If true, plans need manual approval before execution |
| `automationMode` | enum | No | `AUTO_CREATE_PR` to auto-create PRs |

**Other endpoints:** GET/DELETE sessions, POST sendMessage (send follow-up prompt), POST approvePlan, GET activities, GET sources.

**NOT in the API:** language, system instructions, custom instructions, model selection, temperature, persona, callbacks/webhooks.

---

## 7. Jules Tools CLI (@google/jules)

| Command | Flags |
|---------|-------|
| `jules` (no args) | Interactive TUI dashboard |
| `jules remote new` | `--repo <owner/repo>`, `--session "<prompt>"`, `--parallel <n>` |
| `jules remote list` | `--repo`, `--session` |
| `jules remote pull` | `--session <id>` |
| Global flags | `--theme dark/light`, `-h/--help` |

**NOT in CLI:** language, instructions, model, system prompt, or any configuration flags beyond the above.

---

## 8. Gemini CLI Extension for Jules

- Install: `gemini extensions install https://github.com/gemini-cli-extensions/jules --auto-update`
- Usage: `/jules [task description]` or `/jules [status query]`
- Internal config files: `gemini-extension.json`, `GEMINI.md`, `jules.toml`
- Delegates to Jules background VM; tracked via Gemini CLI
- No user-facing language or instruction parameters

---

## 9. Memory Feature

- **Per-repository**, toggled in Repo Settings > Knowledge
- Jules saves preferences, nudges, and corrections during tasks
- Applies learned patterns to future tasks in the same repo
- **No granular management**: just On/Off. You cannot view, edit, or clear specific memories
- No way to "seed" memory with instructions -- it only learns from task interactions

---

## 10. Plans & Model Access

| | Free | Pro | Ultra |
|---|---|---|---|
| Daily tasks | 15 | 100 | 300 |
| Concurrent | 3 | 15 | 60 |
| Model | Gemini 2.5 Pro | Gemini 3 Pro+ | Gemini 3 Pro+ (priority) |

**No user model selection** -- automatically assigned by plan tier.

---

## 11. What Definitively CANNOT Be Configured

- No language/locale setting (anywhere)
- No system instructions field (API, UI, or CLI)
- No model selection by user
- No temperature/sampling controls
- No custom persona or voice settings
- No JULES.md support -- only AGENTS.md
- No webhook/callback for task completion
- No timezone for scheduled tasks
- No granular memory management

---

## Bottom Line for Your Use Case

To configure Jules behavior: **use AGENTS.md in your repo root.** This is the single most powerful configuration lever. You can put coding conventions, architectural rules, test requirements, and behavioral instructions there.

For Russian language: **no official support.** Your best bet is adding a line like `Always communicate in Russian when writing PR descriptions, commit messages, and plan summaries` to your AGENTS.md -- but compliance is not guaranteed since this is not a supported feature.

---

**VERIFY:** Research saved to `/home/ser/.claude/MEMORY/RESEARCH/2026-03/google-jules-configuration-research.md`

**Sources:**
- [Jules Getting Started](https://jules.google/docs/)
- [Jules API Sessions Reference](https://jules.google/docs/api/reference/sessions)
- [Jules API Types Reference](https://jules.google/docs/api/reference/types)
- [Jules Environment Setup](https://jules.google/docs/environment/)
- [Jules FAQ](https://jules.google/docs/faq/)
- [Jules Changelog](https://jules.google/docs/changelog/)
- [Jules CLI Reference](https://jules.google/docs/cli/reference/)
- [Jules Plans & Limits](https://jules.google/docs/usage-limits/)
- [Jules Task & Repo Management](https://jules.google/docs/tasks-repos/)
- [Jules Suggested Tasks](https://jules.google/docs/suggested-tasks/)
- [Jules Scheduled Tasks](https://jules.google/docs/scheduled-tasks/)
- [Jules API on Google Developers](https://developers.google.com/jules/api)
- [Jules Gemini CLI Extension (GitHub)](https://github.com/gemini-cli-extensions/jules)
- [Jules Awesome List (GitHub)](https://github.com/google-labs-code/jules-awesome-list)
- [AGENTS.md Specification](https://agents.md/)
- [Jules Commit Authorship Changelog](https://jules.google/docs/changelog/2026-02-19)
- [Jules Memory Changelog](https://jules.google/docs/changelog/2025-09-30)
- [Jules MCP Support Changelog](https://jules.google/docs/changelog/2026-02-02)