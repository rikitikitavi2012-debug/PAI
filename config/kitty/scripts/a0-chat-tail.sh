#!/bin/bash
# A0 Chat Live — Agent Zero conversation viewer v2.0
# Polls /api_log_get for active context, shows messages in clean chat format
# Context ID read from state file (written by AgentZero.ts)
# v2.0: Clean formatting, content-based responses, noise filtering

A0_HOST="72.56.86.51:50002"
A0_CONTEXT_FILE="$HOME/.claude/MEMORY/STATE/a0-active-context.json"
A0_ENV="$HOME/.config/PAI/.env"
A0_CLI="$HOME/.claude/PAI/Tools/AgentZero.ts"

# A0 is direct WAN — bypass VPN proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"
export PATH="$HOME/.bun/bin:$PATH"
POLL_INTERVAL=3
LAST_NO=-1
NO_CTX_COUNT=0
VERBOSE=0  # 0=clean chat, 1=show all events

# ── Colors ──
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
  # Chat area: total - header(3) - status(2) - padding(2)
  CHAT_LINES=$((TERM_LINES - 7))
}

# ── Strip icon:// prefix from heading ──
strip_icon() {
  local h="$1"
  # Remove icon://word prefix (e.g. "icon://chat ", "icon://terminal ", "icon://construction ")
  h="${h#icon://* }"
  # Also handle "icon://word text" pattern
  if [[ "$h" == icon://* ]]; then
    h="${h#icon://}"
    h="${h#* }"
  fi
  echo "$h"
}

# ── Strip A0/A1 agent prefix from text ──
strip_agent_prefix() {
  local t="$1"
  # Remove leading "A0: " or "A1: " to avoid "A0: A0: ..."
  t="${t#A[0-9]: }"
  echo "$t"
}

# ── Word wrap text to terminal width ──
wrap_text() {
  local text="$1" max_width="$2" prefix="$3"
  local prefix_len=${#prefix}
  local content_width=$((max_width - prefix_len - 4))
  [ "$content_width" -lt 20 ] && content_width=20

  local first=1
  while [ ${#text} -gt 0 ]; do
    if [ ${#text} -le "$content_width" ]; then
      if [ "$first" -eq 1 ]; then
        echo "$text"
      else
        printf "%*s%s\n" "$((prefix_len + 2))" "" "$text"
      fi
      break
    fi
    local chunk="${text:0:$content_width}"
    # Break at last space
    local break_at=$content_width
    local last_space="${chunk% *}"
    if [ "$last_space" != "$chunk" ]; then
      break_at=${#last_space}
    fi
    chunk="${text:0:$break_at}"
    text="${text:$break_at}"
    text="${text# }"  # strip leading space after break
    if [ "$first" -eq 1 ]; then
      echo "$chunk"
      first=0
    else
      printf "%*s%s\n" "$((prefix_len + 2))" "" "$chunk"
    fi
  done
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

# ── Get context ──
get_context_id() {
  [ -f "$A0_CONTEXT_FILE" ] && jq -r '.context_id // empty' "$A0_CONTEXT_FILE" 2>/dev/null
}

# ── Draw header ──
draw_header() {
  local ctx="$1" status="$2"
  printf '\033[H\033[K'  # cursor home, clear line
  local mode_label="clean"
  [ "$VERBOSE" -eq 1 ] && mode_label="verbose"
  if [ -n "$ctx" ]; then
    printf "  %b%bA0 CHAT%b  %b%s%b  %b%s%b  %b%s%b\n" \
      "$CYN" "$BLD" "$RST" "$SLT" "${ctx:0:12}" "$RST" "$DIM" "$mode_label" "$RST" "$DIM" "${status:-polling}" "$RST"
  else
    printf "  %b%bA0 CHAT%b  %bno context%b  %b%s%b\n" \
      "$CYN" "$BLD" "$RST" "$SLT" "$RST" "$DIM" "$mode_label" "$RST"
  fi
  printf '\033[K'
  printf "  %b%s%b\n" "$SEP" "$(printf '%*s' "$((TERM_COLS - 4))" '' | tr ' ' '-')" "$RST"
  printf '\033[K'
}

# ── Draw status bar (pinned to bottom) ──
draw_status_bar() {
  local progress="$1"
  # Move to bottom-1
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 1))"
  if [ -n "$progress" ]; then
    printf "  %b%s%b" "$YLW" "${progress:0:$((TERM_COLS - 6))}" "$RST"
  fi
  # Bottom line
  printf '\033[%d;1H\033[K' "$TERM_LINES"
  printf "  %b r=%bobnovit%b  m=%bsoobshchenie%b  v=%b%s%b  c=%bcontext%b  q=%bvyhod%b" \
    "$SEP" "$SLT" "$SEP" "$SLT" "$SEP" "$SLT" "$([ "$VERBOSE" -eq 1 ] && echo 'clean' || echo 'verbose')" "$SEP" "$SLT" "$SEP" "$SLT" "$SEP"
}

# ── Draw status bar (Russian with safe chars) ──
draw_status_bar() {
  local progress="$1"
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 1))"
  if [ -n "$progress" ]; then
    printf "  %b>>> %s%b" "$YLW" "${progress:0:$((TERM_COLS - 8))}" "$RST"
  fi
  printf '\033[%d;1H\033[K' "$TERM_LINES"
  local v_label="verbose"
  [ "$VERBOSE" -eq 1 ] && v_label="clean"
  printf "  %br%b=refresh %bm%b=msg %bv%b=%s %bc%b=ctx %bh%b=health %bq%b=exit  %b%s%b" \
    "$CYN" "$SEP" "$CYN" "$SEP" "$CYN" "$SEP" "$v_label" \
    "$CYN" "$SEP" "$CYN" "$SEP" "$CYN" "$SEP" "$DIM" "$(date +%H:%M:%S)" "$RST"
}

# ── Message buffer for scrolling ──
declare -a MSG_BUFFER=()

# ── Add message to buffer and display ──
add_msg() {
  local line="$1"
  MSG_BUFFER+=("$line")
  # Keep buffer size manageable
  if [ ${#MSG_BUFFER[@]} -gt 500 ]; then
    MSG_BUFFER=("${MSG_BUFFER[@]:100}")
  fi
}

# ── Redraw chat area from buffer ──
redraw_chat() {
  local start_line=3  # after header
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

# ── Format and add a single log item ──
format_item() {
  local no="$1" ts="$2" type="$3" heading="$4" content="$5"
  local local_ts
  local_ts=$(to_local_time "$ts")

  # Clean heading
  heading=$(strip_icon "$heading")
  heading=$(strip_agent_prefix "$heading")

  local max_content=$((TERM_COLS - 22))
  [ "$max_content" -lt 30 ] && max_content=30

  case "$type" in
    user)
      # Ivan's message — always show, prominent
      local msg="${content:0:$max_content}"
      [ -z "$msg" ] && msg="${heading:0:$max_content}"
      [ ${#content} -gt "$max_content" ] && msg="${msg}..."
      add_msg ""
      add_msg "$(printf '  %b%s%b  %b%bIvan >>%b %b%b%s%b' "$SLT" "$local_ts" "$RST" "$GRN" "$BLD" "$RST" "$WHT" "$BLD" "$msg" "$RST")"
      ;;

    response)
      # A0's actual response — SHOW CONTENT, not heading
      # This is the final answer from A0
      local resp="${content:0:$((max_content * 3))}"
      [ -z "$resp" ] && resp="${heading:0:$max_content}"
      # Split into lines for multi-line display
      local first_line second_line third_line
      # Replace literal \n with newline for splitting
      resp="${resp//\\n/$'\n'}"
      first_line="${resp%%$'\n'*}"
      first_line="${first_line:0:$max_content}"
      local rest="${resp#*$'\n'}"
      if [ "$rest" != "$resp" ] && [ -n "$rest" ]; then
        second_line="${rest%%$'\n'*}"
        second_line="${second_line:0:$max_content}"
        rest="${rest#*$'\n'}"
        if [ "$rest" != "$second_line" ] && [ -n "$rest" ]; then
          third_line="${rest%%$'\n'*}"
          third_line="${third_line:0:$max_content}"
        fi
      fi
      # Response block — visually distinct
      add_msg ""
      add_msg "$(printf '  %b%s%b  %b%bA0 >>%b' "$SLT" "$local_ts" "$RST" "$CYN" "$BLD" "$RST")"
      [ -n "$first_line" ] && add_msg "$(printf '           %b%s%b' "$WHT" "$first_line" "$RST")"
      [ -n "$second_line" ] && add_msg "$(printf '           %b%s%b' "$SLT" "$second_line" "$RST")"
      [ -n "$third_line" ] && add_msg "$(printf '           %b%s...%b' "$DIM" "$third_line" "$RST")"
      ;;

    agent)
      # A0 thinking — show only meaningful thought titles
      if [ "$VERBOSE" -eq 0 ]; then
        # Clean mode: skip noise, show only meaningful summaries
        case "$heading" in
          ""|-|*Reasoning*|*Calling*LLM*|*Calling*subordinate*|*thoughts*|*json*) return ;;
        esac
        local thought="${heading:0:$max_content}"
        add_msg "$(printf '  %b%s%b  %b%s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$thought" "$RST")"
      else
        local thought="${heading:0:$max_content}"
        add_msg "$(printf '  %b%s%b  %b%s%b' "$SLT" "$local_ts" "$RST" "$BLU" "$thought" "$RST")"
      fi
      ;;

    code_exe)
      # Code execution — hide in clean mode (internal A0 tool calls)
      if [ "$VERBOSE" -eq 1 ]; then
        local detail="${heading:0:$max_content}"
        add_msg "$(printf '  %b%s%b  %b> %s%b' "$SLT" "$local_ts" "$RST" "$ORG" "$detail" "$RST")"
      fi
      ;;

    tool)
      # Tool usage — show in verbose only
      if [ "$VERBOSE" -eq 1 ]; then
        local tool_info="${heading:0:$max_content}"
        add_msg "$(printf '  %b%s%b  %b%s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$tool_info" "$RST")"
      fi
      ;;

    util)
      # Internal events — show condensed in verbose, hide in clean
      if [ "$VERBOSE" -eq 1 ]; then
        local util_info="${heading:0:$max_content}"
        add_msg "$(printf '  %b%s%b  %b%s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$util_info" "$RST")"
      fi
      ;;

    *)
      if [ "$VERBOSE" -eq 1 ]; then
        local other="${heading:-$content}"
        other="${other:0:$max_content}"
        add_msg "$(printf '  %b%s%b  %b[%s] %s%b' "$SLT" "$local_ts" "$RST" "$DIM" "$type" "$other" "$RST")"
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

  if [ -z "$log_json" ]; then
    return 1
  fi

  local api_err
  api_err=$(echo "$log_json" | jq -r '.error // empty' 2>/dev/null)
  if [ -n "$api_err" ]; then
    return 1
  fi

  # Progress indicator
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

  # Parse new items only (no > LAST_NO)
  local new_items
  new_items=$(echo "$log_json" | jq -r --argjson last "$LAST_NO" '
    [.log.items[] | select(.no > $last)] |
    sort_by(.no) | .[] |
    [
      (.no | tostring),
      (.timestamp // 0 | tostring),
      (.type // "?"),
      ((.heading // "") | gsub("\n"; " ") | .[:200]),
      ((.content // "" | tostring) | gsub("\n"; " ") | .[:300])
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
  return 2  # no new messages
}

# ── Show idle panel ──
show_idle() {
  MSG_BUFFER=()
  add_msg ""
  add_msg "$(printf '  %b%bA0 CHAT%b  %bno active context%b' "$CYN" "$BLD" "$RST" "$SLT" "$RST")"
  add_msg ""
  add_msg "$(printf '  %bm%b  send message (new context)' "$CYN" "$RST")"
  add_msg "$(printf '  %bc%b  enter context ID' "$CYN" "$RST")"
  add_msg "$(printf '  %bh%b  A0 health check' "$CYN" "$RST")"
  add_msg "$(printf '  %bl%b  show recent log' "$CYN" "$RST")"
  add_msg ""
  add_msg "$(printf '  %bCLI:%b' "$WHT" "$RST")"
  add_msg "$(printf '  %bbun AgentZero.ts message \"text\"%b' "$DIM" "$RST")"
  add_msg "$(printf '  %bbun AgentZero.ts async \"long task\"%b' "$DIM" "$RST")"
  redraw_chat
}

# ── Send message interactively ──
do_send_message() {
  # Move cursor to input area
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  printf "  %bMessage:%b " "${CYN}" "${RST}"
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
      # Save to context file
      printf '{"context_id":"%s","updated":"%s","last_message":"%s"}' \
        "$resp_ctx" "$(date -Iseconds)" "${msg:0:60}" > "$A0_CONTEXT_FILE"
    fi
    if [ -n "$resp_text" ]; then
      add_msg "$(printf '  %b%s%b  %b%bIvan:%b %b%s%b' "$SLT" "$(date +%H:%M:%S)" "$RST" "$GRN" "$BLD" "$RST" "$WHT" "${msg:0:$((TERM_COLS - 22))}" "$RST")"
      add_msg "$(printf '  %b%s%b  %b%bA0:%b %b%s%b' "$SLT" "$(date +%H:%M:%S)" "$RST" "$CYN" "$BLD" "$RST" "$WHT" "${resp_text:0:$((TERM_COLS - 22))}" "$RST")"
      redraw_chat
    fi
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  else
    printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
  fi
}

# ── Health check ──
do_health() {
  add_msg "$(printf '  %b--- health check ---%b' "$DIM" "$RST")"
  local h_json
  h_json=$(curl -s --max-time 5 "http://${A0_HOST}/health" 2>/dev/null)
  if [ -n "$h_json" ]; then
    add_msg "$(printf '  %bA0 online%b' "$GRN" "$RST")"
  else
    add_msg "$(printf '  %bA0 unreachable%b' "$RED" "$RST")"
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
  printf "  %bContext ID:%b " "${CYN}" "${RST}"
  read -r new_ctx
  if [ -n "$new_ctx" ]; then
    CTX_ID="$new_ctx"
    LAST_CTX=""
    LAST_NO=-1
    MSG_BUFFER=()
    add_msg "$(printf '  %bContext: %s%b' "$GRN" "$new_ctx" "$RST")"
  fi
  printf '\033[%d;1H\033[K' "$((TERM_LINES - 2))"
}

# ── Main ──
get_term_size
printf '\033[2J'  # clear screen
draw_header "" ""
draw_status_bar ""

LAST_CTX=""
IDLE_SHOWN=0

while true; do
  get_term_size
  CTX_ID=$(get_context_id)

  if [ -n "$CTX_ID" ]; then
    NO_CTX_COUNT=0

    # Context changed — full redraw
    if [ "$CTX_ID" != "$LAST_CTX" ]; then
      MSG_BUFFER=()
      LAST_NO=-1
      LAST_CTX="$CTX_ID"
      IDLE_SHOWN=0
      draw_header "$CTX_ID" "connecting..."

      # Load initial messages
      fetch_chat "$CTX_ID"
      redraw_chat
      draw_header "$CTX_ID" "live"
      draw_status_bar "$CURRENT_PROGRESS"
    else
      # Poll for new messages
      fetch_chat "$CTX_ID"
      rc=$?
      if [ "$rc" -eq 0 ]; then
        # New messages arrived
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

  # Interruptible sleep with keyboard input
  # Position cursor at input area to avoid visual artifacts
  printf '\033[%d;1H' "$((TERM_LINES - 2))"

  read -r -t "$POLL_INTERVAL" -n 1 key 2>/dev/null
  case "$key" in
    q|Q) break ;;
    r|R)
      LAST_NO=-1
      LAST_CTX=""
      MSG_BUFFER=()
      IDLE_SHOWN=0
      printf '\033[2J'
      draw_header "$CTX_ID" "refreshing..."
      ;;
    m|M) do_send_message ;;
    v|V)
      VERBOSE=$(( 1 - VERBOSE ))
      # Reload all messages with new filter
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
      add_msg "$(printf '  %bULC Context Summary%b  %bdaily 06:00%b' "$WHT" "$RST" "$DIM" "$RST")"
      add_msg "$(printf '  %bTELOS Update%b         %badhoc%b' "$WHT" "$RST" "$DIM" "$RST")"
      add_msg "$(printf '  %bSecurity Scan%b        %bweekly Sun%b' "$WHT" "$RST" "$DIM" "$RST")"
      redraw_chat
      draw_status_bar ""
      ;;
  esac
done
