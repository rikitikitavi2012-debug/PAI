#!/bin/bash
# A0 Chat Live — Agent Zero conversation viewer v3.0
# Chat bubbles, animated spinner, voice notifications
# Context ID read from state file (written by AgentZero.ts)

A0_HOST="72.56.86.51:50002"
A0_CONTEXT_FILE="$HOME/.claude/MEMORY/STATE/a0-active-context.json"
A0_ENV="$HOME/.config/PAI/.env"
A0_CLI="$HOME/.claude/PAI/Tools/AgentZero.ts"
VOICE_URL="http://localhost:8888/notify"

# A0 is direct WAN — bypass VPN proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"
export PATH="$HOME/.bun/bin:$PATH"
POLL_INTERVAL=3
LAST_NO=-1
NO_CTX_COUNT=0
VERBOSE=0
MSG_COUNT=0
RESP_COUNT=0

# ── Colors (24-bit RGB) ──
RST='\e[0m'
BLD='\e[1m'
DIM='\e[2m'
ITL='\e[3m'
CYN='\e[38;2;103;232;249m'
VIO='\e[38;2;167;139;250m'
GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'
YLW='\e[38;2;251;191;36m'
SEP='\e[38;2;71;85;105m'
WHT='\e[38;2;203;213;225m'
SLT='\e[38;2;148;163;184m'
BLU='\e[38;2;96;165;250m'
ORG='\e[38;2;251;146;60m'
# Backgrounds for bubbles
BG_IVAN='\e[48;2;22;40;28m'   # dark green tint
BG_A0='\e[48;2;20;30;45m'     # dark blue tint
BG_RST='\e[49m'

# ── Box drawing chars ──
TL='╭' TR='╮' BL='╰' BR='╯' HZ='─' VT='│'

# ── Spinner frames ──
SPIN_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
SPIN_IDX=0

# ── Load API token ──
A0_TOKEN=""
if [ -f "$A0_ENV" ]; then
  A0_TOKEN=$(grep '^A0_API_TOKEN=' "$A0_ENV" | cut -d= -f2-)
fi
if [ -z "$A0_TOKEN" ]; then
  printf "%b A0_API_TOKEN not found in %s%b\n" "${RED}" "$A0_ENV" "${RST}"
  exit 1
fi

# ── UI Library ──
. "$HOME/.config/kitty/scripts/lib/ui.sh"

# ── Alternate screen ──
alt_screen_enter
set_tab_title "A0 Chat"
trap 'alt_screen_exit' EXIT INT TERM

# ── Terminal dimensions ──
get_term_size() {
  TERM_LINES=$(tput lines 2>/dev/null || echo 40)
  TERM_COLS=$(tput cols 2>/dev/null || echo 90)
  CHAT_LINES=$((TERM_LINES - 5))
  BUBBLE_W=$((TERM_COLS - 6))
  [ "$BUBBLE_W" -gt 100 ] && BUBBLE_W=100
}

# ── Strip icon:// prefix ──
strip_icon() {
  local h="$1"
  h="${h#icon://* }"
  if [[ "$h" == icon://* ]]; then
    h="${h#icon://}"
    h="${h#* }"
  fi
  echo "$h"
}

# ── Strip A0/A1 prefix ──
strip_agent_prefix() {
  local t="$1"
  t="${t#A[0-9]: }"
  echo "$t"
}

# ── Format timestamp ──
to_local_time() {
  local ts="$1"
  if [ -z "$ts" ] || [ "$ts" = "null" ] || [ "$ts" = "0" ]; then
    echo "??:??"
    return
  fi
  if [[ "$ts" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    local ts_int="${ts%%.*}"
    date -d "@${ts_int}" '+%H:%M:%S' 2>/dev/null || echo "??:??"
  else
    date -d "$ts" '+%H:%M:%S' 2>/dev/null || echo "${ts:11:8}"
  fi
}

# ── Voice notify (fire-and-forget) ──
voice_notify() {
  local msg="$1"
  curl -s -X POST "$VOICE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"${msg:0:100}\", \"voice_id\": \"ogi2DyUAKJb7CEdqqvlU\", \"voice_enabled\": true}" \
    >/dev/null 2>&1 &
}

# ── Get context ──
get_context_id() {
  [ -f "$A0_CONTEXT_FILE" ] && jq -r '.context_id // empty' "$A0_CONTEXT_FILE" 2>/dev/null
}

# ── Message buffer ──
declare -a MSG_BUFFER=()

add_msg() {
  MSG_BUFFER+=("$1")
  if [ ${#MSG_BUFFER[@]} -gt 500 ]; then
    MSG_BUFFER=("${MSG_BUFFER[@]:100}")
  fi
}

# ── Draw a chat bubble ──
# Usage: draw_bubble "sender" "color" "bg" "timestamp" "line1" "line2" ...
draw_bubble() {
  local sender="$1" color="$2" bg="$3" ts="$4"
  shift 4
  local lines=("$@")
  local w=$BUBBLE_W
  local inner=$((w - 4))

  # Top border with sender name and timestamp
  local sender_len=${#sender}
  local ts_len=${#ts}
  local fill_len=$((w - sender_len - ts_len - 5))
  [ "$fill_len" -lt 1 ] && fill_len=1
  local fill
  fill=$(printf '%*s' "$fill_len" '' | tr ' ' "$HZ")

  add_msg "$(printf '  %b%s%b %b%b%s%b %b%s%b %b%s%b' \
    "$color" "$TL$HZ" "$RST" "$color" "$BLD" "$sender" "$RST" \
    "$color" "$fill" "$RST" "$DIM" "$ts" "$RST")"

  # Content lines
  for line in "${lines[@]}"; do
    local truncated="${line:0:$inner}"
    add_msg "$(printf '  %b%s%b %b%s%b' "$color" "$VT" "$RST" "$bg$WHT" "$truncated" "$BG_RST$RST")"
  done

  # Bottom border
  local bot_fill
  bot_fill=$(printf '%*s' "$((w - 1))" '' | tr ' ' "$HZ")
  add_msg "$(printf '  %b%s%s%b' "$color" "$BL" "$bot_fill" "$RST")"
}

# ── Draw header ──
draw_header() {
  local ctx="$1" status="$2"
  printf '\033[H\033[K'
  local mode_label="clean"
  [ "$VERBOSE" -eq 1 ] && mode_label="verbose"

  # Gradient-style header
  printf '  %b%b' "$CYN" "$BLD"
  printf '  A0 CHAT'
  printf '%b' "$RST"

  if [ -n "$ctx" ]; then
    printf '  %b%s%b' "$SLT" "${ctx:0:10}" "$RST"
    printf '  %b%s%b' "$DIM" "$mode_label" "$RST"
    printf '  %b%s%b' "$GRN" "$status" "$RST"
    # Stats
    if [ "$MSG_COUNT" -gt 0 ]; then
      printf '  %b%s msgs%b' "$DIM" "$MSG_COUNT" "$RST"
    fi
  else
    printf '  %bno context%b' "$SLT" "$RST"
  fi
  printf '\n\033[K'

  # Thin separator line
  local sep_line
  sep_line=$(printf '%*s' "$((TERM_COLS - 2))" '' | tr ' ' '─')
  printf '  %b%s%b\n\033[K' "$SEP" "$sep_line" "$RST"
}

# ── Draw status bar ──
draw_status_bar() {
  local progress="$1"
  # Progress line
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 1))"
  if [ -n "$progress" ]; then
    # Animated spinner
    local frame="${SPIN_FRAMES[$SPIN_IDX]}"
    SPIN_IDX=$(( (SPIN_IDX + 1) % ${#SPIN_FRAMES[@]} ))
    printf '  %b%s %s%b' "$YLW" "$frame" "${progress:0:$((TERM_COLS - 8))}" "$RST"
  fi
  # Key hints
  printf '\033[%d;1H\033[K' "$TERM_LINES"
  local v_label="verbose"
  [ "$VERBOSE" -eq 1 ] && v_label="clean"
  printf '  %bm%b=msg %bn%b=new %bv%b=%s %br%b=refresh %bh%b=health  %b%s%b' \
    "$GRN" "$SEP" "$CYN" "$SEP" "$CYN" "$SEP" "$v_label" \
    "$CYN" "$SEP" "$CYN" "$SEP" "$DIM" "$(date +%H:%M:%S)" "$RST"
}

# ── Redraw chat from buffer ──
redraw_chat() {
  local start_line=3
  local max_msgs=$CHAT_LINES
  local total=${#MSG_BUFFER[@]}
  local from=0
  [ "$total" -gt "$max_msgs" ] && from=$((total - max_msgs))

  for ((i=0; i<max_msgs; i++)); do
    local idx=$((from + i))
    printf '\033[%d;1H\033[K' "$((start_line + i))"
    if [ "$idx" -ge 0 ] && [ "$idx" -lt "$total" ]; then
      printf '%s' "${MSG_BUFFER[$idx]}"
    fi
  done
}

# ── Format and add a log item ──
format_item() {
  local no="$1" ts="$2" type="$3" heading="$4" content="$5"
  local local_ts
  local_ts=$(to_local_time "$ts")

  heading=$(strip_icon "$heading")
  heading=$(strip_agent_prefix "$heading")

  local max_text=$((BUBBLE_W - 6))
  [ "$max_text" -lt 20 ] && max_text=20

  case "$type" in
    user)
      MSG_COUNT=$((MSG_COUNT + 1))
      # Ivan bubble — green
      local msg="${content:0:$((max_text * 2))}"
      [ -z "$msg" ] && msg="${heading:0:$max_text}"
      # Split into lines
      local -a lines=()
      while [ ${#msg} -gt 0 ]; do
        if [ ${#msg} -le "$max_text" ]; then
          lines+=("$msg")
          break
        fi
        local chunk="${msg:0:$max_text}"
        local last_sp="${chunk% *}"
        if [ "$last_sp" != "$chunk" ] && [ ${#last_sp} -gt $((max_text / 2)) ]; then
          lines+=("$last_sp")
          msg="${msg:${#last_sp}}"
          msg="${msg# }"
        else
          lines+=("$chunk")
          msg="${msg:$max_text}"
        fi
      done
      draw_bubble "Ivan" "$GRN" "$BG_IVAN" "$local_ts" "${lines[@]}"
      ;;

    response)
      RESP_COUNT=$((RESP_COUNT + 1))
      # A0 response bubble — cyan
      local resp="${content:0:$((max_text * 4))}"
      [ -z "$resp" ] && resp="${heading:0:$max_text}"
      resp="${resp//\\n/$'\n'}"
      # Split into lines (max 5 for preview)
      local -a lines=()
      local line_count=0
      while IFS= read -r line || [ -n "$line" ]; do
        [ "$line_count" -ge 5 ] && lines+=("...") && break
        lines+=("${line:0:$max_text}")
        line_count=$((line_count + 1))
      done <<< "$resp"
      draw_bubble "A0" "$CYN" "$BG_A0" "$local_ts" "${lines[@]}"
      # Voice notification for new responses
      local first_line="${lines[0]:-response}"
      voice_notify "A0: ${first_line:0:60}"
      ;;

    agent)
      if [ "$VERBOSE" -eq 0 ]; then
        case "$heading" in
          ""|-|*Reasoning*|*Calling*LLM*|*Calling*subordinate*|*thoughts*|*json*) return ;;
        esac
        local thought="${heading:0:$((TERM_COLS - 8))}"
        add_msg "$(printf '  %b%s %s%b' "$DIM" "$local_ts" "$thought" "$RST")"
      else
        local thought="${heading:0:$((TERM_COLS - 8))}"
        add_msg "$(printf '  %b%s%b %b%s%b' "$SLT" "$local_ts" "$RST" "$BLU" "$thought" "$RST")"
      fi
      ;;

    code_exe)
      if [ "$VERBOSE" -eq 1 ]; then
        local detail="${heading:0:$((TERM_COLS - 8))}"
        add_msg "$(printf '  %b%s%b %b> %s%b' "$SLT" "$local_ts" "$RST" "$ORG" "$detail" "$RST")"
      fi
      ;;

    tool)
      if [ "$VERBOSE" -eq 1 ]; then
        local tool_info="${heading:0:$((TERM_COLS - 8))}"
        add_msg "$(printf '  %b%s%b %b%s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$tool_info" "$RST")"
      fi
      ;;

    util)
      if [ "$VERBOSE" -eq 1 ]; then
        local util_info="${heading:0:$((TERM_COLS - 8))}"
        add_msg "$(printf '  %b%s%b %b%s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$util_info" "$RST")"
      fi
      ;;

    *)
      if [ "$VERBOSE" -eq 1 ]; then
        local other="${heading:-$content}"
        other="${other:0:$((TERM_COLS - 8))}"
        add_msg "$(printf '  %b%s%b %b[%s] %s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$type" "$other" "$RST")"
      fi
      ;;
  esac
}

# ── Fetch and process chat log ──
CURRENT_PROGRESS=""

fetch_chat() {
  local ctx_id="$1"
  local log_json

  log_json=$(curl -s --max-time 8 \
    -H "X-API-KEY: $A0_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"context_id\": \"$ctx_id\", \"length\": 50}" \
    "http://${A0_HOST}/api_log_get" 2>/dev/null)

  [ -z "$log_json" ] && return 1

  local api_err
  api_err=$(echo "$log_json" | jq -r '.error // empty' 2>/dev/null)
  [ -n "$api_err" ] && return 1

  # Progress
  local progress progress_active
  progress=$(echo "$log_json" | jq -r '.log.progress // ""' 2>/dev/null)
  progress_active=$(echo "$log_json" | jq -r '.log.progress_active // false' 2>/dev/null)

  if [ "$progress_active" = "true" ] && [ -n "$progress" ]; then
    progress=$(strip_icon "$progress")
    progress=$(strip_agent_prefix "$progress")
    CURRENT_PROGRESS="$progress"
  else
    CURRENT_PROGRESS=""
  fi

  # Parse new items
  local new_items
  new_items=$(echo "$log_json" | jq -r --argjson last "$LAST_NO" '
    [.log.items[] | select(.no > $last)] |
    sort_by(.no) | .[] |
    [
      (.no | tostring),
      (.timestamp // 0 | tostring),
      (.type // "?"),
      ((.heading // "") | gsub("\n"; " ") | .[:200]),
      ((.content // "" | tostring) | gsub("\n"; "\\n") | .[:500])
    ] | join("\t")
  ' 2>/dev/null)

  local had_new=0
  if [ -n "$new_items" ]; then
    while IFS=$'\t' read -r no ts type heading content; do
      [ -z "$no" ] && continue
      format_item "$no" "$ts" "$type" "$heading" "$content"
      had_new=1
    done <<< "$new_items"
  fi

  # Update LAST_NO
  local max_no
  max_no=$(echo "$log_json" | jq '[.log.items[].no] | max' 2>/dev/null || echo "$LAST_NO")
  if [ "$max_no" -gt "$LAST_NO" ] 2>/dev/null; then
    LAST_NO=$max_no
  fi

  [ "$had_new" -eq 1 ] && return 0
  return 2
}

# ── Show idle panel ──
show_idle() {
  MSG_BUFFER=()
  add_msg ""
  add_msg "$(printf '  %b%b  A0 CHAT%b' "$CYN" "$BLD" "$RST")"
  add_msg "$(printf '  %bNo active dialog%b' "$SLT" "$RST")"
  add_msg ""
  local -a help_lines=(
    "m  send message (current chat)"
    "n  new chat (new dialog)"
    "v  clean/verbose toggle"
    "r  refresh screen"
    "h  A0 health check"
    "c  switch context (enter ID)"
  )
  for hl in "${help_lines[@]}"; do
    local key="${hl:0:1}"
    local desc="${hl:3}"
    add_msg "$(printf '  %b%s%b  %b%s%b' "$CYN" "$key" "$RST" "$SLT" "$desc" "$RST")"
  done
  add_msg ""
  add_msg "$(printf '  %bCLI: bun AgentZero.ts message \"text\"%b' "$DIM" "$RST")"
  redraw_chat
}

# ── Send message ──
do_send_message() {
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  printf "  %b%bMessage:%b " "${GRN}" "${BLD}" "${RST}"
  read -r msg
  if [ -n "$msg" ]; then
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
    printf "  %bSending...%b" "${DIM}" "${RST}"
    local ctx_flag=""
    [ -n "$CTX_ID" ] && ctx_flag="--context $CTX_ID"
    local result
    result=$(bun "$A0_CLI" message "$msg" $ctx_flag 2>&1)
    local resp_text resp_ctx
    resp_text=$(echo "$result" | jq -r '.response // empty' 2>/dev/null)
    resp_ctx=$(echo "$result" | jq -r '.context_id // empty' 2>/dev/null)
    if [ -n "$resp_ctx" ]; then
      CTX_ID="$resp_ctx"
      LAST_CTX=""
      LAST_NO=-1
      printf '{"context_id":"%s","updated":"%s","last_message":"%s"}' \
        "$resp_ctx" "$(date -Iseconds)" "${msg:0:60}" > "$A0_CONTEXT_FILE"
    fi
    if [ -n "$resp_text" ]; then
      # Show as bubbles
      draw_bubble "Ivan" "$GRN" "$BG_IVAN" "$(date +%H:%M:%S)" "${msg:0:$BUBBLE_W}"
      draw_bubble "A0" "$CYN" "$BG_A0" "$(date +%H:%M:%S)" "${resp_text:0:$((BUBBLE_W * 3))}"
      voice_notify "A0: ${resp_text:0:60}"
      redraw_chat
    fi
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  else
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  fi
}

# ── New chat ──
do_new_chat() {
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  printf "  %b%bNew chat:%b " "${CYN}" "${BLD}" "${RST}"
  read -r msg
  if [ -n "$msg" ]; then
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
    printf "  %bCreating new chat...%b" "${DIM}" "${RST}"
    local result
    result=$(bun "$A0_CLI" message "$msg" 2>&1)
    local resp_text resp_ctx
    resp_text=$(echo "$result" | jq -r '.response // empty' 2>/dev/null)
    resp_ctx=$(echo "$result" | jq -r '.context_id // empty' 2>/dev/null)
    if [ -n "$resp_ctx" ]; then
      CTX_ID="$resp_ctx"
      LAST_CTX=""
      LAST_NO=-1
      MSG_BUFFER=()
      MSG_COUNT=0
      RESP_COUNT=0
      printf '{"context_id":"%s","updated":"%s","last_message":"%s"}' \
        "$resp_ctx" "$(date -Iseconds)" "${msg:0:60}" > "$A0_CONTEXT_FILE"
      add_msg ""
      add_msg "$(printf '  %b%b  NEW CHAT  %s%b' "$CYN" "$BLD" "${resp_ctx:0:12}" "$RST")"
      add_msg ""
      draw_bubble "Ivan" "$GRN" "$BG_IVAN" "$(date +%H:%M:%S)" "${msg:0:$BUBBLE_W}"
      if [ -n "$resp_text" ]; then
        draw_bubble "A0" "$CYN" "$BG_A0" "$(date +%H:%M:%S)" "${resp_text:0:$((BUBBLE_W * 3))}"
        voice_notify "A0: ${resp_text:0:60}"
      fi
      redraw_chat
    fi
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  else
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  fi
}

# ── Health check ──
do_health() {
  local h_json lat_start lat_end lat_ms
  lat_start=$(date +%s%N)
  h_json=$(curl -s --max-time 5 "http://${A0_HOST}/health" 2>/dev/null)
  lat_end=$(date +%s%N)
  lat_ms=$(( (lat_end - lat_start) / 1000000 ))
  if [ -n "$h_json" ]; then
    add_msg "$(printf '  %b%b  A0 ONLINE%b  %b%sms%b' "$GRN" "$BLD" "$RST" "$DIM" "$lat_ms" "$RST")"
  else
    add_msg "$(printf '  %b%b  A0 UNREACHABLE%b' "$RED" "$BLD" "$RST")"
  fi
  redraw_chat
}

# ── Show log ──
do_log() {
  add_msg "$(printf '  %b--- recent log ---%b' "$DIM" "$RST")"
  local log_out
  log_out=$(bun "$A0_CLI" log 2>&1 | head -10)
  while IFS= read -r line; do
    add_msg "$(printf '  %b%s%b' "$DIM" "${line:0:$((TERM_COLS - 6))}" "$RST")"
  done <<< "$log_out"
  redraw_chat
}

# ── Enter context ──
do_context() {
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  printf "  %bContext ID (Enter=cancel):%b " "${CYN}" "${RST}"
  read -r new_ctx
  if [ -n "$new_ctx" ]; then
    CTX_ID="$new_ctx"
    LAST_CTX=""
    LAST_NO=-1
    MSG_BUFFER=()
    MSG_COUNT=0
    RESP_COUNT=0
    printf '{"context_id":"%s","updated":"%s","last_message":"manual switch"}' \
      "$new_ctx" "$(date -Iseconds)" > "$A0_CONTEXT_FILE"
    add_msg "$(printf '  %b%b  Context: %s%b' "$GRN" "$BLD" "$new_ctx" "$RST")"
  fi
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
}

# ── Main ──
get_term_size
printf '\033[2J'
draw_header "" ""
draw_status_bar ""

LAST_CTX=""
IDLE_SHOWN=0

while true; do
  get_term_size
  CTX_ID=$(get_context_id)

  if [ -n "$CTX_ID" ]; then
    NO_CTX_COUNT=0

    if [ "$CTX_ID" != "$LAST_CTX" ]; then
      MSG_BUFFER=()
      MSG_COUNT=0
      RESP_COUNT=0
      LAST_NO=-1
      LAST_CTX="$CTX_ID"
      IDLE_SHOWN=0
      draw_header "$CTX_ID" "connecting..."

      fetch_chat "$CTX_ID"
      redraw_chat
      draw_header "$CTX_ID" "live"
      draw_status_bar "$CURRENT_PROGRESS"
    else
      fetch_chat "$CTX_ID"
      rc=$?
      if [ "$rc" -eq 0 ]; then
        redraw_chat
      fi
      draw_header "$CTX_ID" "live"
      draw_status_bar "$CURRENT_PROGRESS"
    fi
  else
    if [ "$IDLE_SHOWN" -eq 0 ]; then
      draw_header "" ""
      show_idle
      draw_status_bar ""
      IDLE_SHOWN=1
    fi
    NO_CTX_COUNT=$((NO_CTX_COUNT + 1))
  fi

  printf '\033[%d;1H' "$((TERM_LINES - 2))"

  read -r -t "$POLL_INTERVAL" -n 1 key 2>/dev/null
  case "$key" in
    q|Q) break ;;
    r|R)
      LAST_NO=-1
      LAST_CTX=""
      MSG_BUFFER=()
      MSG_COUNT=0
      RESP_COUNT=0
      IDLE_SHOWN=0
      printf '\033[2J'
      draw_header "$CTX_ID" "refreshing..."
      ;;
    m|M) do_send_message ;;
    n|N) do_new_chat ;;
    v|V)
      VERBOSE=$(( 1 - VERBOSE ))
      LAST_NO=-1
      MSG_BUFFER=()
      printf '\033[2J'
      draw_header "$CTX_ID" "reloading..."
      ;;
    h|H) do_health ;;
    l|L) do_log ;;
    c|C) do_context ;;
    t|T)
      add_msg "$(printf '  %b--- scheduled tasks ---%b' "$DIM" "$RST")"
      add_msg "$(printf '  %bDaily PAI Health%b     %bdaily%b' "$WHT" "$RST" "$DIM" "$RST")"
      add_msg "$(printf '  %bWeekly Security%b      %bSun%b' "$WHT" "$RST" "$DIM" "$RST")"
      add_msg "$(printf '  %bWeekly TELOS%b         %bMon%b' "$WHT" "$RST" "$DIM" "$RST")"
      add_msg "$(printf '  %bWeekly Learning%b      %bMon%b' "$WHT" "$RST" "$DIM" "$RST")"
      add_msg "$(printf '  %bMonthly Memory%b       %b1st%b' "$WHT" "$RST" "$DIM" "$RST")"
      redraw_chat
      draw_status_bar ""
      ;;
  esac
done
