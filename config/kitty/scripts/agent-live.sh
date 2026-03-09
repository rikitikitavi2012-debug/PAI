#!/bin/bash
# Agent Live — Claude Code agent transcript viewer for Kitty tabs
# Usage: agent-live.sh <agent_id> [agent_type] [description]
# Streams agent actions in real-time: tool calls, text, results

AGENT_ID="${1:?Usage: agent-live.sh <agent_id> [type] [description]}"
AGENT_TYPE="${2:-agent}"
AGENT_DESC="${3:-}"

# ── UI Library ──
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

# ── Find transcript file (retry up to 5s for race condition) ──
TRANSCRIPT=""
for i in $(seq 1 25); do
  TRANSCRIPT=$(find "$HOME/.claude/projects" -name "agent-${AGENT_ID}.jsonl" -type f 2>/dev/null | head -1)
  [ -n "$TRANSCRIPT" ] && break
  sleep 0.2
done

if [ -z "$TRANSCRIPT" ]; then
  printf '%b✗ Transcript not found for agent %s%b\n' "$RED" "$AGENT_ID" "$RST"
  printf '%bSearched: ~/.claude/projects/*/subagents/agent-%s.jsonl%b\n' "$DIM" "$AGENT_ID" "$RST"
  printf '%bWaiting 30s for file to appear...%b\n' "$DIM" "$RST"
  for i in $(seq 1 150); do
    TRANSCRIPT=$(find "$HOME/.claude/projects" -name "agent-${AGENT_ID}.jsonl" -type f 2>/dev/null | head -1)
    [ -n "$TRANSCRIPT" ] && break
    sleep 0.2
  done
  [ -z "$TRANSCRIPT" ] && { printf '%b✗ Gave up. Agent may have finished too quickly.%b\n' "$RED" "$RST"; sleep 5; exit 1; }
fi

# ── Header ──
printf '\n'
printf '  %b%b🚀 %s%b  %b%s%b\n' "$VIO" "$BLD" "$AGENT_TYPE" "$RST" "$WHT" "${AGENT_DESC:0:70}" "$RST"
printf '  %b%s%b\n' "$DIM" "$(printf '─%.0s' $(seq 1 80))" "$RST"
printf '  %bid: %s%b  %bfile: %s%b\n\n' "$DIM" "${AGENT_ID:0:16}" "$RST" "$DIM" "$(basename "$TRANSCRIPT")" "$RST"

# ── JQ filter: extract actions from transcript ──
JQ_FILTER='
select(.type == "user" or .type == "assistant") |

if .type == "user" then
  ((.message.content // "") |
    if type == "array" then
      [.[] | select(.type == "text") | .text] | join(" ")
    elif type == "string" then .
    else "" end) as $text |
  ((.message.content // []) |
    if type == "array" then
      [.[] | select(.type == "tool_result") | .content[:100]] | join(" ")
    else "" end) as $result |
  if ($text | length) > 0 then "USER\t" + ($text[:200] | gsub("\n"; " "))
  elif ($result | length) > 0 then "RESULT\t" + ($result[:200] | gsub("\n"; " "))
  else empty end

elif .type == "assistant" then
  .message.content[]? |
  if .type == "tool_use" then
    if .name == "Bash" then
      "BASH\t" + (.input.description // (.input.command[:80] | gsub("\n"; " ")))
    elif .name == "Read" then
      "READ\t" + .input.file_path
    elif .name == "Grep" then
      "GREP\t" + .input.pattern + " in " + (.input.path // ".")
    elif .name == "Edit" then
      "EDIT\t" + .input.file_path
    elif .name == "Write" then
      "WRITE\t" + .input.file_path
    elif .name == "Glob" then
      "GLOB\t" + .input.pattern
    elif .name == "Skill" then
      "SKILL\t" + .input.skill
    elif .name == "Agent" then
      "AGENT\t" + (.input.description // "subagent")
    else
      "TOOL\t" + .name + " " + ((.input | keys[:2] | join(",")) // "")
    end
  elif .type == "text" then
    if (.text | length) > 0 then
      "TEXT\t" + (.text[:300] | gsub("\n"; " ↵ "))
    else empty end
  else empty end

else empty end
'

# ── Waiting indicator ──
printf '  %b⏳ Streaming live...%b\n\n' "$DIM" "$RST"

# ── Stream with coloring ──
tail -n +1 -f "$TRANSCRIPT" | jq -r --unbuffered "$JQ_FILTER" 2>/dev/null | while IFS=$'\t' read -r kind content; do
  ts=$(date +%H:%M:%S)
  case "$kind" in
    USER)   printf '  %b%s%b %b▶ %s%b\n' "$DIM" "$ts" "$RST" "$GRN" "${content:0:85}" "$RST" ;;
    RESULT) printf '  %b%s%b %b◀ %s%b\n' "$DIM" "$ts" "$RST" "$SLT" "${content:0:85}" "$RST" ;;
    BASH)   printf '  %b%s%b %b⚡ %s%b\n' "$DIM" "$ts" "$RST" "$ORG" "${content:0:85}" "$RST" ;;
    READ)   printf '  %b%s%b %b📖 %s%b\n' "$DIM" "$ts" "$RST" "$BLU" "${content:0:85}" "$RST" ;;
    GREP)   printf '  %b%s%b %b🔍 %s%b\n' "$DIM" "$ts" "$RST" "$VIO" "${content:0:85}" "$RST" ;;
    EDIT)   printf '  %b%s%b %b✏️  %s%b\n' "$DIM" "$ts" "$RST" "$YLW" "${content:0:85}" "$RST" ;;
    WRITE)  printf '  %b%s%b %b📝 %s%b\n' "$DIM" "$ts" "$RST" "$YLW" "${content:0:85}" "$RST" ;;
    GLOB)   printf '  %b%s%b %b🔎 %s%b\n' "$DIM" "$ts" "$RST" "$VIO" "${content:0:85}" "$RST" ;;
    SKILL)  printf '  %b%s%b %b⚙️  %s%b\n' "$DIM" "$ts" "$RST" "$CYN" "${content:0:85}" "$RST" ;;
    AGENT)  printf '  %b%s%b %b🚀 %s%b\n' "$DIM" "$ts" "$RST" "$VIO" "${content:0:85}" "$RST" ;;
    TOOL)   printf '  %b%s%b %b🔧 %s%b\n' "$DIM" "$ts" "$RST" "$DIM" "${content:0:85}" "$RST" ;;
    TEXT)   printf '  %b%s%b %b│ %s%b\n'   "$DIM" "$ts" "$RST" "$WHT" "${content:0:85}" "$RST" ;;
  esac
done
