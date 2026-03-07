# Agent Zero Architecture for Customization

**Date:** 2026-03-07
**Version:** v0.9.8.2 (released 2026-02-24)
**Source:** GitHub agent0ai/agent-zero, official docs, container inspection

## Architecture Overview

A0 is a Python-based agentic framework with plugin architecture:
- **Extensions** — Python hooks into agent lifecycle events (42 files across 20+ hook types)
- **Skills** — SKILL.md files with structured capabilities (loaded dynamically, max 5 at a time)
- **Prompts** — System prompts in `/prompts/default/` (Jinja2 templates)
- **Tools** — Python modules for specific actions (code_execution, browser, search, etc.)
- **Memory** — FAISS + behaviour.md + memories in `/usr/memory/`

## Extension System

Extensions hook into lifecycle events. Auto-discovered by filename convention:
- Path: `/a0/python/extensions/{hook_type}/_NN_name.py`
- Numbered for execution order (lower = earlier)
- Each extends `Extension` base class with `execute()` method
- Access to `loop_data.extras_temporary[key]` for injecting context

### Hook Types (20+)
| Hook | When | Use Case |
|------|------|----------|
| agent_init | Agent created | Setup, load profiles |
| message_loop_prompts_after | After prompts built | **Our extensions live here** — inject context |
| message_loop_prompts_before | Before prompts | History management |
| message_loop_start/end | Loop boundaries | Iteration tracking, history save |
| monologue_start/end | Thinking phases | Memory management |
| system_prompt | System prompt build | Prompt customization |
| response_stream* | Response streaming | Live display, logging |
| tool_execute_before/after | Tool calls | Secret masking |
| error_format | Error handling | Error display |

### Upstream Numbering
| Range | Usage |
|-------|-------|
| _10-_20 | Core system (init, logging, masking) |
| _50-_60 | Memory, datetime, skills |
| _65-_75 | Agent info, workdir extras |
| _80-_89 | **OUR CUSTOM RANGE** |
| _90-_91 | History management, recall wait |

**Strategy:** Use _80-_89 for custom extensions. Current upstream highest in our hook type is _75 (workdir_extras), then jumps to _91 (recall_wait). Our _80-_89 slot is safe.

## Skills System (v0.9.8+)

Skills replaced legacy "Instruments". Each skill is a directory with:
- `SKILL.md` — structured description (name, description, usage)
- Optional Python files for tool implementations

Skills are loaded dynamically (max 5 at a time based on relevance).
Path: `/a0/usr/skills/{skill-name}/SKILL.md`

## Prompt Customization

System prompt: `/a0/prompts/default/agent.system.md`
Behaviour: `/a0/usr/memory/default/behaviour.md`

Both are read at startup and on conversation creation.

## Upstream Update Compatibility

**Safe to customize (survives updates):**
- `/a0/usr/` — user directory, never overwritten by upstream
- `/a0/python/extensions/` — additive (new files don't conflict if numbered safely)
- `/a0/prompts/default/agent.system.md` — may be overwritten, needs backup/re-merge

**Risky to customize:**
- `/a0/python/tools/` — upstream may change API
- `/a0/python/helpers/` — core framework, never touch
- `/a0/python/api/` — server endpoints, never touch

**Update procedure:**
1. Backup our customizations (GitHub = backup)
2. Pull upstream update (docker pull or git pull)
3. Re-apply our extensions (copy from repo)
4. Verify no numbering conflicts
5. Test

## Release History
| Version | Date | Key Changes |
|---------|------|-------------|
| v0.9.8.2 | 2026-02-24 | Bug fixes |
| v0.9.8.1 | 2026-02-18 | Bug fixes |
| v0.9.8 | 2026-02-10 | Skills system, UI redesign, WebSocket |
| v0.9.7 | 2025-11-19 | Projects |
| v0.9.6 | 2025-10-02 | Memory Dashboard |

No public v1.0 roadmap found. Framework already modular by design.

## Sources
- https://github.com/agent0ai/agent-zero/blob/main/docs/developer/extensions.md
- https://github.com/agent0ai/agent-zero/blob/main/docs/developer/architecture.md
- https://www.agent-zero.ai/p/docs/extensions/
- https://github.com/agent0ai/agent-zero/releases
