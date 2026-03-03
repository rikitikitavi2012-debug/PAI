#!/bin/bash
# A0 Chat Live — Agent Zero conversation viewer
# Polls /api_log_get for active context, shows messages in chat format
# Context ID read from state file (written by AgentZero.ts)

A0_HOST="72.56.86.51:50002"
A0_CONTEXT_FILE="$HOME/.claude/MEMORY/STATE/a0-active-context.json"
A0_ENV="$HOME/.config/PAI/.env"
POLL_INTERVAL=5
SEEN_COUNT=0

# ── Colors ──
RST='\e[0m'
BLD='\e[1m'
DIM='\e[2m'
CYN='\e[38;2;103;232;249m'
VIO='\e[38;2;167;139;250m'
GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'
YLW='\e[38;2;251;191;36m'
SEP='\e[38;2;71;85;105m'
WHT='\e[38;2;203;213;225m'
SLT='\e[38;2;148;163;184m'

# ── Load API token ──
A0_TOKEN=""
if [ -f "$A0_ENV" ]; then
  A0_TOKEN=$(grep '^A0_API_TOKEN=' "$A0_ENV" | cut -d= -f2)
fi
if [ -z "$A0_TOKEN" ]; then
  printf "%b❌ A0_API_TOKEN не найден в %s%b\n" "${RED}" "$A0_ENV" "${RST}"
  exit 1
fi

# ── Header ──
print_header() {
  clear
  printf "%b%b🧠 A0 CHAT%b  %b(live · ${POLL_INTERVAL}s)%b\n" "${BLD}" "${CYN}" "${RST}" "${DIM}" "${RST}"
  printf "%b" "${SEP}"
  printf '━%.0s' {1..40}
  printf "%b\n" "${RST}"
}

# ── Format timestamp UTC→local ──
to_local_time() {
  local utc_ts="$1"
  if command -v date >/dev/null 2>&1; then
    date -d "$utc_ts" '+%H:%M:%S' 2>/dev/null || echo "${utc_ts:11:8}"
  else
    echo "${utc_ts:11:8}"
  fi
}

# ── Get context info ──
get_context_id() {
  if [ -f "$A0_CONTEXT_FILE" ]; then
    jq -r '.context_id // empty' "$A0_CONTEXT_FILE" 2>/dev/null
  fi
}

get_context_info() {
  if [ -f "$A0_CONTEXT_FILE" ]; then
    local updated last_msg
    updated=$(jq -r '.updated // ""' "$A0_CONTEXT_FILE" 2>/dev/null)
    last_msg=$(jq -r '.last_message // ""' "$A0_CONTEXT_FILE" 2>/dev/null)
    if [ -n "$updated" ]; then
      local local_time
      local_time=$(to_local_time "$updated")
      printf "  %bContext:%b %b%s%b  %bОбновлён:%b %b%s%b\n" "${SLT}" "${RST}" "${WHT}" "$(get_context_id | head -c 16)" "${RST}" "${SLT}" "${RST}" "${DIM}" "$local_time" "${RST}"
      if [ -n "$last_msg" ]; then
        printf "  %bТема:%b %b%s%b\n" "${SLT}" "${RST}" "${DIM}" "${last_msg:0:60}" "${RST}"
      fi
    fi
  fi
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

  if [ -z "$log_json" ] || echo "$log_json" | jq -e '.error' >/dev/null 2>&1; then
    local err
    err=$(echo "$log_json" | jq -r '.error // "Нет ответа"' 2>/dev/null)
    printf "  %b⚠ %s%b\n" "${YLW}" "$err" "${RST}"
    return 1
  fi

  # Parse chat log — A0 returns array of message objects
  local msg_count
  msg_count=$(echo "$log_json" | jq 'if type == "array" then length else 0 end' 2>/dev/null || echo 0)

  if [ "$msg_count" -eq 0 ]; then
    printf "  %bЧат пуст или формат неизвестен%b\n" "${DIM}" "${RST}"
    return 0
  fi

  # Show only new messages (skip already seen)
  local start_idx=$SEEN_COUNT
  if [ "$msg_count" -gt "$SEEN_COUNT" ]; then
    echo "$log_json" | jq -r --argjson start "$start_idx" '
      .[$start:][] |
      (.timestamp // .time // "" ) as $ts |
      (.role // .type // "?") as $role |
      (.content // .message // .text // "" | tostring | gsub("\n"; " ") | .[:120]) as $msg |
      "\($ts)|\($role)|\($msg)"
    ' 2>/dev/null | while IFS='|' read -r ts role msg; do
      local local_ts
      local_ts=$(to_local_time "$ts")
      case "$role" in
        user|human)
          printf "  %b%s%b  %b👤 Ivan:%b %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${GRN}${BLD}" "${RST}" "${WHT}" "$msg" "${RST}"
          ;;
        assistant|ai|agent)
          printf "  %b%s%b  %b🧠 A0:%b %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${CYN}${BLD}" "${RST}" "${WHT}" "$msg" "${RST}"
          ;;
        tool|function|code_execution)
          printf "  %b%s%b  %b⚙ Tool:%b %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${VIO}" "${RST}" "${DIM}" "${msg:0:80}" "${RST}"
          ;;
        *)
          printf "  %b%s%b  %b• %s:%b %b%s%b\n" "${SLT}" "$local_ts" "${RST}" "${DIM}" "$role" "${RST}" "${DIM}" "$msg" "${RST}"
          ;;
      esac
    done
    SEEN_COUNT=$msg_count
  fi
}

# ── Main loop ──
print_header

printf "\n  %bОжидаю активный контекст A0...%b\n" "${DIM}" "${RST}"
printf "  %bОтправь сообщение через: bun AgentZero.ts message \"...\"%b\n" "${DIM}" "${RST}"

LAST_CTX=""

while true; do
  CTX_ID=$(get_context_id)

  if [ -n "$CTX_ID" ]; then
    # Context changed — reset and redraw
    if [ "$CTX_ID" != "$LAST_CTX" ]; then
      print_header
      printf "\n"
      get_context_info
      printf "\n"
      SEEN_COUNT=0
      LAST_CTX="$CTX_ID"
    fi

    fetch_chat "$CTX_ID"
  fi

  # Interruptible sleep — r to refresh, q to quit
  read -r -t "$POLL_INTERVAL" -n 1 key 2>/dev/null
  if [[ "$key" == "q" || "$key" == "Q" ]]; then
    break
  elif [[ "$key" == "r" || "$key" == "R" ]]; then
    printf "  %bОбновляю...%b\n" "${DIM}" "${RST}"
  fi
done
