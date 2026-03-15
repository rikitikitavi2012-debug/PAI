# OpenCode CLI -- Comprehensive Documentation Research

**Date**: 2026-03-13
**Agent**: Intern
**Purpose**: Full analysis of OpenCode CLI configuration, context, memory, scripting, and integration patterns

---

## 1. Overview

OpenCode is an open-source terminal-based AI coding agent built in Go by the SST/Anomaly team. It provides a TUI (Terminal User Interface) built with Bubble Tea, supports 75+ LLM providers, and operates on a client/server architecture. 70,000+ GitHub stars, 650,000+ monthly active developers.

- **GitHub**: https://github.com/anomalyco/opencode
- **Docs**: https://opencode.ai/docs/
- **License**: Open source

---

## 2. Configuration System

### File Locations and Precedence (merged, later overrides earlier)

1. Remote config (`.well-known/opencode`)
2. Global config (`~/.config/opencode/opencode.json`)
3. Custom config (`OPENCODE_CONFIG` env var)
4. Project config (`opencode.json` in project root)
5. `.opencode` directories
6. Inline config (`OPENCODE_CONFIG_CONTENT` env var)

**Formats**: JSON and JSONC (with comments)
**TUI config**: Separate `tui.json` (global: `~/.config/opencode/tui.json`, project: `tui.json`)

### Core Config Keys

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000,
        "chunkTimeout": 30000,
        "baseURL": "https://api.anthropic.com/v1"
      }
    }
  },
  "tools": { "write": false, "bash": false },
  "permission": { "edit": "ask", "bash": "ask" },
  "compaction": { "auto": true, "prune": true, "reserved": 10000 },
  "watcher": { "ignore": ["node_modules/**", "dist/**"] },
  "share": "manual",
  "autoupdate": false,
  "enabled_providers": ["anthropic", "openai"],
  "disabled_providers": ["gemini"],
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"],
  "plugin": ["opencode-helicone-session"],
  "experimental": {}
}
```

### Variable Substitution
- Environment: `"{env:OPENCODE_MODEL}"`, `"{env:ANTHROPIC_API_KEY}"`
- File contents: `"{file:~/.secrets/openai-key}"`

### Environment Variables
- `OPENCODE_CONFIG` -- Custom config file path
- `OPENCODE_CONFIG_DIR` -- Custom config directory
- `OPENCODE_CONFIG_CONTENT` -- Inline config (runtime overrides)
- `OPENCODE_TUI_CONFIG` -- Custom TUI config file
- `OPENCODE_DISABLE_CLAUDE_CODE=1` -- Disable Claude Code compatibility
- `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1`
- `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1`

---

## 3. AGENTS.md and Rules System (Context/Instructions)

### AGENTS.md -- Primary Instructions File

Similar to Claude Code's `CLAUDE.md`. Contains instructions included in the LLM's context.

**Locations**:
- **Project**: `AGENTS.md` in project root (applies to project and subdirectories)
- **Global**: `~/.config/opencode/AGENTS.md` (applies to all sessions)

**Initialization**: The `/init` command scans the project and generates an `AGENTS.md` file. If one exists, it augments rather than overwrites.

### Loading Precedence

1. Local `AGENTS.md` or `CLAUDE.md` (traversing up from current directory)
2. Global `~/.config/opencode/AGENTS.md`
3. Claude Code legacy file at `~/.claude/CLAUDE.md` (if compatibility enabled)

**First matching file in each category wins.** If both `AGENTS.md` and `CLAUDE.md` exist, only `AGENTS.md` is used.

### Extended Instructions via Config

```json
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
```

Features:
- Glob pattern support
- Remote URL loading (5-second timeout)
- Combined with AGENTS.md files

### Claude Code Compatibility

OpenCode recognizes:
- `CLAUDE.md` in project directories (fallback if no `AGENTS.md`)
- `~/.claude/CLAUDE.md` globally (fallback if no global `AGENTS.md`)
- `~/.claude/skills/` for Agent Skills

Can be disabled with environment variables.

---

## 4. Agent System

### Built-in Agents

| Agent | Type | Purpose |
|-------|------|---------|
| Build | Primary | Default agent, all tools enabled |
| Plan | Primary | Analysis/planning, restricted tools |
| General | Subagent | Multi-step parallel tasks |
| Explore | Subagent | Read-only codebase exploration |
| Compaction | System | Automatic context management |
| Title | System | Session naming |
| Summary | System | Session summarization |

### Custom Agent Definition

**Markdown files** in `~/.config/opencode/agents/` (global) or `.opencode/agents/` (project):

```markdown
---
description: Reviews code for best practices
mode: primary
model: anthropic/claude-sonnet-4-5
temperature: 0.3
tools:
  write: false
  edit: false
permission:
  bash: deny
---
You are a code reviewer focused on security and performance...
```

**JSON in opencode.json**:

```json
{
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "model": "anthropic/claude-sonnet-4-5",
      "prompt": "You are a code reviewer...",
      "tools": { "write": false, "edit": false }
    }
  },
  "default_agent": "plan"
}
```

### Agent Options

| Option | Purpose |
|--------|---------|
| description | Required; explains agent purpose |
| mode | primary, subagent, or all |
| model | Override default model |
| temperature | 0.0--1.0 |
| prompt | Custom system prompt |
| tools | Enable/disable specific tools (supports wildcards) |
| permission | ask, allow, or deny per tool |
| steps | Max agentic iterations |
| top_p | Alternative randomness control |
| color | Visual appearance |
| hidden | Hide from autocomplete |
| disable | Disable entirely |

### Agent Creation CLI

`opencode agent create` -- interactive setup prompting for location, description, tools, auto-generated prompt.

---

## 5. Model Providers (75+)

### Major Supported Providers

- **OpenCode Zen/Go** -- Curated/low-cost model bundles
- **Anthropic** -- OAuth or API key
- **OpenAI** -- ChatGPT Plus/Pro OAuth or API key
- **Google Vertex AI** -- gcloud auth
- **Amazon Bedrock** -- AWS auth
- **Azure OpenAI** -- Azure Portal key
- **Groq** -- API key
- **OpenRouter** -- Many models preloaded
- **DeepSeek** -- API key
- **GitHub Copilot** -- Device flow auth
- **GitLab Duo** -- OAuth/PAT
- **Ollama** -- Local models (`http://localhost:11434/v1`)
- **LM Studio** -- Local via OpenAI-compatible API
- **llama.cpp** -- Local server
- **xAI** -- Grok models
- **Together AI**, **Fireworks AI**, **Deep Infra**, etc.

### Custom Provider Setup

```json
{
  "provider": {
    "myprovider": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Display Name",
      "options": {
        "baseURL": "https://api.myprovider.com/v1",
        "apiKey": "{env:API_KEY_VAR}"
      },
      "models": {
        "model-id": {
          "name": "Model Name",
          "limit": { "context": 200000, "output": 65536 }
        }
      }
    }
  }
}
```

### Authentication

- `/connect` command for interactive setup
- Credentials stored in `~/.local/share/opencode/auth.json`
- `opencode auth login/list/logout` CLI commands

---

## 6. MCP Server Support

### Configuration

```json
{
  "mcp": {
    "local-server": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"],
      "environment": { "VAR": "value" },
      "enabled": true,
      "timeout": 5000
    },
    "remote-server": {
      "type": "remote",
      "url": "https://my-mcp-server.com",
      "headers": { "Authorization": "Bearer API_KEY" },
      "oauth": { "clientId": "...", "clientSecret": "...", "scope": "..." }
    }
  }
}
```

### MCP CLI Commands

- `opencode mcp add` -- Add a server
- `opencode mcp list` -- List all servers
- `opencode mcp auth <name>` -- Trigger authentication
- `opencode mcp logout <name>` -- Remove credentials
- `opencode mcp debug <name>` -- Diagnose issues
- `opencode mcp enable/disable/toggle`

### Tool Naming

MCP tools are prefixed: `servername_toolname`

---

## 7. CLI Commands and Headless Mode

### Primary Commands

| Command | Purpose |
|---------|---------|
| `opencode` (tui) | Start TUI (default) |
| `opencode run [message]` | Non-interactive execution |
| `opencode serve` | Headless HTTP API server |
| `opencode web` | HTTP server with web UI |
| `opencode attach [url]` | Connect TUI to remote backend |
| `opencode agent create/list` | Manage agents |
| `opencode auth login/list/logout` | Manage credentials |
| `opencode mcp add/list/auth/debug` | MCP management |
| `opencode models [provider]` | List available models |
| `opencode session list` | List sessions |
| `opencode stats` | Usage metrics |
| `opencode export/import` | Session data exchange |
| `opencode acp` | Agent Client Protocol (stdin/stdout) |
| `opencode github install/run` | GitHub Actions integration |

### `opencode run` Flags

| Flag | Purpose |
|------|---------|
| `--model/-m` | Model override (provider/model) |
| `--continue/-c` | Continue previous session |
| `--session/-s` | Specify session ID |
| `--fork` | Fork existing session |
| `--file/-f` | Attach files |
| `--title` | Name the session |
| `--format` | Output format (e.g., `json`) |
| `--share` | Share the session |
| `--agent` | Specify agent |
| `--command` | Run a command |
| `--attach` | Attach to server |
| `--port` | Server port |

### Examples

```bash
# Simple prompt
opencode run "Explain the use of context in Go"

# With model and JSON output
opencode run --model anthropic/claude-sonnet-4-5 --format json "Refactor this code" | jq .

# Continue a session
opencode run --continue --session ses_abc123 "Now add tests"

# Named session with file
opencode run --title "Payment API" --file src/payment.ts "Review this module"
```

### Global Flags

`--help/-h`, `--version/-v`, `--print-logs`, `--log-level`

---

## 8. Built-in Tools

| Tool | Purpose |
|------|---------|
| read | Read file contents |
| write | Create/overwrite files |
| edit | Exact string replacement in files |
| bash | Execute shell commands |
| grep | Search file contents (ripgrep) |
| glob | Find files by pattern |
| list | Directory listing with glob support |
| patch | Apply diffs/patches |
| LSP | Code intelligence (goToDefinition, findReferences, hover, etc.) |
| todo | Task management |

---

## 9. Memory and Persistence

### Session Storage

- Session data: `~/.local/share/opencode/storage/session/{projectHash}/{sessionID}.json`
- Messages: `~/.local/share/opencode/storage/message/{sessionID}/msg_{messageID}.json`

### Session Continuation

- `--continue` flag to resume last session
- `--session ses_ID` to resume specific session
- Sessions are project-scoped (by project hash)

### No Built-in Memory System

OpenCode does NOT have a native cross-session memory system. It relies on:
1. `AGENTS.md` for persistent project context
2. Session history for within-session context
3. `--continue` for resuming sessions

### Community Memory Solutions

- `opencode-memory` (github.com/dony102/opencode-memory) -- Persistent memory stored in `.opencode/memory/`
- `opencode-plugin-simple-memory` (github.com/cnicolov/opencode-plugin-simple-memory) -- Plugin-based memory across sessions
- Feature request exists for native persistent session memory (issue #16077)

### Context Compaction

- Triggers at 75% of model's context window (hardcoded)
- Keeps ~40k tokens of recent tool outputs
- Prunes older tool outputs (replaced with "[Old tool result content cleared]")
- Configurable via `compaction` config key
- Plugin: Dynamic Context Pruning (DCP) for more intelligent pruning

---

## 10. Plugin System

### Plugin Locations

- **Project**: `.opencode/plugins/`
- **Global**: `~/.config/opencode/plugins/`
- **npm**: Specified in `opencode.json` `"plugin"` field

### Plugin Structure

```javascript
export const MyPlugin = async ({ project, client, $, directory, worktree }) => {
  return {
    // Hook handlers
  }
}
```

### Hook Events

| Category | Events |
|----------|--------|
| Tool | tool.execute.before, tool.execute.after |
| File | file.edited, file.watcher.updated |
| Session | session.created, session.compacted, session.updated, session.idle, session.error |
| Message | message.updated, message.removed, message.part.updated |
| Shell | shell.env |
| Command | command.executed |
| Permission | permission.asked, permission.replied |
| TUI | tui.prompt.append, tui.command.execute, tui.toast.show |
| LSP | lsp.updated, lsp.client.diagnostics |
| Other | installation.updated, server.connected, todo.updated |

---

## 11. Custom Commands

### Locations

- **Project**: `.opencode/commands/`
- **Global**: `~/.config/opencode/commands/`
- **JSON**: `opencode.json` under `"command"` key

### Markdown Format

```markdown
---
description: Run tests with coverage
agent: build
model: anthropic/claude-3-5-sonnet-20241022
---
Run the full test suite with coverage report for $ARGUMENTS
```

### Features

- `$ARGUMENTS` for all args, `$1`/`$2`/`$3` for specific
- `` !`command` `` syntax for shell output injection
- `@filename` for file content inclusion
- `subtask: true` for subagent execution

---

## 12. SDK and Programmatic Access

### Installation

```bash
npm install @opencode-ai/sdk
```

### API Namespaces

- **session** -- Create, list, delete, update, abort, share
- **session.prompt()** -- Send messages programmatically
- **session.messages()** -- Retrieve conversation history
- **event.subscribe()** -- SSE stream for real-time events
- **config** -- Access configuration state
- **files** -- Text search, file discovery, symbol lookup
- **auth** -- Set provider credentials

### Server

`opencode serve` runs headless HTTP API on `localhost:4096`.
Supports basic auth via `OPENCODE_SERVER_PASSWORD`.
SSE endpoints: `/global/event` and `/session/{id}/event`.

---

## 13. GitHub/GitLab Integration

- `opencode github install/run` -- Repository automation via GitHub Actions
- Mention `/opencode` or `/oc` in GitHub issue/PR comments to trigger tasks
- GitLab Duo integration with OAuth/PAT

---

## 14. Comparison: OpenCode vs Claude Code

| Feature | OpenCode | Claude Code |
|---------|----------|-------------|
| Instructions file | AGENTS.md | CLAUDE.md |
| Global instructions | ~/.config/opencode/AGENTS.md | ~/.claude/CLAUDE.md |
| Config file | opencode.json | settings.json |
| Memory system | No native (plugins available) | No native (manual) |
| MCP support | Yes (local + remote) | Yes |
| Providers | 75+ | Anthropic only |
| Headless mode | `opencode run` | `claude -p` |
| Plugin system | JS/TS plugins with hooks | Hooks (pre/post) |
| SDK | @opencode-ai/sdk | @anthropic-ai/claude-code |
| Server mode | opencode serve (HTTP + SSE) | No |
| Custom agents | Full agent system | No |
| Custom commands | .md files + JSON | Slash commands |
| Claude Code compat | Reads CLAUDE.md as fallback | N/A |
