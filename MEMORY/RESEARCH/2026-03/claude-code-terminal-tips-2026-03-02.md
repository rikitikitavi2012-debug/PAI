# Claude Code Terminal Best Practices & Power-User Tips (2025-2026)

**Researcher**: Ava Sterling (ClaudeResearcher)
**Date**: 2026-03-02
**Scope**: DEEP research -- 7 search queries, 11 source pages fetched

---

## 1. TERMINAL EMULATOR CHOICE & CONFIGURATION

### Recommended Terminals (with native Claude Code support)
- **Kitty** -- GPU-accelerated, native Shift+Enter, native desktop notifications, built-in splits/tabs, no tmux needed for local work
- **Ghostty** -- Native desktop notifications, modern GPU rendering
- **WezTerm** -- Native Shift+Enter, cross-platform, Lua-configurable
- **iTerm2** (macOS) -- Native Shift+Enter, needs notification setup in Settings > Profiles > Terminal > "Notification Center Alerts"

### Terminals needing `/terminal-setup`
- VS Code integrated terminal
- Alacritty
- Zed
- Warp

### Kitty-specific configuration
Add to `kitty.conf` for Claude Code multi-line input:
```
map --when-focus-on title:claude shift+enter send_text normal,application \\\n
```

### Theme matching
Run `/config` inside Claude Code and select the theme option to match Claude Code's syntax highlighting to your terminal's light or dark background.

---

## 2. ESSENTIAL KEYBOARD SHORTCUTS

### Built-in shortcuts (most useful)
| Shortcut | Action |
|---|---|
| `Enter` | Submit message |
| `\` + Enter | Newline in prompt (universal) |
| `Shift+Enter` | Newline (iTerm2, WezTerm, Ghostty, Kitty natively) |
| `Ctrl+C` | Cancel/interrupt current operation |
| `Ctrl+D` | Exit Claude Code |
| `Ctrl+T` | Toggle task list visibility |
| `Ctrl+O` | Toggle verbose transcript |
| `Ctrl+R` | Search command history |
| `Ctrl+B` | Background current task |
| `Ctrl+G` | Open prompt in external editor ($EDITOR) |
| `Ctrl+S` | Stash current prompt |
| `Ctrl+V` | Paste image (Alt+V on Windows) |
| `Cmd+P / Meta+P` | Open model picker |
| `Cmd+T / Meta+T` | Toggle extended thinking |
| `Shift+Tab` | Cycle permission modes |
| `Escape` (2x) | Open rewind menu |

### Custom keybindings
File: `~/.claude/keybindings.json` (create via `/keybindings`)
- Changes auto-detected, no restart needed
- Supports chords (e.g., `ctrl+k ctrl+s`)
- Set action to `null` to unbind
- Run `/doctor` to see keybinding warnings

### Vim Mode
Enable with `/vim`. Supports:
- Mode switching: Esc (NORMAL), i/I/a/A/o/O (INSERT)
- Navigation: h/j/k/l, w/e/b, 0/$, gg/G, f/F/t/T
- Editing: x, dw/dd/D, cw/cc/C, ciw/caw
- Yank/paste: yy/Y, yw/ye/yb, p/P
- Text objects: iw/aw, i"/a", i(/a(, i{/a{
- Indentation: >>/<<
- Undo: u, Ctrl+r (redo)

---

## 3. SLASH COMMANDS CHEAT SHEET

| Command | What it does |
|---|---|
| `/clear` | Fresh conversation (do this often!) |
| `/config` | Settings: theme, model, permissions |
| `/vim` | Enable vim mode |
| `/terminal-setup` | Auto-configure Shift+Enter for your terminal |
| `/statusline` | Generate/configure status line script |
| `/keybindings` | Open keybindings.json |
| `/hooks` | Interactive hook setup |
| `/usage` | Check rate limits and token usage |
| `/chrome` | Toggle browser tool |
| `/mcp` | Manage MCP servers |
| `/stats` | View activity graph |
| `/copy` | Copy last response to clipboard |
| `/rewind` | Restore conversation or code to earlier point |
| `/doctor` | Diagnose configuration issues |
| `/compact` | Manually compact context |

---

## 4. NOTIFICATION & SOUND SETUP

### Native terminal notifications (zero config)
- **Kitty**: Works out of the box
- **Ghostty**: Works out of the box
- **iTerm2**: Enable in Settings > Profiles > Terminal > Notification Center Alerts > Filter > "Send escape sequence-generated alerts"

### Notification hooks (Linux/WSL)
Add to `~/.claude/settings.json`:
```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "notify-send 'Claude Code' 'Claude Code needs your attention'"
          }
        ]
      }
    ]
  }
}
```

### Sound alerts (hook-based)
macOS: `"command": "afplay ~/.claude/sounds/done.mp3 &"`
Linux: `"command": "paplay ~/.claude/sounds/done.wav &"` or `"command": "mpv --no-video ~/.claude/sounds/done.mp3 &"`

The `&` at the end is critical -- it runs in background so it does not block Claude Code.

### Community notification plugin: claude-notifications-go
- **6 notification types**: Task Complete, Review Complete, Question, Plan Ready, Session Limit, API Error
- **Cross-platform**: macOS, Linux, Windows (Git Bash/WSL)
- **Click-to-focus**: Opens your terminal window on click
- **Webhooks**: Slack, Discord, Telegram, Teams, ntfy.sh, PagerDuty, Zapier, n8n
- **Install**: `curl -fsSL https://raw.githubusercontent.com/777genius/claude-notifications-go/main/bin/bootstrap.sh | bash`
- **Config**: `~/.claude/claude-notifications-go/config.json`
- https://github.com/777genius/claude-notifications-go

---

## 5. STATUS LINE CONFIGURATION

### Official method
Run `/statusline` and describe what you want in natural language. Claude generates a script.

### How it works
Claude Code pipes JSON (model, tokens, costs, workspace) to your script via stdin. Script outputs text for the bottom bar.

### Performance tip
Cache slow operations (e.g., `git status`) to a temp file, refresh every 5 seconds. Status line script runs frequently.

### Community status line tools
- **ccstatusline** -- Highly customizable, powerline support, themes, Windows compatible. https://github.com/sirmalloc/ccstatusline
- **claude-code-statusline** -- 4-line layout, real-time cost tracking, MCP monitoring, themes. https://github.com/rz1989s/claude-code-statusline
- **claude-powerline** -- Vim-style powerline, real-time usage, Git integration. https://github.com/Owloops/claude-powerline
- **claudia-statusline** -- Rust-based, persistent stats, progress bars. https://github.com/hagan/claudia-statusline
- **CCometixLine** -- Rust, Git integration, usage tracking. https://github.com/Haleclipse/CCometixLine
- **claude_monitor_statusline** -- Usage info display. https://github.com/gabriel-dehan/claude_monitor_statusline

### Your existing statusline
You already have a 1320-line audited statusline at `~/.claude/statusline-command.sh`. These community tools are alternatives or inspiration for further customization.

---

## 6. TMUX vs KITTY SPLITS

### Kitty splits (recommended for local Claude Code work)
**Pros:**
- No multiplexer layer = no state machine translation bugs
- GPU-rendered, faster
- Native image protocol (future Claude Code support via Issue #2266)
- Simpler configuration
- Native Shift+Enter, notifications work without extra setup

**Cons:**
- No remote session persistence (cannot detach/reattach over SSH)
- No sessions (has tabs, but not saveable sessions)

### tmux (recommended for remote work or multi-instance management)
**Pros:**
- Session persistence (detach/reattach, survives disconnects)
- Essential for SSH work
- Required by Claude Squad (multi-agent orchestration)
- Mature ecosystem of plugins

**Cons:**
- Ctrl+B conflicts with Claude Code's "background task" shortcut (press twice to send)
- Extra state machine layer = occasional rendering glitches
- Image protocols broken through tmux (no sixel/kitty graphics passthrough)

### Recommendation for your setup (WSL2)
Since you work locally in WSL2, **Kitty splits are simpler and better** for day-to-day Claude Code use. Keep tmux available for when you need Claude Squad or SSH to your VPS servers.

---

## 7. SHELL ALIASES & CUSTOM SCRIPTS

### Essential aliases (add to `~/.bashrc`)
```bash
alias c='claude'
alias ch='claude -c'          # continue last conversation
alias cq='claude -p'          # quick non-interactive query
alias cplan='claude --plan'   # start in plan mode

# Git shortcuts used with Claude
alias gb='git branch'
alias co='git checkout'
alias gs='git status'
```

### Non-interactive piped commands
```bash
# Quick code review
git diff | claude -p "review this diff for bugs"

# Explain a file
claude -p "explain what this does" < complex-script.sh

# Generate commit message
git diff --staged | claude -p "write a conventional commit message for these changes"
```

### Custom slash commands
Create markdown files in `.claude/commands/` (project) or `~/.claude/commands/` (global).
Filename becomes the command name.

Example `~/.claude/commands/lint.md`:
```markdown
Run the linter on all changed files. Fix any issues found.
Show me what you fixed.
```
Then use as `/lint` inside Claude Code.

---

## 8. MULTI-INSTANCE & ORCHESTRATION TOOLS

### Claude Squad (terminal multi-agent manager)
- Manages multiple Claude Code instances from one TUI
- Uses tmux sessions + git worktrees for isolation
- Keyboard-driven: `n` new, `D` delete, `j/k` navigate, Enter to attach, `ctrl-q` to detach
- Auto-accept mode with `-y` flag
- Install: `curl -fsSL https://raw.githubusercontent.com/smtg-ai/claude-squad/main/install.sh | bash`
- https://github.com/smtg-ai/claude-squad

### claude-tmux
- tmux popup for managing Claude Code instances
- Quick switching between sessions
- https://github.com/nielsgroen/claude-tmux

### Dippy (permission fatigue solver)
- Auto-approves safe bash commands using AST-based parsing
- Prompts only for destructive operations
- https://github.com/ldayton/Dippy

### claude-esp
- Streams Claude Code's hidden/internal output to a separate terminal
- Useful for debugging what Claude is "thinking"
- https://github.com/phiat/claude-esp

---

## 9. USAGE MONITORING TOOLS

| Tool | Description | Link |
|---|---|---|
| CC Usage (ccusage) | Dashboard CLI analyzing usage from local logs | https://github.com/ryoppippi/ccusage |
| Claude Code Usage Monitor | Real-time terminal token consumption and burn rates | https://github.com/Maciek-roboblog/Claude-Code-Usage-Monitor |
| ccflare / better-ccflare | Web-based usage dashboard | https://github.com/tombii/better-ccflare |
| cchistory | Shell history-like tool for Claude Code sessions | https://github.com/eckardt/cchistory |

---

## 10. CONTEXT & WORKFLOW MANAGEMENT

### CLAUDE.md best practices (you already know these)
- Keep under 80 lines
- Only include what Claude cannot guess on its own
- Use `.claude/rules/*.md` for modular rules

### Context management tips
- `/clear` every time you switch topics (saves tokens, avoids confusion)
- Create handoff documents before `/compact` for complex sessions
- Use `/rewind` to restore conversation OR code to an earlier point
- Avoid pasting very long content -- write to a file and ask Claude to read it
- Tab-complete file paths in prompts for precise context

### Searching past sessions
Sessions stored in `~/.claude/projects/`. Search with:
```bash
grep -r "search term" ~/.claude/projects/ --include="*.jsonl"
```
Or community tool **recall** for full-text search: https://github.com/AshkanAe/recall

### Configuration switcher
**claudectx** -- Switch entire Claude Code configuration (CLAUDE.md, settings, commands) with a single command. Useful if you work across very different project types.
https://github.com/foxj77/claudectx

---

## 11. LARGE INPUTS & FILE WORKFLOWS

- **Do not paste** very long text directly -- Claude Code may truncate it
- **VS Code terminal** is especially prone to truncation
- **Best practice**: Write content to a file, then tell Claude to read it
- Use `Ctrl+V` (or `Alt+V` on Windows) to paste images directly into the prompt
- Future: Terminal graphics protocol support (Sixel, Kitty, iTerm2) requested in Issue #2266

---

## 12. SECURITY & AUDIT

- **Audit approved commands regularly** via `/config` -- permissions can accumulate
- **Dippy** auto-approves safe commands, blocks destructive ones
- **parry** -- Prompt injection scanner for Claude Code hooks (https://github.com/vaporif/parry)
- **claude-rules-doctor** -- CLI detecting dead/unused rule files (https://github.com/nulone/claude-rules-doctor)
- Run `/doctor` periodically to check configuration health
- **Container isolation**: Run risky tasks in Docker via `container-use` (https://github.com/dagger/container-use) or `viwo-cli` (https://github.com/OverseedAI/viwo)

---

## 13. THE 45 TIPS SUMMARY (from ykdojo/claude-code-tips)

Most actionable for a non-programmer:
1. Customize your statusline (Tip 0)
2. Learn slash commands: /usage, /clear, /stats (Tip 1)
3. Use voice transcription for faster input (Tip 2)
4. Break big tasks into smaller sub-tasks (Tip 3)
5. Keep context fresh -- /clear when switching topics (Tip 5)
6. Set up shell aliases: c, ch, cq (Tip 7)
7. Proactively compact with handoff docs (Tip 8)
8. Use terminal tabs for multiple sessions (Tip 14)
9. Use git worktrees for parallel branch work (Tip 16)
10. Run risky tasks in containers (Tip 21)
11. Audit approved commands list (Tip 33)
12. Install the dx plugin for pre-built skills (Tip 44)

Full list: https://github.com/ykdojo/claude-code-tips

---

## 14. AWESOME-CLAUDE-CODE ECOSYSTEM

Curated collection of all community tools: https://github.com/hesreallyhim/awesome-claude-code

Categories covered: terminal tools, notification plugins, statusline implementations, workflow automation, orchestration frameworks, configuration tools, security scanners, and container isolation tools.

---

## Sources

1. https://code.claude.com/docs/en/terminal-config -- Official terminal configuration docs
2. https://code.claude.com/docs/en/keybindings -- Official keybindings reference
3. https://code.claude.com/docs/en/statusline -- Official statusline docs
4. https://code.claude.com/docs/en/hooks-guide -- Official hooks documentation
5. https://www.builder.io/blog/claude-code -- "How I use Claude Code (+ my best tips)"
6. https://github.com/ykdojo/claude-code-tips -- 45 Claude Code tips repository
7. https://github.com/hesreallyhim/awesome-claude-code -- Curated tools collection
8. https://github.com/777genius/claude-notifications-go -- Cross-platform notifications plugin
9. https://github.com/smtg-ai/claude-squad -- Multi-agent terminal manager
10. https://github.com/anthropics/claude-code/issues/2266 -- Terminal graphics protocol request
11. https://github.com/anthropics/claude-code/issues/3853 -- Kitty terminal-setup workaround
12. https://sanj.dev/post/comparing-ai-cli-coding-assistants -- CLI agent comparison 2026
13. https://claudefa.st/blog/guide/terminal-setup-guide -- Terminal setup guide
14. https://alexop.dev/posts/claude-code-notification-hooks/ -- Notification hooks tutorial
15. https://andrew.hau.st/blog/from-tmux-to-kitty/ -- tmux to Kitty migration
