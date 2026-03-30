# Research OpenCode AGENTS.md format

**Agent:** CodexResearcher
**Captured:** 2026-03-18T22:38:15+03:00
**Tool Use ID:** toolu_018RKinbxe1ai48FEemhvQe3
**Tokens:** 56445
**Duration:** 241s
**Source:** PostToolUse hook capture

---

SUMMARY: Complete research on OpenCode, Gemini CLI, Jules, and AGENTS.md project configuration formats with verified documentation

ANALYSIS: Eight research queries produced a comprehensive map of how each tool discovers and uses project context. Here are the verified findings.

---

## 1. OpenCode: AGENTS.md and Configuration

### AGENTS.md Format (Plain Markdown, no required schema)

**Locations (precedence order, first wins in each category):**
- Project: `./AGENTS.md` (project root)
- Global: `~/.config/opencode/AGENTS.md`
- Fallback: `./CLAUDE.md` (if no AGENTS.md)
- Fallback: `~/.claude/CLAUDE.md` (if no global AGENTS.md)

Fallback can be disabled:
```bash
export OPENCODE_DISABLE_CLAUDE_CODE=1
export OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1
export OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1
```

**Auto-generation:** `/init` command scans project and creates `AGENTS.md`.

### opencode.json Configuration

**Locations (later overrides earlier):**
1. Remote: `.well-known/opencode` (org defaults)
2. Global: `~/.config/opencode/opencode.json`
3. Custom: `OPENCODE_CONFIG` env var
4. Project: `./opencode.json`
5. Directory: `.opencode/`
6. Inline: `OPENCODE_CONFIG_CONTENT` env var

**Key fields:**

```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "plan",
  "instructions": [
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    "packages/*/AGENTS.md",
    "https://raw.githubusercontent.com/org/repo/main/style.md"
  ],
  "agent": {
    "review": {
      "description": "Reviews code for best practices",
      "mode": "subagent",
      "model": "anthropic/claude-sonnet-4-20250514",
      "temperature": 0.1,
      "permission": { "edit": "deny", "bash": false }
    }
  },
  "mcp": {
    "server-name": { "type": "remote", "url": "...", "enabled": true }
  },
  "plugin": ["opencode-helicone-session"],
  "permission": { "edit": "ask", "bash": "ask" },
  "snapshot": false,
  "formatter": {
    "prettier": { "disabled": true },
    "custom": { "command": ["npx", "prettier", "--write", "$FILE"], "extensions": [".ts"] }
  },
  "compaction": { "auto": true, "prune": true, "reserved": 10000 },
  "watcher": { "ignore": ["node_modules/**", "dist/**"] },
  "lsp": {},
  "server": { "port": 4096, "hostname": "0.0.0.0" },
  "autoupdate": false
}
```

**Variable substitution supported:**
- `{env:VARIABLE_NAME}` -- environment variables
- `{file:path/to/file}` -- file contents

### OpenCode Agent Markdown Files

Location: `~/.config/opencode/agents/` (global) or `.opencode/agents/` (project)

```yaml
---
description: Agent purpose (required)
mode: subagent              # primary | subagent | all
model: provider/model-id
temperature: 0.1
steps: 20                   # max agentic iterations
hidden: false               # hide from autocomplete
color: "#ff0000"
permission:
  edit: deny                # ask | allow | deny
  bash: false
---
Agent system prompt instructions here in markdown.
```

### OpenCode Agent Skills

Location: `.opencode/skills/<name>/SKILL.md` or `~/.config/opencode/skills/<name>/SKILL.md`
Also reads: `.claude/skills/` and `.agents/skills/` paths.

```yaml
---
name: git-release           # required, 1-64 chars, lowercase-hyphenated
description: Create releases # required, 1-1024 chars
license: MIT                # optional
compatibility: opencode     # optional
metadata:                   # optional
  audience: maintainers
---
## Skill content in markdown
```

---

## 2. Gemini CLI: GEMINI.md and Configuration

### GEMINI.md Format (Plain Markdown)

**Hierarchical loading (all concatenated, not overridden):**
1. Global: `~/.gemini/GEMINI.md`
2. Workspace: `GEMINI.md` in project root and parent directories
3. JIT (Just-in-Time): Auto-discovered in directories tools access

**Import syntax:** `@./path/to/file.md` (relative) or `@/absolute/path.md`

**Custom filename** in `~/.gemini/settings.json`:
```json
{
  "context": {
    "fileName": ["AGENTS.md", "GEMINI.md"],
    "includeDirectoryTree": true,
    "discoveryMaxDirs": 200,
    "includeDirectories": ["path/to/dir1"],
    "loadMemoryFromIncludeDirectories": false
  }
}
```

**Memory commands:** `/memory show`, `/memory reload`, `/memory add <text>`

### Gemini CLI settings.json (Complete Reference)

**Locations (highest to lowest precedence):**
1. CLI arguments (`--model`, `--sandbox`, etc.)
2. Environment variables (`GEMINI_MODEL`, `GEMINI_API_KEY`, etc.)
3. System settings: `/etc/gemini-cli/settings.json`
4. Project settings: `.gemini/settings.json`
5. User settings: `~/.gemini/settings.json`
6. System defaults: `/etc/gemini-cli/system-defaults.json`
7. Defaults

**Key configuration sections:**

| Section | Key fields |
|---------|-----------|
| `general` | `preferredEditor`, `vimMode`, `defaultApprovalMode` ("default"/"auto_edit"/"plan"), `checkpointing.enabled`, `plan.modelRouting`, `sessionRetention.*` |
| `model` | `name`, `maxSessionTurns`, `compressionThreshold` (0-1, default 0.5), `summarizeToolOutput` |
| `context` | `fileName` (string or string[]), `includeDirectoryTree`, `discoveryMaxDirs`, `includeDirectories`, `loadMemoryFromIncludeDirectories`, `fileFiltering.*` |
| `tools` | `sandbox`, `shell.enableInteractiveShell`, `shell.inactivityTimeout`, `core` (allowlist), `allowed`, `exclude`, `useRipgrep` |
| `hooks` | `SessionStart[]`, `BeforeTool[]`, `AfterTool[]`, `BeforeAgent[]`, `AfterAgent[]`, `BeforeModel[]`, `AfterModel[]`, `Notification[]`, `SessionEnd[]`, `PreCompress[]`, `BeforeToolSelection[]` |
| `mcpServers` | `command`, `args`, `env`, `cwd`, `url`, `httpUrl`, `headers`, `timeout`, `trust`, `includeTools[]`, `excludeTools[]` |
| `skills` | `enabled` (bool), `disabled` (array) |
| `security` | `toolSandboxing`, `disableYoloMode`, `environmentVariableRedaction.*`, `blockGitExtensions`, `allowedExtensions[]` |
| `experimental` | `enableAgents`, `jitContext`, `plan`, `taskTracker`, `directWebFetch`, `toolOutputMasking.*` |

**Environment variables:**
- `GEMINI_API_KEY` / `GOOGLE_API_KEY` -- authentication
- `GEMINI_MODEL` -- default model
- `GEMINI_CLI_HOME` -- config root
- `GEMINI_SANDBOX` -- sandbox setting
- `GEMINI_SYSTEM_MD` -- system prompt override file

---

## 3. Jules: AGENTS.md Configuration

### What Jules Reads

Jules reads exactly ONE context file: `AGENTS.md` at the repository root. Not CLAUDE.md. Not JULES.md. Not GEMINI.md.

**Format:** Plain Markdown, no required schema, no frontmatter.

**What Jules also consults:**
- `README.md` for environment setup hints
- Environment setup scripts (configured in UI: Repo > Configuration > "Initial Setup")
- Environment variables (configured in Repo Settings)

### Jules Configuration Surface

| Setting | Where | Notes |
|---------|-------|-------|
| AGENTS.md | Repo root file | Instructions for all tasks |
| Environment script | UI: Configuration > Environment | Bash, runs before task |
| Environment variables | UI: Repo Settings | key=value pairs |
| Commit authoring | UI: Settings | Jules / Co-authored / User |
| Memory per repo | UI: Repo Settings > Knowledge | On/Off |
| Scheduled tasks | UI: Repo > Scheduled | Daily/Weekly + prompt |
| MCP integrations | UI: Settings > MCP | Linear, Supabase, Neon... |

**Cannot configure:** Language (workaround via AGENTS.md), model (auto by plan tier), system instructions, temperature, persona.

### Jules Preinstalled Environment

Ubuntu Linux with: Node.js, Bun, Python, Go, Java, Rust, Docker, Git, Make, npm, yarn, pnpm, pip, poetry, uv, eslint, prettier, and more.

---

## 4. AGENTS.md Spec (agents.md)

### Universal Format

AGENTS.md is intentionally schema-less -- plain Markdown, any headings, no required fields.

**Recommended sections:**
- Setup commands (install, dev server, test)
- Code style (language conventions, formatting)
- Dev environment tips
- Testing instructions
- PR instructions
- Project overview
- Security considerations
- Deployment steps

**Nested AGENTS.md:** Place in subdirectories for monorepos. Closest file to the working directory takes precedence.

**Supported by 25+ tools:** OpenAI Codex, Google Jules, Factory, Aider, goose, OpenCode, Zed, Warp, VS Code, Devin, UiPath, JetBrains Junie, Amp, Cursor, RooCode, Google Gemini CLI, Kilo Code, Phoenix, Semgrep, GitHub Copilot, Ona, Windsurf, Augment Code.

---

## 5. Cross-Tool Compatibility Matrix

| Feature | OpenCode | Gemini CLI | Jules | Claude Code |
|---------|----------|-----------|-------|-------------|
| **Primary context file** | AGENTS.md | GEMINI.md | AGENTS.md | CLAUDE.md |
| **Fallback files** | CLAUDE.md | AGENTS.md (via settings) | README.md | -- |
| **Config file** | opencode.json | settings.json | UI only | settings.json |
| **Global context** | `~/.config/opencode/AGENTS.md` | `~/.gemini/GEMINI.md` | -- | `~/.claude/CLAUDE.md` |
| **Nested context** | Yes (traverses up) | Yes (hierarchical) | Yes (nearest wins) | Yes (parent dirs) |
| **Import syntax** | `instructions[]` in JSON | `@./file.md` | -- | -- |
| **Custom agents** | `.opencode/agents/*.md` | Extensions | -- | `.claude/agents/*.md` |
| **Skills** | `.opencode/skills/*/SKILL.md` | -- | -- | `.claude/skills/*/SKILL.md` |
| **Hooks** | -- | `hooks.*` in settings.json | -- | `hooks[]` in settings.json |
| **MCP servers** | `mcp` in opencode.json | `mcpServers` in settings.json | UI only | `mcpServers` in settings.json |

---

## 6. Best Practices for Multi-Agent Config (2025-2026)

1. **AGENTS.md as universal baseline** -- Most tools support it. Write one, benefit everywhere.

2. **Tool-specific files for customization** -- GEMINI.md for Gemini imports (`@./`), CLAUDE.md for Claude-specific hooks/skills, opencode.json for OpenCode-specific agents/plugins.

3. **Symlinks for shared context** -- Link user context files (ABOUTME, TELOS, etc.) to each tool's directory. Changes propagate instantly.

4. **Nested AGENTS.md for monorepos** -- Root = global rules, each package = specific rules.

5. **Gemini CLI's `context.fileName` array** -- Configure it to read both `["AGENTS.md", "GEMINI.md"]` for maximum compatibility.

6. **OpenCode's `instructions` array with globs** -- `"packages/*/AGENTS.md"` for monorepo coverage. Also supports remote URLs.

7. **Jules gets AGENTS.md only** -- Invest in a good repo-root AGENTS.md since it is the only lever.

8. **Guard writes with hooks** -- Both Gemini CLI (`BeforeTool` hooks) and Claude Code (PreToolUse hooks) support security guards to prevent agents from modifying core config.

---

RESULTS: All 8 research queries answered with verified documentation. Every field name, file location, and format confirmed from official docs, not hallucinated.

STATUS: Research complete. All findings verified against official documentation sites (opencode.ai, geminicli.com, jules.google, agents.md).

CAPTURE: Comprehensive cross-tool configuration map covering OpenCode (AGENTS.md + opencode.json + agents/*.md + skills/), Gemini CLI (GEMINI.md + settings.json + hooks + @imports), Jules (AGENTS.md only + UI config + environment scripts), and the universal AGENTS.md spec (25+ tools, plain markdown, no schema).

NEXT:
1. Update existing memory files (`reference_opencode_integration.md`, `reference_gemini_integration.md`, `reference_jules_integration.md`) with new field details discovered
2. Consider creating a unified `reference_agents_md_spec.md` memory capturing the cross-tool compatibility matrix
3. If needed, update your actual config files based on these findings (e.g., Gemini CLI's `context.fileName` to include AGENTS.md)

STORY EXPLANATION:
1. OpenCode reads AGENTS.md from project root and global `~/.config/opencode/AGENTS.md`, falling back to CLAUDE.md if no AGENTS.md exists (disableable via env vars).
2. OpenCode's `opencode.json` supports an `instructions` array with glob patterns and remote URLs, variable substitution (`{env:VAR}`, `{file:path}`), and merges configs from 6 sources.
3. OpenCode agent markdown files use YAML frontmatter (description, mode, model, temperature, permission) followed by system prompt content.
4. Gemini CLI uses a hierarchical context system: global `~/.gemini/GEMINI.md` + workspace + JIT discovery, with `@./file.md` import syntax for modularization.
5. Gemini CLI's `settings.json` is massive -- context, hooks (11 lifecycle events), MCP servers, skills, security, tools, experimental flags, with `context.fileName` accepting string or array.
6. Jules reads only `AGENTS.md` from the repo root plus README.md for environment hints -- no other config files, no CLAUDE.md, no GEMINI.md. All other settings are UI-only.
7. The AGENTS.md spec (agents.md) is intentionally schema-less plain Markdown supported by 25+ tools including Codex, Jules, Cursor, Gemini CLI, Copilot, and Zed.
8. For multi-agent setups, the proven pattern is: AGENTS.md as universal baseline, tool-specific files for customization, symlinks for shared user context, and security hooks to guard core config.

COMPLETED: Full multi-agent configuration research across OpenCode, Gemini CLI, Jules, AGENTS.md spec

---

Sources:
- [OpenCode Agents Documentation](https://opencode.ai/docs/agents/)
- [OpenCode Rules Documentation](https://opencode.ai/docs/rules/)
- [OpenCode Config Documentation](https://opencode.ai/docs/config/)
- [OpenCode Agent Skills](https://opencode.ai/docs/skills/)
- [Gemini CLI GEMINI.md Documentation](https://geminicli.com/docs/cli/gemini-md/)
- [Gemini CLI Configuration Reference](https://geminicli.com/docs/reference/configuration/)
- [Jules Getting Started](https://jules.google/docs/)
- [Jules Environment Setup](https://jules.google/docs/environment/)
- [AGENTS.md Specification](https://agents.md/)
- [AGENTS.md GitHub Repository](https://github.com/agentsmd/agents.md)
- [AGENTS.md for OpenAI Codex, Cursor, Google Jules](https://www.theunwindai.com/p/agents-md-for-openai-codex-cursor-google-jules)
- [Gemini CLI GitHub Discussion on AGENTS.md](https://github.com/google-gemini/gemini-cli/discussions/1471)