# Research Gemini CLI documentation

**Agent:** Intern
**Captured:** 2026-03-13T18:53:58+03:00
**Tool Use ID:** toolu_01FEQhGFLur5ZykYvgPum2Xj
**Tokens:** 40918
**Duration:** 303s
**Source:** PostToolUse hook capture

---

```
════ PAI | NATIVE MODE ═══════════════════════
```

**TASK**: Gemini CLI full documentation research across all subsystems

**CONTENT**:

---

## 1. CONFIGURATION SYSTEM

**Gemini CLI uses a layered JSON configuration** with 7-level precedence (lowest to highest):

1. Hardcoded defaults
2. System defaults (`/etc/gemini-cli/system-defaults.json`)
3. User settings (`~/.gemini/settings.json`)
4. Project settings (`.gemini/settings.json`)
5. System settings (`/etc/gemini-cli/settings.json`)
6. Environment variables (including `.env` file auto-discovery up to `.git` boundary)
7. Command-line arguments

**settings.json** contains sections: `general`, `output`, `ui`, `ide`, `privacy`, `model`, `context`, `tools`, `mcp`, `mcpServers`, `security`, `advanced`, `telemetry`, `hooks`. Full field listing in the saved research file.

---

## 2. CONTEXT / MEMORY -- GEMINI.md FILES

**Yes, Gemini CLI uses GEMINI.md** -- a direct analog to Claude's CLAUDE.md.

**Hierarchical loading (all concatenated, sent with every prompt):**
- **Global**: `~/.gemini/GEMINI.md` -- applies to all projects
- **Project root + ancestors**: searches upward to `.git` boundary
- **Subdirectories**: scans below CWD (respects `.gitignore` and `.geminiignore`, max 200 dirs by default)

**Persistent instructions features:**
- Modular imports via `@./path/file.md` syntax
- Custom filename via `context.fileName` in settings.json -- supports arrays: `["AGENTS.md", "CONTEXT.md", "GEMINI.md"]`
- `/memory show` -- display combined context
- `/memory refresh` -- reload all files
- `/memory add <text>` -- append to global GEMINI.md
- **save_memory tool**: the agent can autonomously save facts to `## Gemini Added Memories` section in global GEMINI.md
- `/init` generates a starter GEMINI.md for your project

**GEMINI_SYSTEM_MD environment variable** -- full system prompt override:
- `true` or `1`: loads `.gemini/system.md` from project root
- `/absolute/path.md`: loads custom file (**FULL REPLACEMENT**, not merge)
- Dynamic variables available inside: `${AgentSkills}`, `${SubAgents}`, `${AvailableTools}`
- Export built-in prompt: `GEMINI_WRITE_SYSTEM_MD=1 gemini` writes defaults to `.gemini/system.md`
- UI shows `|⌐■_■|` indicator when custom system prompt is active

**Key distinction**: system.md = firmware (safety, tool protocols). GEMINI.md = strategy (persona, context, coding standards).

---

## 3. MODEL SELECTION

**Precedence** (highest to lowest):
1. `--model` / `-m` CLI flag
2. `GEMINI_MODEL` environment variable
3. `model.name` in settings.json
4. Local Gemma router (experimental)
5. Default: `auto` (currently gemini-2.5-pro)

**Model routing** is automatic failover -- enabled by default. Silent fallback chain for internal operations: `gemini-2.5-flash-lite` -> `gemini-2.5-flash` -> `gemini-2.5-pro`. User is prompted before switching for main conversation. Experimental local Gemma model can handle routing decisions to reduce costs.

Interactive switching: `/model` command during session.

---

## 4. HOOKS AND EXTENSIONS

### Hooks (12 Lifecycle Events)

Hooks are scripts executed synchronously at specific agent loop points. Configured in `settings.json` at project, user, or system level.

| Event | Can Block? | Use Cases |
|---|---|---|
| SessionStart | Inject context | Initialize, load context |
| SessionEnd | Advisory | Clean up, save state |
| BeforeAgent | Block turn + context | Validate prompts, add context |
| AfterAgent | Retry/Halt | Review output |
| BeforeModel | Block turn + mock | Modify prompts, swap models |
| AfterModel | Block turn + redact | Filter responses |
| BeforeToolSelection | Filter tools | Limit available tools |
| BeforeTool | Block tool + rewrite | Validate args, block operations |
| AfterTool | Block result + context | Process/hide results |
| PreCompress | Advisory | Save state before compression |
| Notification | Advisory | Forward alerts |

**Communication**: JSON in via stdin, JSON out via stdout. Exit code 0 = success, 2 = block, other = warning. Only `"command"` type supported. Environment: `GEMINI_PROJECT_DIR`, `GEMINI_SESSION_ID`, `GEMINI_CWD`. Project hooks are fingerprinted -- changes trigger trust warnings.

### Extensions

Full extension system in `~/.gemini/extensions/<name>/`. Each contains `gemini-extension.json` and can bundle:
- MCP servers
- Custom commands (TOML)
- Context files (GEMINI.md)
- Hooks
- Tool exclusions
- Themes

Install: `gemini extensions install <github-url|local-path>`. Scaffold: `gemini extensions new <path> <type>`. Dev mode: `gemini extensions link <path>`.

---

## 5. HEADLESS / SCRIPTING MODE

**Triggered by** `--prompt`/`-p` flag or non-TTY environment.

```bash
# Direct prompt
gemini -p "What is machine learning?"

# Stdin pipe
echo "Explain this" | gemini

# File + prompt
cat README.md | gemini -p "Summarize"

# Full automation (your example pattern)
echo "prompt" | gemini -p "" -y -o text
# -p "" = headless mode, -y = --yolo (auto-approve), -o = --output-format

# JSON output for scripting
gemini -p "query" --output-format json | jq '.response'
```

**All headless flags**: `--prompt`/`-p`, `--output-format` (text/json), `--model`/`-m`, `--yolo`/`-y`, `--approval-mode`, `--sandbox`/`-s`, `--all-files`/`-a`, `--include-directories`, `--debug`/`-d`, `--allowed-tools`, `--extensions`/`-e`, `--checkpointing`, `--proxy`, `--screen-reader`.

**JSON output structure**: `response`, `stats.models` (token counts), `stats.tools` (call counts), `stats.files` (lines changed), `error`.

---

## 6. CUSTOM SLASH COMMANDS

TOML files in `~/.gemini/commands/` (global) or `.gemini/commands/` (project). Subdirectories create namespaces: `git/commit.toml` becomes `/git:commit`.

```toml
description = "Generate commit message from staged changes"
prompt = """Generate commit message:
```diff
!{git diff --staged}```"""
```

Dynamic injection: `{{args}}` (user input), `!{command}` (shell output with confirmation), `@{path}` (file content, supports images/PDFs/audio/video).

---

## 7. INTEGRATION BEST PRACTICES

- **CI/CD**: Official GitHub Action `google-gemini/gemini-cli-action`
- **Scripting**: Always use `--output-format json` + `jq` for parsing
- **Security**: Use `--sandbox` (Docker/Podman/Seatbelt) in untrusted environments
- **PATH restriction**: `PATH=/usr/bin:/usr/local/bin gemini` to limit tool access
- **Multi-directory**: `--include-directories "../backend:../frontend"` (max 5)
- **File references**: `@./path/to/file` in prompts to inject content
- **Session persistence**: `/chat save <tag>` and `/chat resume <tag>`
- **Context compression**: `/compress` to free token space in long sessions
- **Shell passthrough**: `!command` executes inline, bare `!` enters shell mode

---

**CHANGE**:
- Saved full research to `/home/ser/.claude/MEMORY/RESEARCH/2026-03/gemini-cli-documentation-research.md`

**VERIFY**:
- Cross-referenced official GitHub docs, google-gemini.github.io, geminicli.com, and community guides
- Verified all configuration paths and precedence rules against multiple sources
- Confirmed GEMINI.md hierarchy matches across official docs and tutorials

**Navi**: Complete Gemini CLI research -- config, memory, hooks, extensions, headless, integration patterns documented.

---

**Sources:**
- [Gemini CLI GitHub Repository](https://github.com/google-gemini/gemini-cli)
- [Official Configuration Docs](https://google-gemini.github.io/gemini-cli/docs/get-started/configuration.html)
- [GEMINI.md Context Files](https://google-gemini.github.io/gemini-cli/docs/cli/gemini-md.html)
- [Headless Mode Reference](https://google-gemini.github.io/gemini-cli/docs/cli/headless.html)
- [Hooks Documentation](https://geminicli.com/docs/hooks/)
- [Extensions Documentation](https://google-gemini.github.io/gemini-cli/docs/extensions/)
- [Custom Commands](https://geminicli.com/docs/cli/custom-commands/)
- [Model Routing](https://geminicli.com/docs/cli/model-routing/)
- [Memory / save_memory Tool](https://geminicli.com/docs/tools/memory/)
- [System Prompt Override (GEMINI_SYSTEM_MD)](https://geminicli.com/docs/cli/system-prompt/)
- [Addy Osmani's Tips & Tricks](https://addyosmani.com/blog/gemini-cli/)
- [Phil Schmid's Cheatsheet](https://www.philschmid.de/gemini-cli-cheatsheet)
- [Google Developers Blog -- Hooks](https://developers.googleblog.com/tailor-gemini-cli-to-your-workflow-with-hooks/)
- [Google Cloud Blog -- Custom Slash Commands](https://cloud.google.com/blog/topics/developers-practitioners/gemini-cli-custom-slash-commands)
- [Gemini CLI GitHub Action](https://github.com/google-gemini/gemini-cli-action)