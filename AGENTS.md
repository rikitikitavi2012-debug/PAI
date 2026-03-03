# PAI — Personal AI Infrastructure

## Project Overview

PAI is a hook-driven infrastructure layer for Claude Code CLI. It extends Claude Code
with 30+ TypeScript hooks that run as subprocesses on lifecycle events (session start,
tool use, prompt submit, compact, etc.). The system includes skills, memory management,
event logging, security validation, and automated learning.

**Owner**: Solo developer (Ivan). No team. No CI/CD pipeline yet.

## AI Brigade

| Agent | Role | When to use |
|-------|------|-------------|
| **Navi** (Claude Opus) | Architect, lead engineer | Architecture, complex decisions, interactive work |
| **Jules** (Google Gemini) | Async worker | Tests, bugs, TODOs, deps, security scans |
| **Agent Zero** (Claude Sonnet, 24/7 VPS) | Autonomous researcher | Deep research, code exec, browser, docs, DevOps |
| **Gemini CLI** / **GLM-5** | Inference tools | Second opinion, cross-check, bulk inference |

Full brigade reference: `PAI/BRIGADE.md`

## Stack

- **Runtime**: Bun (NOT Node.js, NOT npm, NOT yarn)
- **Language**: TypeScript (.ts)
- **Package manager**: `bun install` (uses bun.lock)
- **Test framework**: `bun:test` (built into Bun)
- **Platform**: Linux (WSL2)

## Directory Structure

```
~/.claude/                    # PAI root (PAI_DIR)
├── hooks/                    # 30 hook files (.hook.ts)
│   ├── lib/                  # Shared hook utilities
│   │   ├── paths.ts          # getPaiDir(), paiPath() — ALWAYS use these
│   │   ├── notifications.ts  # Voice notification helper
│   │   └── events.ts         # Event logging helper
│   └── tests/                # Test suites (bun:test)
│       ├── harness.ts        # Test harness — spawns hooks as subprocesses
│       └── *.test.ts         # Individual test files
├── PAI/                      # Core PAI system
│   ├── Algorithm/            # Algorithm mode logic
│   ├── Tools/                # TypeScript tools (EventStats, SessionProgress, etc.)
│   └── USER/                 # Personal data (DO NOT modify)
├── MEMORY/                   # Memory system (DO NOT modify)
│   ├── STATE/                # Runtime state files
│   ├── LEARNING/             # Learning signals
│   ├── WISDOM/               # Wisdom frames
│   └── WORK/                 # Work session tracking
├── skills/                   # Skill definitions (11 skills)
├── plugins/                  # Plugin configs
├── settings.json             # Claude Code settings
├── CLAUDE.md                 # Claude Code instructions
└── AGENTS.md                 # THIS FILE — Jules instructions
```

## Build & Test

```bash
# Install dependencies
bun install

# Run ALL tests
bun test hooks/tests/

# Run specific test
bun test hooks/tests/EventLogger.test.ts

# Run a hook manually (for debugging)
echo '{"hook_event_name": "TestEvent"}' | bun hooks/MyHook.hook.ts
```

## Code Conventions

### Hooks

- **File naming**: `PascalCase.hook.ts` (e.g., `SecurityValidator.hook.ts`)
- **Shebang**: Every hook MUST start with `#!/usr/bin/env bun`
- **Permissions**: Every hook MUST be `chmod +x`
- **Pattern**: Defensive, fail-open — hooks NEVER crash Claude Code
- **I/O**: Read JSON from stdin, write JSON to stdout (for PreToolUse/PostToolUse hooks)
- **Path resolution**: ALWAYS use `getPaiDir()` from `hooks/lib/paths.ts`, never hardcode `~/.claude`
- **Events**: Pure event-logging hooks → add as handler in `EventLogger.hook.ts` routing table
- **Performance**: Hooks should complete under 500ms

### Tests

- **File naming**: `HookName.test.ts` matching hook name
- **Harness**: Use `runHook()` from `hooks/tests/harness.ts`
- **Pattern**: Spawn hook as subprocess, pass JSON via stdin, assert on exit code + output
- **No mocking runtime**: Tests run real hooks — integration-style
- **Reference**: See `hooks/tests/EventLogger.test.ts` for canonical example

### General

- Keep changes minimal and surgical — fix the bug, don't refactor the world
- No npm/Node.js APIs — use Bun built-ins (`Bun.spawn`, `Bun.file`, `bun:test`)
- No `@anthropic-ai/sdk` — use `PAI/Tools/Inference.ts` for AI calls
- Commit messages: conventional commits (`feat:`, `fix:`, `test:`, `refactor:`)

## Testing Instructions

When writing tests for hooks:

1. Import `runHook` from `./harness`
2. Describe hook behavior in a `describe()` block
3. Test happy path, edge cases, empty input, and performance (<500ms)
4. Hooks read JSON from stdin — pass test data via `runHook(hookPath, stdinData)`
5. Assert on `exitCode`, `stdout`, `stderr`, `duration`, and `json` output
6. Run `bun test hooks/tests/` to verify ALL tests pass before committing

## Hooks Without Tests (priority work for Jules)

These hooks need test suites written:

- AgentExecutionGuard
- AlgorithmTracker
- AutoWorkCreation
- DocIntegrity
- IntegrityCheck
- KittyEnvPersist
- LastResponseCache
- QuestionAnswered
- RelationshipMemory
- ResponseTabReset
- SessionAutoName
- SessionCleanup
- SetQuestionTab
- StartupGreeting
- UpdateCounts
- UpdateTabTitle
- WorkCompletionLearning
- WorktreeRemove

## Security Considerations

- **NEVER** read or modify files in `MEMORY/`, `PAI/USER/`, or `WISDOM/` directories
- **NEVER** read `.env` files — they contain API keys
- **NEVER** push to `origin` remote (public repo) — only push to `private` remote
- **NEVER** add secrets, tokens, or API keys to any file
- **DO NOT** modify `settings.json`, `CLAUDE.md`, or `SecurityValidator.hook.ts`
- All PRs go to `master` branch (default branch of this repo)

## Commit Message Convention

```
type: short description

Optional body with context.

Co-Authored-By: Jules <noreply@google.com>
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`
