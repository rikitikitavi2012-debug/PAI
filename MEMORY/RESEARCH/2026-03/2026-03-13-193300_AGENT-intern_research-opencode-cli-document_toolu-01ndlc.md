# Research OpenCode CLI documentation

**Agent:** Intern
**Captured:** 2026-03-13T19:33:00+03:00
**Tool Use ID:** toolu_01NDLci2qof7eJRW4rB5ppxT
**Tokens:** 43008
**Duration:** 487s
**Source:** PostToolUse hook capture

---

```
════ PAI | ALGORITHM MODE ═══════════════════════
```

**TASK**: Comprehensive research of OpenCode CLI documentation and integration patterns

**PHASE**: RESEARCH COMPLETE

---

## 1. Configuration System

OpenCode uses `opencode.json` (JSON/JSONC format) with a 6-level merge precedence:

| Priority | Source | Path |
|----------|--------|------|
| 1 (lowest) | Remote config | `.well-known/opencode` |
| 2 | Global config | `~/.config/opencode/opencode.json` |
| 3 | Custom config | `OPENCODE_CONFIG` env var |
| 4 | Project config | `opencode.json` in project root |
| 5 | .opencode dir | `.opencode/` directory |
| 6 (highest) | Inline config | `OPENCODE_CONFIG_CONTENT` env var |

Config supports **variable substitution**: `"{env:ANTHROPIC_API_KEY}"` for env vars and `"{file:~/.secrets/key}"` for file contents.

TUI appearance is separately configured in `tui.json` (themes, keybinds, scroll, diff style).

---

## 2. Context/Memory Integration -- AGENTS.md

**This is the direct equivalent of Claude Code's CLAUDE.md.**

### AGENTS.md Locations

- **Project-level**: `AGENTS.md` in project root -- applies to that project and subdirectories
- **Global-level**: `~/.config/opencode/AGENTS.md` -- applies to ALL sessions, not committed to git

### Loading Precedence

1. Local `AGENTS.md` or `CLAUDE.md` (traverses up from current directory)
2. Global `~/.config/opencode/AGENTS.md`
3. Legacy fallback: `~/.claude/CLAUDE.md` (if Claude Code compatibility is enabled)

**First matching file in each category wins.** If both `AGENTS.md` and `CLAUDE.md` exist side-by-side, only `AGENTS.md` is used.

### Extended Instructions

Beyond AGENTS.md, the config supports an `"instructions"` array:
```json
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md", ".cursor/rules/*.md"]
}
```
Supports globs and remote URLs. All instruction files are combined with AGENTS.md.

### The `/init` Command

Running `/init` inside OpenCode scans the project structure and auto-generates an `AGENTS.md` file. If one already exists, it augments rather than overwrites.

### Claude Code Compatibility

OpenCode reads `CLAUDE.md` as a fallback, recognizes `~/.claude/CLAUDE.md` globally, and imports from `~/.claude/skills/`. This can be disabled with:
- `OPENCODE_DISABLE_CLAUDE_CODE=1`
- `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1`
- `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1`

---

## 3. Available Settings -- Complete Reference

### Models and Providers

```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "enabled_providers": ["anthropic", "openai"],
  "disabled_providers": ["gemini"]
}
```

**75+ providers supported** including Anthropic, OpenAI, Google Vertex, AWS Bedrock, Azure, Groq, OpenRouter, DeepSeek, Ollama (local), LM Studio, llama.cpp, xAI, Together AI, GitHub Copilot, GitLab Duo, and many more. Custom OpenAI-compatible providers are supported via `@ai-sdk/openai-compatible`.

### Agents (Custom Personas)

Full agent system with built-in agents (Build, Plan, General, Explore) and custom agents defined as markdown files in `~/.config/opencode/agents/` or `.opencode/agents/`:

```markdown
---
description: Security auditor
mode: primary
model: anthropic/claude-sonnet-4-5
temperature: 0.2
tools:
  write: false
  bash: deny
---
You are a security auditor. Review all code for vulnerabilities...
```

Each agent can have its own model, tools, permissions, temperature, and system prompt.

### Permissions

```json
{ "permission": { "edit": "ask", "bash": "ask" } }
```
Values: `"ask"`, `"allow"`, `"deny"`. Supports per-agent overrides and glob patterns for bash commands.

### Context Compaction

```json
{ "compaction": { "auto": true, "prune": true, "reserved": 10000 } }
```
Triggers at 75% of model context window. Keeps ~40k tokens of recent tool outputs.

### Custom Commands

Markdown files in `.opencode/commands/` or `~/.config/opencode/commands/`. Filename becomes the slash command. Supports `$ARGUMENTS`, shell injection via `` !`cmd` ``, and `@file` references.

### MCP Servers

Full MCP support for local (stdio) and remote (HTTP/SSE) servers with OAuth support:

```json
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-everything"],
      "enabled": true
    },
    "remote-server": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "headers": { "Authorization": "Bearer KEY" }
    }
  }
}
```

CLI: `opencode mcp add/list/auth/logout/debug/enable/disable`

---

## 4. Headless/Scripting Mode

### `opencode run`

```bash
# Basic prompt
opencode run "Explain this codebase"

# With model override and JSON output for piping
opencode run --model anthropic/claude-sonnet-4-5 --format json "Refactor this" | jq .

# Continue a previous session
opencode run --continue --session ses_abc123 "Now add tests"

# Named session with file attachment
opencode run --title "Payment API" --file src/payment.ts "Review this module"

# Specific agent
opencode run --agent plan "Analyze the architecture"
```

**All `run` flags**: `--model/-m`, `--continue/-c`, `--session/-s`, `--fork`, `--file/-f`, `--format`, `--title`, `--share`, `--agent`, `--command`, `--attach`, `--port`

### `opencode serve`

Headless HTTP API server on `localhost:4096`. Supports `OPENCODE_SERVER_PASSWORD` for basic auth, mDNS discovery, CORS configuration. Exposes SSE endpoints for real-time events.

### `opencode acp`

Agent Client Protocol via stdin/stdout -- for embedding OpenCode as a subprocess in other tools.

---

## 5. Integration Patterns

### SDK (TypeScript)

```bash
npm install @opencode-ai/sdk
```

Programmatic control over sessions, messages, events (SSE), files, config. Key methods:
- `session.prompt()` -- send messages
- `event.subscribe()` -- SSE real-time stream
- `session.init()` -- analyze codebase
- Structured output with JSON schema validation

### Plugin System

JS/TS files in `.opencode/plugins/` or `~/.config/opencode/plugins/`. Hook events include:
- `tool.execute.before/after` -- intercept tool calls
- `session.created/compacted/idle/error`
- `file.edited`, `shell.env`, `command.executed`
- `tui.prompt.append`, `permission.asked`
- Custom tools via `tool()` helper with Zod schemas

### GitHub Integration

`opencode github install` -- sets up GitHub Actions. Mention `/opencode` or `/oc` in issue/PR comments to trigger automated tasks in CI runners.

---

## 6. Memory/Persistence

### Session Storage

- Sessions: `~/.local/share/opencode/storage/session/{projectHash}/{sessionID}.json`
- Messages: `~/.local/share/opencode/storage/message/{sessionID}/msg_{messageID}.json`
- Auth: `~/.local/share/opencode/auth.json`
- MCP tokens: `~/.local/share/opencode/mcp-auth.json`

### Cross-Session Memory

**OpenCode has NO native memory system.** Persistent context is achieved through:
1. `AGENTS.md` -- static instructions always loaded
2. `--continue` / `--session` flags -- resume specific sessions
3. `"instructions"` config array -- additional context files
4. Community plugins: `opencode-memory`, `opencode-plugin-simple-memory`
5. Feature request exists for native persistent memory (GitHub issue #16077)

---

## Key Takeaway for PAI Integration

To give OpenCode persistent context equivalent to our CLAUDE.md setup:
1. Place a global `~/.config/opencode/AGENTS.md` with user persona, goals, and system instructions
2. Use `opencode.json` `"instructions"` array to include additional context files
3. Define custom agents with specific personas via markdown files in `~/.config/opencode/agents/`
4. OpenCode will automatically read our existing `~/.claude/CLAUDE.md` as a fallback unless disabled
5. For automated workflows: `opencode run --model X --format json "prompt"` piped through jq

---

**VERIFY**: Research saved to `/home/ser/.claude/MEMORY/RESEARCH/2026-03/opencode-cli-documentation-research.md`

**Navi**: OpenCode documentation fully researched -- config, AGENTS.md, 75+ providers, SDK, plugins, headless mode, no native memory

---

Sources:
- [OpenCode GitHub Repository](https://github.com/anomalyco/opencode)
- [OpenCode Documentation -- Intro](https://opencode.ai/docs/)
- [OpenCode Config Reference](https://opencode.ai/docs/config/)
- [OpenCode Rules (AGENTS.md)](https://opencode.ai/docs/rules/)
- [OpenCode CLI Reference](https://opencode.ai/docs/cli/)
- [OpenCode Agents](https://opencode.ai/docs/agents/)
- [OpenCode Providers](https://opencode.ai/docs/providers/)
- [OpenCode MCP Servers](https://opencode.ai/docs/mcp-servers/)
- [OpenCode Commands](https://opencode.ai/docs/commands/)
- [OpenCode Plugins](https://opencode.ai/docs/plugins/)
- [OpenCode SDK](https://opencode.ai/docs/sdk/)
- [Persistent Session Memory Feature Request](https://github.com/anomalyco/opencode/issues/16077)
- [OpenCode Beginner Guide 2026](https://help.apiyi.com/en/opencode-ai-coding-agent-beginner-guide-2026-en.html)
- [OpenCode Quickstart -- DEV Community](https://dev.to/rosgluk/opencode-quickstart-install-configure-and-use-the-terminal-ai-coding-agent-4kcb)
- [Context Management and Compaction](https://deepwiki.com/sst/opencode/2.4-context-management-and-compaction)
- [OpenCode Hooks Extensibility Guide](https://dev.to/einarcesar/does-opencode-support-hooks-a-complete-guide-to-extensibility-k3p)