# Gemini CLI -- Complete Documentation Research
**Date**: 2026-03-13
**Source**: Official docs, GitHub repo, community guides

---

## 1. CONFIGURATION SYSTEM

### File Hierarchy & Precedence (lowest to highest)
1. Hardcoded defaults
2. System defaults (`/etc/gemini-cli/system-defaults.json`)
3. User settings (`~/.gemini/settings.json`)
4. Project settings (`.gemini/settings.json`)
5. System settings (`/etc/gemini-cli/settings.json`)
6. Environment variables (including `.env` files)
7. Command-line arguments

### settings.json -- All Sections

**general**: preferredEditor, vimMode, disableAutoUpdate, disableUpdateNag, checkpointing.enabled
**output**: format ("text"|"json")
**ui**: theme, customThemes, hideBanner, hideFooter, hideTips, hideWindowTitle, showMemoryUsage, showLineNumbers, showCitations, customWittyPhrases[], accessibility.disableLoadingPhrases
**ide**: enabled, hasSeenNudge
**privacy**: usageStatisticsEnabled
**model**: name, maxSessionTurns (-1=unlimited), summarizeToolOutput, chatCompression.contextPercentageThreshold (0-1, default 0.7), skipNextSpeakerCheck
**context**: fileName (string|array), importFormat, discoveryMaxDirs (default 200), includeDirectories[], loadFromIncludeDirectories, fileFiltering.respectGitIgnore, fileFiltering.respectGeminiIgnore, fileFiltering.enableRecursiveFileSearch
**tools**: sandbox, shell.enableInteractiveShell, core[], exclude[], allowed[], discoveryCommand, callCommand
**mcp**: serverCommand, allowed[], excluded[]
**mcpServers.<NAME>**: command, args[], env{}, cwd, url, httpUrl, headers{}, timeout, trust, description, includeTools[], excludeTools[]
**security**: folderTrust.enabled, auth.selectedType, auth.enforcedType, auth.useExternal
**advanced**: autoConfigureMemory, dnsResolutionOrder, excludedEnvVars[], bugCommand
**telemetry**: enabled, target ("local"|"gcp"), otlpEndpoint, otlpProtocol ("grpc"|"http"), logPrompts, outfile, useCollector
**hooks**: see section 4 below

### Key Environment Variables
- GEMINI_API_KEY -- API authentication
- GEMINI_MODEL -- default model override
- GOOGLE_API_KEY -- Vertex AI/Cloud credentials
- GOOGLE_CLOUD_PROJECT -- project ID
- GOOGLE_CLOUD_LOCATION -- region
- GOOGLE_APPLICATION_CREDENTIALS -- service account JSON
- GEMINI_SANDBOX -- sandbox mode
- GEMINI_SYSTEM_MD -- system prompt override (see below)
- GEMINI_WRITE_SYSTEM_MD -- export built-in system prompt
- DEBUG -- verbose logging
- NO_COLOR -- disable colors
- CLI_TITLE -- custom title

### Key File Paths
- ~/.gemini/settings.json -- user settings
- .gemini/settings.json -- project settings
- ~/.gemini/GEMINI.md -- global context
- ~/.gemini/commands/ -- global custom commands
- .gemini/commands/ -- project custom commands
- ~/.gemini/extensions/ -- extensions directory
- .geminiignore -- file exclusion patterns

---

## 2. CONTEXT & MEMORY (GEMINI.md)

### GEMINI.md = Claude's CLAUDE.md
Exact analog. Provides persistent instructions to the model.

### Hierarchical Loading
1. **Global**: `~/.gemini/GEMINI.md` (rules for all projects)
2. **Project root + ancestors**: searches upward to `.git` boundary
3. **Subdirectories**: scans below CWD (respects .gitignore, .geminiignore)

All discovered files are concatenated and sent with every prompt.

### Features
- **Modular imports**: `@./path/file.md` syntax to break into components
- **Custom filename**: context.fileName in settings.json -- can be array: ["AGENTS.md", "CONTEXT.md", "GEMINI.md"]
- **Memory commands**:
  - `/memory show` -- display combined context
  - `/memory refresh` -- reload all GEMINI.md files
  - `/memory add <text>` -- append to global ~/.gemini/GEMINI.md
- **save_memory tool**: Agent can autonomously save facts to `## Gemini Added Memories` section in global GEMINI.md
- **Footer indicator**: CLI shows count of loaded context files

### GEMINI_SYSTEM_MD -- System Prompt Override
- `true` or `1`: loads `.gemini/system.md` from project root
- `/absolute/path.md`: loads custom file (FULL REPLACEMENT, not merge)
- `false`/`0`/unset: uses built-in prompt
- Dynamic variables available: `${AgentSkills}`, `${SubAgents}`, `${AvailableTools}`, `${toolName_ToolName}`
- Export defaults: `GEMINI_WRITE_SYSTEM_MD=1 gemini` writes built-in to `.gemini/system.md`
- UI indicator: `|⌐■_■|` when active

### Best Practice Distinction
- **system.md** (firmware): safety rules, tool protocols, operational mechanics
- **GEMINI.md** (strategy): persona, project context, methodologies, coding standards

---

## 3. MODEL SELECTION

### Precedence
1. `--model` / `-m` CLI flag (highest)
2. `GEMINI_MODEL` env var
3. `model.name` in settings.json
4. Local Gemma router (experimental)
5. Default: `auto` (currently gemini-2.5-pro)

### Model Routing (Auto-Failover)
- Enabled by default
- Silent fallback chain for internal ops: gemini-2.5-flash-lite -> gemini-2.5-flash -> gemini-2.5-pro
- User is prompted before switching for main conversation
- Local Gemma model can handle routing decisions (experimental)

### Interactive Switching
- `/model` command during session

---

## 4. HOOKS SYSTEM

### Lifecycle Events (12 hook points)
| Event | Trigger | Can Block? |
|---|---|---|
| SessionStart | Session begins | Inject context |
| SessionEnd | Session ends | Advisory only |
| BeforeAgent | After prompt, before planning | Block turn, inject context |
| AfterAgent | Agent loop ends | Retry/Halt |
| BeforeModel | Before LLM request | Block turn, mock response |
| AfterModel | After LLM response | Block turn, redact |
| BeforeToolSelection | Before tool selection | Filter tools |
| BeforeTool | Before tool execution | Block tool, rewrite args |
| AfterTool | After tool executes | Block result, inject context |
| PreCompress | Before context compression | Advisory |
| Notification | System notification | Advisory |

### Configuration (in settings.json)
```json
{
  "hooks": {
    "BeforeTool": [
      {
        "matcher": "write_file|replace",
        "hooks": [
          {
            "name": "security-check",
            "type": "command",
            "command": "$GEMINI_PROJECT_DIR/.gemini/hooks/security.sh",
            "timeout": 5000
          }
        ]
      }
    ]
  }
}
```

### Hook Fields
- type (required): "command" only
- command (required): shell command
- name (optional): identifier
- timeout (optional): ms, default 60000
- description (optional)
- matcher (optional): regex for tool events, exact string for lifecycle

### Communication Protocol
- Input: JSON via stdin
- Output: JSON via stdout (NO other stdout allowed)
- Debugging: stderr only
- Exit codes: 0=success (parse JSON), 2=system block (abort), other=warning

### Environment Variables in Hooks
- GEMINI_PROJECT_DIR, GEMINI_SESSION_ID, GEMINI_CWD, CLAUDE_PROJECT_DIR (compat alias)

### Management
- `/hooks panel` -- view all hooks
- `/hooks enable-all` / `/hooks disable-all`
- `/hooks enable <name>` / `/hooks disable <name>`

### Security
- Project-level hooks are fingerprinted; changes trigger trust warnings

---

## 5. EXTENSIONS

### Structure
```
~/.gemini/extensions/extension-name/
  gemini-extension.json
  commands/
    command.toml
    namespace/subcommand.toml
  GEMINI.md (optional context)
```

### gemini-extension.json Fields
- name (required): lowercase with dashes, must match dir name
- version (required)
- mcpServers (optional): map of MCP servers
- contextFileName (optional): defaults to GEMINI.md
- excludeTools (optional): array, supports patterns like "run_shell_command(rm -rf)"

### Variable Substitution
- ${extensionPath}, ${workspacePath}, ${/} or ${pathSeparator}

### Extension Management Commands
- `gemini extensions install <github-url|local-path>`
- `gemini extensions uninstall <name>`
- `gemini extensions disable/enable <name> [--scope=workspace]`
- `gemini extensions update <name> [--all]`
- `gemini extensions link <path>` (dev symlink)
- `gemini extensions new <path> <type>` (scaffold: context, custom-commands, exclude-tools, mcp-server)
- `/extensions list`

### Extensions Can Bundle
- MCP servers
- Custom commands (TOML)
- Context files (GEMINI.md)
- Hooks (since recent versions)
- Tool exclusions
- Themes

---

## 6. CUSTOM SLASH COMMANDS

### Locations
- Global: `~/.gemini/commands/*.toml`
- Project: `.gemini/commands/*.toml`
- Extension: `~/.gemini/extensions/*/commands/*.toml`

### Naming
File path -> command name. Subdirs create namespaces with colon:
- `commands/test.toml` -> `/test`
- `commands/git/commit.toml` -> `/git:commit`

### TOML Fields
- prompt (required): text sent to model
- description (optional): shown in /help

### Dynamic Content
- `{{args}}` -- user argument injection (shell-escaped inside !{} blocks)
- `!{command}` -- shell command output injection (with confirmation)
- `@{path/to/file}` -- file content injection (supports images, PDFs, audio, video)

### Example
```toml
description = "Generate commit message from staged changes"
prompt = """Generate commit message from staged changes:
```diff
!{git diff --staged}```"""
```

---

## 7. HEADLESS / SCRIPTING MODE

### Trigger Conditions
- `--prompt` / `-p` flag
- Non-TTY environment (piped input)

### Key Flags
| Flag | Short | Purpose |
|---|---|---|
| --prompt | -p | Non-interactive prompt |
| --output-format | | "text" or "json" |
| --model | -m | Model selection |
| --yolo | -y | Auto-approve all actions |
| --approval-mode | | Tool approval strategy |
| --sandbox | -s | Enable sandboxing |
| --all-files | -a | Include all files in context |
| --include-directories | | Multi-directory workspace |
| --debug | -d | Verbose output |
| --allowed-tools | | Comma-separated tool list |
| --extensions | -e | Load specific extensions |

### Input Methods
```bash
# Direct prompt
gemini -p "What is machine learning?"

# Stdin pipe
echo "Explain this code" | gemini

# File + prompt
cat README.md | gemini -p "Summarize this"

# JSON output
gemini -p "query" --output-format json | jq '.response'

# Full automation
gemini -p "Fix the bug" --yolo --output-format json > result.json
```

### JSON Output Structure
- response: AI answer
- stats.models: per-model token counts (prompt, candidates, cached, thoughts, tool)
- stats.tools: call counts, success/fail, decisions
- stats.files: lines added/removed
- error: type, message, code

---

## 8. INTEGRATION PATTERNS

### CI/CD (GitHub Actions)
Official action: `google-gemini/gemini-cli-action`
Also: `google-github-actions/run-gemini-cli`

### Scripting Best Practices
- Use `--output-format json` for programmatic parsing
- Pipe with jq: `gemini -p "task" --output-format json | jq '.response'`
- Use `--yolo` cautiously in automated pipelines
- Set GEMINI_API_KEY via env var for auth
- Use `--sandbox` for isolation in untrusted environments
- Restrict PATH: `PATH=/usr/bin:/usr/local/bin gemini`

### Session Management
- `/chat save <tag>` -- persist conversation
- `/chat list` -- list saved sessions
- `/chat resume <tag>` -- resume session
- `--checkpointing` flag for auto-recovery

### Multi-Directory
- `gemini --include-directories "../backend:../frontend"` (max 5)
- Or in settings.json: `"context": { "includeDirectories": ["../backend", "../frontend"] }`

### File References
- `@./path/to/file` -- inject file content in prompts
- `@./folder/` -- inject all files in directory
- Respects .gitignore and .geminiignore

---

## KEY COMPARISON: Gemini CLI vs Claude Code

| Feature | Gemini CLI | Claude Code |
|---|---|---|
| Context file | GEMINI.md | CLAUDE.md |
| Global location | ~/.gemini/GEMINI.md | ~/.claude/CLAUDE.md |
| Project location | .gemini/GEMINI.md or root | .claude/CLAUDE.md or root |
| Settings | .gemini/settings.json | .claude/settings.json |
| Hooks | 12 lifecycle events, settings.json | Pre/post hooks in settings |
| Extensions | Full extension system | MCP servers |
| Custom commands | TOML files in commands/ | Slash commands |
| System prompt override | GEMINI_SYSTEM_MD env var | Not available |
| Memory | save_memory tool + /memory commands | /memory or manual |
| Headless | -p flag, JSON output | -p flag, JSON output |
| Model routing | Auto-failover built in | Manual selection |
| Sandbox | Docker/Podman/macOS Seatbelt | Docker sandbox |
| File references | @./path syntax | No direct analog |
| Session save/resume | /chat save/resume | /resume |
| Context compression | /compress command | /compact |
