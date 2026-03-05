#!/bin/bash
# A0 Chat Live — Agent Zero conversation viewer
# Polls /api_log_get for active context, shows messages in chat format
# Context ID read from state file (written by AgentZero.ts)

A0_HOST="72.56.86.51:50002"
A0_CONTEXT_FILE="$HOME/.claude/MEMORY/STATE/a0-active-context.json"
A0_ENV="$HOME/.config/PAI/.env"
A0_CLI="$HOME/.claude/PAI/Tools/AgentZero.ts"

# A0 is direct WAN — bypass VPN proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"
export PATH="$HOME/.bun/bin:$PATH"
POLL_INTERVAL=5
LAST_NO=-1
NO_CTX_COUNT=0

# ── Colors (24-bit RGB — PAI palette, shared across all dashboards) ──
RST='\e[0m'
BLD='\e[1m'
DIM='\e[2m'
CYN='\e[38;2;103;232;249m'
VIO='\e[38;2;167;139;250m'
GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'
YLW='\e[38;2;251;191;36m'
SEP='\e[38;2;71;85;105m'      # separators and borders
WHT='\e[38;2;203;213;225m'    # primary text
SLT='\e[38;2;148;163;184m'    # secondary text (bright enough for readability)

# ── Load API token ──
A0_TOKEN=""
if [ -f "$A0_ENV" ]; then
  A0_TOKEN=$(grep '^A0_API_TOKEN=' "$A0_ENV" | cut -d= -f2-)
fi
if [ -z "$A0_TOKEN" ]; then
  printf "%b❌ A0_API_TOKEN не найден в %s%b\n" "${RED}" "$A0_ENV" "${RST}"
  exit 1
fi

# ── UI Helpers (Source Library) ──
. "$HOME/.config/kitty/scripts/lib/ui.sh"

# ── Header ──
print_header() {
  clear
  box_top
  box_line "$(printf "%b%b🧠 A0 CHAT%b  %b(live · %ss)%b" "${CYN}" "${BLD}" "${RST}" "${SLT}" "${POLL_INTERVAL}" "${RST}")"
  box_bot
  printf "\n"
}

# ── Format timestamp → local HH:MM:SS ──
# Handles both UNIX float (1772566224.67) and ISO string (2026-03-03T19:30:43.031Z)
to_local_time() {
  local ts="$1"
  if [ -z "$ts" ] || [ "$ts" = "null" ] || [ "$ts" = "0" ]; then
    echo "??:??:??"
    return
  fi
  # UNIX float → prepend @
  if [[ "$ts" =~ ^[0-9]+\.?[0-9]*$ ]]; then
    local ts_int="${ts%%.*}"
    date -d "@${ts_int}" '+%H:%M:%S' 2>/dev/null || echo "??:??:??"
  else
    # ISO string
    date -d "$ts" '+%H:%M:%S' 2>/dev/null || echo "${ts:11:8}"
  fi
}

# ── Get context info ──
get_context_id() {
  if [ -f "$A0_CONTEXT_FILE" ]; then
    jq -r '.context_id // empty' "$A0_CONTEXT_FILE" 2>/dev/null
  fi
}

get_context_info() {
  local ctx_id="$1"
  if [ -f "$A0_CONTEXT_FILE" ]; then
    local updated last_msg
    updated=$(jq -r '.updated // ""' "$A0_CONTEXT_FILE" 2>/dev/null)
    last_msg=$(jq -r '.last_message // ""' "$A0_CONTEXT_FILE" 2>/dev/null)
    if [ -n "$updated" ]; then
      local local_time
      local_time=$(to_local_time "$updated")
      printf "  %bContext:%b %b%s%b  %bОбновлён:%b %b%s%b\n" "${SLT}" "${RST}" "${WHT}" "${ctx_id:0:16}" "${RST}" "${SLT}" "${RST}" "${DIM}" "$local_time" "${RST}"
      if [ -n "$last_msg" ]; then
        printf "  %bТема:%b %b%s%b\n" "${SLT}" "${RST}" "${DIM}" "${last_msg:0:60}" "${RST}"
      fi
    fi
  fi
}

# ── Idle panel (no active context) ──
show_idle_panel() {
  box_top
  box_line "$(printf '%b%b  A0 CHAT%b  %b  нет активного диалога%b' "${CYN}" "${BLD}" "${RST}" "${SLT}" "${RST}")"
  box_sep
  box_line ""
  box_line "$(printf '%b  Команды:%b' "${WHT}${BLD}" "${RST}")"
  box_line "$(printf '%b  m%b = отправить сообщение     %bl%b = посмотреть лог' "${CYN}" "${RST}" "${CYN}" "${RST}")"
  box_line "$(printf '%b  t%b = задачи scheduler        %bh%b = проверить здоровье' "${CYN}" "${RST}" "${CYN}" "${RST}")"
  box_line "$(printf '%b  c%b = ввести context_id       %br%b = обновить' "${CYN}" "${RST}" "${CYN}" "${RST}")"
  box_line ""
  box_sep
  box_line "$(printf '%b  CLI:%b' "${WHT}${BLD}" "${RST}")"
  box_line "$(printf '%b  bun AgentZero.ts message \"текст\"%b' "${DIM}" "${RST}")"
  box_line "$(printf '%b  bun AgentZero.ts async \"длинная задача\"%b' "${DIM}" "${RST}")"
  box_line "$(printf '%b  bun AgentZero.ts scheduler results%b' "${DIM}" "${RST}")"
  box_line ""
  box_bot
}

# ── Show scheduled tasks ──
show_scheduler_tasks() {
  printf "\n"
  section_header "" "Scheduled Tasks" "$VIO"
  printf "\n"
  bun "$A0_CLI" scheduler results 2>/dev/null | head -15
  printf "\n"
}

# ── Send message interactively ──
do_send_message() {
  printf "\n  %bСообщение:%b " "${CYN}" "${RST}"
  read -r msg
  if [ -n "$msg" ]; then
    local ctx_flag=""
    [ -n "$CTX_ID" ] && ctx_flag="--context $CTX_ID"
    printf "  %bОтправляю...%b\n" "${DIM}" "${RST}"
    bun "$A0_CLI" message "$msg" $ctx_flag 2>&1
    printf "\n"
  fi
}

# ── Check health ──
do_health_check() {
  printf "\n  %bПроверяю здоровье A0...%b\n" "${DIM}" "${RST}"
  bun "$A0_CLI" health 2>&1
  printf "\n"
}

# ── Show last log ──
do_show_log() {
  printf "\n  %bЗапрашиваю лог...%b\n" "${DIM}" "${RST}"
  bun "$A0_CLI" log 2>&1 | head -20
  printf "\n"
}

# ── Enter context manually ──
do_enter_context() {
  printf "\n  %bContext ID:%b " "${CYN}" "${RST}"
  read -r new_ctx
  if [ -n "$new_ctx" ]; then
    CTX_ID="$new_ctx"
    LAST_CTX=""
    LAST_NO=-1
    printf "  %bКонтекст установлен: %s%b\n" "${GRN}" "${new_ctx:0:24}" "${RST}"
  fi
}

# ── Status bar ──
print_status_bar() {
  printf "  %b── r=обновить  m=сообщение  t=задачи  h=health  c=контекст  q=выход ──%b" "${SEP}" "${RST}"
}

# ── Fetch and display chat log ──
fetch_chat() {
  local ctx_id="$1"
  local log_json

  log_json=$(curl -s --max-time 10 \
    -H "X-API-KEY: $A0_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"context_id\": \"$ctx_id\", \"length\": 50}" \
    "http://${A0_HOST}/api_log_get" 2>/dev/null)

  if [ -z "$log_json" ]; then
    printf "  %b⚠ Нет ответа от A0%b\n" "${YLW}" "${RST}"
    return 1
  fi

  # Check for error
  local api_err
  api_err=$(echo "$log_json" | jq -r '.error // empty' 2>/dev/null)
  if [ -n "$api_err" ]; then
    printf "  %b⚠ A0: %s%b\n" "${YLW}" "${api_err}" "${RST}"
    return 1
  fi

  # A0 API returns {context_id, log: {items: [...], progress, total_items}}
  local msg_count progress
  msg_count=$(echo "$log_json" | jq '.log.items | length' 2>/dev/null || echo 0)
  progress=$(echo "$log_json" | jq -r '.log.progress // ""' 2>/dev/null)

  if [ "$msg_count" -eq 0 ]; then
    printf "  %bЧат пуст%b\n" "${DIM}" "${RST}"
    return 0
  fi

  # Show progress indicator if agent is active
  if [ -n "$progress" ] && [ "$progress" != "null" ]; then
    local progress_active
    progress_active=$(echo "$log_json" | jq -r '.log.progress_active // false' 2>/dev/null)
    if [ "$progress_active" = "true" ]; then
      printf "\r  %b⟳ %s%b\n" "${YLW}" "$progress" "${RST}"
    fi
  fi

  # Show only new messages (by .no field)
  echo "$log_json" | jq -r --argjson last_no "$LAST_NO" '
    .log.items[] | select(.no > $last_no) |
    (.timestamp // 0 | tostring) as $ts |
    (.type // "?") as $type |
    (.no | tostring) as $no |
    (.heading // "") as $heading |
    (.content // "" | tostring | gsub("\n"; " ") | .[:120]) as $content |
    "\($no)|\($ts)|\($type)|\($heading)|\($content)"
  ' 2>/dev/null | while IFS='|' read -r no ts type heading content; do
    local local_ts display_text
    local_ts=$(to_local_time "$ts")

    # Use heading if available, otherwise content preview
    if [ -n "$heading" ] && [ "$heading" != "null" ]; then
      # Strip icon:// prefix
      display_text="${heading#icon://* }"
      display_text="${display_text:0:100}"
    else
      display_text="${content:0:100}"
    fi

    case "$type" in
      user)
        printf "  %b%-8s%b  %b👤 Ivan:%b %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${GRN}${BLD}" "${RST}" "${WHT}" "$display_text" "${RST}"
        ;;
      agent)
        printf "  %b%-8s%b  %b🧠 A0:%b   %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${CYN}${BLD}" "${RST}" "${WHT}" "$display_text" "${RST}"
        ;;
      response)
        printf "  %b%-8s%b  %b💬 Ответ:%b %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${VIO}${BLD}" "${RST}" "${WHT}" "${display_text:0:100}" "${RST}"
        ;;
      util)
        printf "  %b%-8s%b  %b⚙ %s%b\n" "${SLT}" "$local_ts" "${RST}" "${SLT}" "${display_text:0:80}" "${RST}"
        ;;
      *)
        printf "  %b%-8s%b  %b• %s: %s%b\n" "${SLT}" "$local_ts" "${RST}" "${SLT}" "$type" "${display_text:0:80}" "${RST}"
        ;;
    esac

    # Update LAST_NO (note: runs in subshell, handled below)
  done

  # Update LAST_NO from max .no in items
  local max_no
  max_no=$(echo "$log_json" | jq '[.log.items[].no] | max' 2>/dev/null || echo "$LAST_NO")
  if [ "$max_no" -gt "$LAST_NO" ] 2>/dev/null; then
    LAST_NO=$max_no
  fi
}

# ── Main loop ──
print_header

LAST_CTX=""
IDLE_SHOWN=0

while true; do
  CTX_ID=$(get_context_id)

  if [ -n "$CTX_ID" ]; then
    NO_CTX_COUNT=0
    IDLE_SHOWN=0

    # Context changed — reset and redraw
    if [ "$CTX_ID" != "$LAST_CTX" ]; then
      print_header
      printf "\n"
      get_context_info "$CTX_ID"
      printf "\n"
      LAST_NO=-1
      LAST_CTX="$CTX_ID"
    fi

    fetch_chat "$CTX_ID"
  else
    # No active context — show idle panel once
    if [ "$IDLE_SHOWN" -eq 0 ]; then
      print_header
      printf "\n"
      show_idle_panel
      IDLE_SHOWN=1
    fi

    # Auto-show scheduler tasks every 30s (6 * 5s poll)
    NO_CTX_COUNT=$((NO_CTX_COUNT + 1))
    if [ $((NO_CTX_COUNT % 6)) -eq 0 ]; then
      show_scheduler_tasks
    fi
  fi

  # Status bar
  printf "\r\033[K"
  print_status_bar

  # Interruptible sleep — keyboard commands
  read -r -t "$POLL_INTERVAL" -n 1 key 2>/dev/null
  case "$key" in
    q|Q) break ;;
    r|R) printf "\n  %bОбновляю...%b\n" "${DIM}" "${RST}"; IDLE_SHOWN=0 ;;
    m|M) do_send_message ;;
    t|T) show_scheduler_tasks ;;
    h|H) do_health_check ;;
    l|L) do_show_log ;;
    c|C) do_enter_context ;;
  esac
done
