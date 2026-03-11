# Kitty Scripts Analysis Report
**Date:** 2026-03-09
**Analyst:** researcher
**Repository:** ~/.claude/config/kitty/scripts/

## Overview
- **Total scripts:** 12 .sh files
- **Total lines:** 3,900 lines (average 325 lines per script)
- **Largest script:** strategic-dashboard.sh (687 lines)
- **Smallest script:** tab-colors.sh (25 lines)

## Script Inventory

| Script | Lines | Purpose | Tier |
|--------|-------|---------|------|
| strategic-dashboard.sh | 687 | Algorithm metrics, Navi growth, TELOS, cost | T1-Dashboard |
| telemetry-dashboard.sh | 574 | System metrics, golden signals, provider stats | T1-Dashboard |
| telos-navigator.sh | 526 | Interactive TELOS detail panel | T1-UI |
| telos-radar.sh | 414 | TELOS strategic overview (left pane) | T1-Dashboard |
| telos-dashboard.sh | 414 | TELOS life dashboard | T1-Dashboard |
| brigade-watch.sh | 426 | AI brigade health + Jules sessions + JulesAutoMerge | T2-Monitor |
| a0-chat-tail.sh | 389 | Agent Zero conversation live viewer | T2-Monitor |
| command-center.sh | 304 | Operational pulse, system health, AI brigade | T1-Dashboard |
| telos-radar.sh | 292 | Strategic overview (left pane) | T1-Dashboard |
| agent-live.sh | 109 | Claude Code agent transcript viewer | T2-Monitor |
| infra-reference.sh | 111 | Infrastructure command cheat sheet | T3-Reference |
| events-tail.sh | 43 | System events live feed (tail -f with jq) | T2-Monitor |
| tab-colors.sh | 25 | Workspace domain color coding | T1-Startup |

## Library Dependencies

### Primary UI Library
- **lib/ui.sh** — sourced by 11/12 scripts (92%)
  - Used in: strategic-dashboard, telemetry-dashboard, telos-dashboard, telos-navigator, telos-radar, command-center, brigade-watch, agent-live, infra-reference, events-tail + others
  - Purpose: Terminal UI helpers (colors, formatting, layout)

### Secondary Libraries
- **lib/events-format.sh** — sourced by telemetry-dashboard.sh
  - Purpose: JSON event formatting and parsing

- **.config/PAI/.env** — conditionally sourced by 5 scripts
  - Used in: strategic-dashboard, telemetry-dashboard, telos-dashboard, telos-navigator, telos-radar
  - Purpose: API keys, voice IDs, LLM providers

## Core API Patterns

### 1. **curl** — HTTP API Calls
```bash
# Agent Zero health & logs (72.56.86.51:50002)
curl -s --max-time 5 "http://${A0_HOST}/health"
curl -s -H "X-API-KEY: $A0_TOKEN" -H "Content-Type: application/json" /api_log_get

# Voice server (localhost:8888)
curl -s -X POST "$VOICE_URL" -H "Content-Type: application/json"
```

### 2. **jq** — JSON Processing
- Stream parsing: `jq -r --unbuffered "$JQ_FILTER"`
- Field extraction: `jq -r '.gitinfo.sha // empty'`
- Aggregation: `jq '[.log.items[].no] | max'`
- Used in: 100% of scripts that process JSON (10/12)

### 3. **bun** — TypeScript Execution
- Used in: 6 scripts
- Primary: `bun PAI/Tools/AgentZero.ts` (CLI interface to A0)
- Secondary: `bun ~/.bun/bin` (PATH prefix for tool discovery)
- Pattern: `result=$(bun "$A0_CLI" message "$msg" 2>&1) && echo "$result" | jq -r '.response'`

### 4. **gh** — GitHub CLI
- Used in: brigade-watch.sh (2+ calls)
- Pattern: Pull PR/commit data for Jules pipeline status

### 5. **kitty** — Terminal Emulator Control
- Used in: tab-colors.sh, agent-live.sh
- Pattern: `kitty @ --to $SOCKET set-tab-color` (IPC via Unix socket)
- Also: `tail -n +1 -f "$TRANSCRIPT" | jq` (real-time streaming via file watch)

### 6. **tail / head / while read** — Stream Processing
- Used in: 8/12 scripts
- Pattern: Line-by-line processing with IFS splitting
- Example: `tail -n +1 -f "$TRANSCRIPT" | jq -r ... | while IFS=$'\t' read -r kind content`

## Data Sources

### External APIs
- **Agent Zero (A0):** 72.56.86.51:50002 (`/health`, `/api_log_get`)
- **Voice Server:** localhost:8888 (ElevenLabs TTS)
- **GitHub API:** via `gh` CLI (HTTPS + VPN proxy)

### Local Files
- **events.jsonl** — System event log (events-tail.sh, telemetry-dashboard.sh)
- **telos-state.json** — Pre-computed TELOS state (telos-radar.sh, telos-dashboard.sh)
- **a0-active-context.json** — Current A0 conversation context (a0-chat-tail.sh)
- **Claude Code transcripts** — Agent transcript files (agent-live.sh)
- **.config/PAI/.env** — Credentials & config (5 scripts)

## Network & Proxy Patterns

### Proxy Configuration (4 scripts)
```bash
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"  # A0 bypass (direct WAN)
```
- Used in: brigade-watch.sh, command-center.sh, infra-reference.sh, strategic-dashboard.sh
- Reason: GitHub/Jules/Gemini APIs blocked → proxy via NL VPS
- Exception: A0 is direct internet (no proxy needed)

### PATH Extension (7 scripts)
```bash
export PATH="$HOME/.bun/bin:$HOME/.npm-global/bin:$HOME/.opencode/bin:$PATH"
```
- Used in: 7/12 scripts
- Tools: bun, opencode CLI (muti-provider coder), npm binaries

## Architectural Patterns

### 1. **Refresh Loop Pattern**
- **Smart polling:** 300s mtime-check (files touched only on real changes)
  - Used in: telos-radar.sh, telos-dashboard.sh
- **Fixed interval:** 30s refresh
  - Used in: brigade-watch.sh, command-center.sh
- **Keyboard control:** r=refresh, q=quit
  - Used in: 8/12 scripts

### 2. **Error Handling**
- **Graceful degrades:** stderr → /dev/null, empty fallback
  - Pattern: `jq -r '.field // empty' 2>/dev/null`
- **Max-time guards:** `curl --max-time 3|5|8` to prevent hanging
- **Health checks:** `curl /health` before trying API calls

### 3. **Stream Processing (No Alternate Screen)**
- **stdout-based:** Events and logs output directly (not terminal alternate screen)
- **Reason:** Robust, allows Shift+PgUp/PgDn scrolling in Kitty
- **Used in:** a0-chat-tail.sh, events-tail.sh
- **Quote:** "No alternate screen — simple and robust"

### 4. **Configuration Loading**
```bash
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# (with shellcheck disable)
```
- Defensive: file existence check before sourcing
- Used in: 5/12 scripts (all dashboards that need API keys)

## Common Issues & Safeguards

### 1. **UTF-16 Surrogate Pairs (RatingCapture)**
- Not visible in these scripts (handled in hooks), but mentioned in MEMORY
- Future concern: if scripts parse RatingCapture logs

### 2. **wc -l vs printf Kibibyte Padding (Kitty TUI)**
- Memory note: `printf %-Ns` breaks on Cyrillic (counts bytes, not chars)
- Current scripts use simpler formatting (no critical padding)
- Future refactoring: use `wc -L` for max line width if needed

### 3. **Symlinks Not Auto-Updated**
- lib/*.sh files in ~/.config/kitty/ are NOT symlinked automatically
- Task #2 (in-progress): verify symlink freshness

## Summary

**Architecture:** 12 highly cohesive terminal dashboards + utilities
- **Heavy library dependency:** ui.sh is nervous system (11/12 scripts)
- **API-first design:** curl + jq for JSON, bun for CLI, gh for GitHub
- **Event-driven:** Real-time tail -f, smart polling, keyboard input
- **Defensive:** Timeouts, error fallbacks, proxy bypass for direct APIs
- **Russian-friendly:** ANSI color codes, UTF-8 support

**Tier Distribution:**
- T1 (Dashboards): 6 scripts (strategic, telemetry, telos-*, command-center)
- T2 (Monitors): 4 scripts (brigade-watch, a0-chat-tail, agent-live, events-tail)
- T3 (Reference): 1 script (infra-reference)
- T1 (Startup): 1 script (tab-colors)

**Largest Gaps:**
- No centralized logging (scripts dump to stdout, rely on terminal capture)
- No built-in backup for A0 health checks (would need retries to Container 1)
- lib/ directory not symlinked (manual maintenance required)
