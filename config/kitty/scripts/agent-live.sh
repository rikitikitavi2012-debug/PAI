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
      [.[] | select(.type == "tool_result") | .content[:2000]] | join(" ")
    else "" end) as $result |
  if ($text | length) > 0 then "USER\t" + ($text[:2000] | gsub("\n"; " "))
  elif ($result | length) > 0 then "RESULT\t" + ($result[:2000] | gsub("\n"; " "))
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
      "TEXT\t" + (.text[:2000] | gsub("\n"; " ↵ "))
    else empty end
  else empty end

else empty end
'

# ── Waiting indicator ──
printf '  %b⏳ Streaming live...%b\n\n' "$DIM" "$RST"

# ── Terminal width for wrapping ──
TERM_W=$(tput cols 2>/dev/null || echo 100)
CONTENT_W=$((TERM_W - 16))  # 2 indent + 8 timestamp + 2 icon + 4 spacing
[ "$CONTENT_W" -lt 40 ] && CONTENT_W=40

# Print with word wrap: icon line + continuation lines indented
print_wrapped() {
  local color="$1" icon="$2" ts="$3" text="$4"
  local prefix_w=15  # "  HH:MM:SS X " width
  local first=1
  while [ ${#text} -gt 0 ]; do
    if [ "$first" -eq 1 ]; then
      local chunk="${text:0:$CONTENT_W}"
      printf '  %b%s%b %b%s %s%b\n' "$DIM" "$ts" "$RST" "$color" "$icon" "$chunk" "$RST"
      text="${text:$CONTENT_W}"
      first=0
    else
      local chunk="${text:0:$CONTENT_W}"
      printf '  %b%*s%b %b  %s%b\n' "$DIM" 8 "" "$RST" "$color" "$chunk" "$RST"
      text="${text:$CONTENT_W}"
    fi
  done
}

# ── Stream with coloring ──
tail -n +1 -f "$TRANSCRIPT" | jq -r --unbuffered "$JQ_FILTER" 2>/dev/null | while IFS=$'\t' read -r kind content; do
  ts=$(date +%H:%M:%S)
  case "$kind" in
    USER)   print_wrapped "$GRN" "▶" "$ts" "$content" ;;
    RESULT) print_wrapped "$SLT" "◀" "$ts" "$content" ;;
    BASH)   print_wrapped "$ORG" "⚡" "$ts" "$content" ;;
    READ)   print_wrapped "$BLU" "📖" "$ts" "$content" ;;
    GREP)   print_wrapped "$VIO" "🔍" "$ts" "$content" ;;
    EDIT)   print_wrapped "$YLW" "✏️ " "$ts" "$content" ;;
    WRITE)  print_wrapped "$YLW" "📝" "$ts" "$content" ;;
    GLOB)   print_wrapped "$VIO" "🔎" "$ts" "$content" ;;
    SKILL)  print_wrapped "$CYN" "⚙️ " "$ts" "$content" ;;
    AGENT)  print_wrapped "$VIO" "🚀" "$ts" "$content" ;;
    TOOL)   print_wrapped "$DIM" "🔧" "$ts" "$content" ;;
    TEXT)   print_wrapped "$WHT" "│" "$ts" "$content" ;;
  esac
done
