#!/bin/bash
# A0 Chat Live — Agent Zero conversation viewer v6.0
# Stream-based: stdout output, terminal-native scroll (like events-tail.sh)
# No alternate screen — simple and robust. Scroll: Shift+PgUp/PgDn in Kitty
# v6: fixed header duplication, overwriting status line, full content display

A0_HOST="72.56.86.51:50002"
A0_CONTEXT_FILE="$HOME/.claude/MEMORY/STATE/a0-active-context.json"
A0_ENV="$HOME/.config/PAI/.env"
A0_CLI="$HOME/.claude/PAI/Tools/AgentZero.ts"
VOICE_URL="http://localhost:8888/notify"

export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"
export PATH="$HOME/.bun/bin:$PATH"
POLL_INTERVAL=3
LAST_NO=-1
VERBOSE=0
MSG_COUNT=0
RESP_COUNT=0
LAST_LATENCY=0
INITIAL_LOAD=1
CURRENT_PROGRESS=""
HAS_STATUS=0

# ── Colors (24-bit RGB) ──
RST='\e[0m'; BLD='\e[1m'; DIM='\e[2m'; ITL='\e[3m'
CYN='\e[38;2;103;232;249m'; VIO='\e[38;2;167;139;250m'; GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'; YLW='\e[38;2;251;191;36m'; SEP='\e[38;2;71;85;105m'
WHT='\e[38;2;203;213;225m'; SLT='\e[38;2;148;163;184m'; BLU='\e[38;2;96;165;250m'
ORG='\e[38;2;251;146;60m'; PNK='\e[38;2;244;114;182m'; EMR='\e[38;2;52;211;153m'
GH1='\e[38;2;56;189;248m'; GH2='\e[38;2;99;102;241m'; GH3='\e[38;2;167;139;250m'
BG_IVAN='\e[48;2;22;40;28m'; BG_A0='\e[48;2;20;30;45m'; BG_RST='\e[49m'

TL='╭'; BL='╰'; HZ='─'; VT='│'
DTL='╔'; DBL='╚'; DHZ='═'; DVT='║'
SPIN_FRAMES=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏'); SPIN_IDX=0

# ── Load API token ──
A0_TOKEN=""
[ -f "$A0_ENV" ] && A0_TOKEN=$(grep '^A0_API_TOKEN=' "$A0_ENV" | cut -d= -f2-)
[ -z "$A0_TOKEN" ] && { printf "%b✗ A0_API_TOKEN not found%b\n" "$RED" "$RST"; exit 1; }

# ── UI Library ──
. "$HOME/.config/kitty/scripts/lib/ui.sh"
set_tab_title "A0 Chat"
update_term_size() {
  TERM_COLS=$(tput cols 2>/dev/null || echo 90)
  [ "$TERM_COLS" -lt 40 ] && TERM_COLS=40
  BUBBLE_W=$((TERM_COLS - 6)); [ "$BUBBLE_W" -gt 100 ] && BUBBLE_W=100
}
update_term_size
trap 'update_term_size' WINCH

# ── Helpers ──
strip_icon() { local h="$1"; h="${h#icon://* }"; [[ "$h" == icon://* ]] && h="${h#icon://}" && h="${h#* }"; echo "$h"; }
strip_agent_prefix() { local t="$1"; t="${t#A[0-9]: }"; echo "$t"; }
strip_ansi() { echo "$1" | sed -E 's/\\e\[[0-9;]*m//g; s/\x1b\[[0-9;]*m//g'; }

to_local_time() {
  local ts="$1"
  [ -z "$ts" ] || [ "$ts" = "null" ] || [ "$ts" = "0" ] && { echo "??:??"; return; }
  [[ "$ts" =~ ^[0-9]+\.?[0-9]*$ ]] && { date -d "@${ts%%.*}" '+%H:%M:%S' 2>/dev/null || echo "??:??"; return; }
  date -d "$ts" '+%H:%M:%S' 2>/dev/null || echo "${ts:11:8}"
}

voice_notify() {
  [ "$INITIAL_LOAD" -eq 1 ] && return
  curl -s -X POST "$VOICE_URL" -H "Content-Type: application/json" \
    -d "{\"message\": \"${1:0:100}\", \"voice_id\": \"0BcDz9UPwL3MpsnTeUlO\", \"voice_enabled\": true}" \
    >/dev/null 2>&1 &
}

get_context_id() { [ -f "$A0_CONTEXT_FILE" ] && jq -r '.context_id // empty' "$A0_CONTEXT_FILE" 2>/dev/null; }

# ── Status line (overwrites itself via \r) ──
clear_status() {
  [ "$HAS_STATUS" -eq 1 ] && printf '\r\033[K'
  HAS_STATUS=0
}

print_status() {
  printf '\r\033[K'
  # Connection health dot
  if [ "$LAST_LATENCY" -eq 0 ]; then
    printf '  %b○%b ' "$SEP" "$RST"
  elif [ "$LAST_LATENCY" -lt 1000 ]; then
    printf '  %b●%b ' "$GRN" "$RST"
  elif [ "$LAST_LATENCY" -lt 3000 ]; then
    printf '  %b●%b ' "$YLW" "$RST"
  else
    printf '  %b●%b ' "$RED" "$RST"
  fi
  # Latency + counts
  printf '%b%sms%b  %b↑%s ↓%s%b' "$DIM" "$LAST_LATENCY" "$RST" "$SLT" "$MSG_COUNT" "$RESP_COUNT" "$RST"
  # Progress/thinking in same line
  if [ -n "$CURRENT_PROGRESS" ]; then
    local f="${SPIN_FRAMES[$SPIN_IDX]}"
    SPIN_IDX=$(( (SPIN_IDX+1) % ${#SPIN_FRAMES[@]} ))
    printf '  %b%s%b %b%s%b' "$YLW" "$f" "$RST" "$ITL$SLT" "${CURRENT_PROGRESS:0:$((TERM_COLS-40))}" "$RST"
  fi
  HAS_STATUS=1
}

# ── Inline formatting: **bold** and `code` ──
inline_fmt() {
  local remaining="$1" result=""
  while [ -n "$remaining" ]; do
    case "$remaining" in
      '**'*) remaining="${remaining#\*\*}"; local be="${remaining%%\*\**}"
        if [ "$be" != "$remaining" ]; then
          result+=$(printf '%b%s%b' "$BLD$WHT" "$be" "$RST$WHT")
          remaining="${remaining#"$be"}"; remaining="${remaining#\*\*}"
        else result+="**"; fi ;;
      '`'*) remaining="${remaining#\`}"; local ce="${remaining%%\`*}"
        if [ "$ce" != "$remaining" ]; then
          result+=$(printf '%b%s%b' "$ORG" "$ce" "$RST$WHT")
          remaining="${remaining#"$ce"}"; remaining="${remaining#\`}"
        else result+="\`"; fi ;;
      *) result+="${remaining:0:1}"; remaining="${remaining:1}" ;;
    esac
  done
  printf '%s' "$result"
}

md_line() {
  local text="$1"
  [[ "$text" =~ ^##[[:space:]] ]] && { printf '%b%b%s%b' "$EMR" "$BLD" "${text#\#\# }" "$RST"; return; }
  [[ "$text" =~ ^###[[:space:]] ]] && { printf '%b%b%s%b' "$VIO" "$BLD" "${text#\#\#\# }" "$RST"; return; }
  if [[ "$text" =~ ^[[:space:]]*[-*][[:space:]] ]]; then
    local indent="${text%%[-*]*}"; text="${text#*[-*] }"
    printf '%s%b●%b %s' "$indent" "$EMR" "$RST" "$(inline_fmt "$text")"; return; fi
  if [[ "$text" =~ ^[[:space:]]*[0-9]+\.[[:space:]] ]]; then
    local num="${text%%.*}"; num="${num#"${num%%[0-9]*}"}"; text="${text#*[0-9]. }"
    printf '%b%s.%b %s' "$CYN" "$num" "$RST" "$(inline_fmt "$text")"; return; fi
  [[ "$text" =~ ^---+$ ]] && { printf '%b%s%b' "$SEP" "$(printf '%*s' "$((BUBBLE_W-8))" '' | tr ' ' '─')" "$RST"; return; }
  inline_fmt "$text"
}

word_wrap() {
  local text="$1" width="$2"
  while [ ${#text} -gt 0 ]; do
    [ ${#text} -le "$width" ] && { echo "$text"; break; }
    local chunk="${text:0:$width}" last_sp="${chunk% *}"
    if [ "$last_sp" != "$chunk" ] && [ ${#last_sp} -gt $((width/3)) ]; then
      echo "$last_sp"; text="${text:${#last_sp}}"; text="${text# }"
    else echo "$chunk"; text="${text:$width}"; fi
  done
}

# ── Print bubble to stdout ──
print_bubble() {
  local sender="$1" color="$2" bg="$3" ts="$4"; shift 4
  local lines=("$@") w=$BUBBLE_W inner=$((BUBBLE_W-4))
  local fill_len=$((w - ${#sender} - ${#ts} - 5)); [ "$fill_len" -lt 1 ] && fill_len=1
  local fill; fill=$(printf '%*s' "$fill_len" '' | tr ' ' "$HZ")
  local tl="$TL" bl="$BL" hz="$HZ" vt="$VT"
  [ "$sender" = "A0" ] && tl="$DTL" bl="$DBL" hz="$DHZ" vt="$DVT"
  printf '  %b%s%s%b %b%b%s%b %b%s%b %b%s%b\n' \
    "$color" "$tl" "$hz" "$RST" "$color" "$BLD" "$sender" "$RST" \
    "$color" "$fill" "$RST" "$DIM" "$ts" "$RST"
  for line in "${lines[@]}"; do
    printf '  %b%s%b %b%s%b\n' "$color" "$vt" "$RST" "$bg$WHT" "$(md_line "${line:0:$inner}")" "$BG_RST$RST"
  done
  printf '  %b%s%s%b\n' "$color" "$bl" "$(printf '%*s' "$((w-1))" '' | tr ' ' "$hz")" "$RST"
}

# ── Format and print log items ──
format_item() {
  local no="$1" ts="$2" type="$3" heading="$4" content="$5"
  local local_ts; local_ts=$(to_local_time "$ts")
  heading=$(strip_ansi "$(strip_agent_prefix "$(strip_icon "$heading")")")
  content=$(strip_ansi "$content")
  local max_text=$((BUBBLE_W-6)); [ "$max_text" -lt 20 ] && max_text=20
  case "$type" in
    user)
      MSG_COUNT=$((MSG_COUNT+1))
      local msg="${content//\\n/$'\n'}"; [ -z "$msg" ] && msg="$heading"
      local -a lines=(); while IFS= read -r w; do lines+=("$w"); done < <(word_wrap "$msg" "$max_text")
      print_bubble "Ivan" "$GRN" "$BG_IVAN" "$local_ts" "${lines[@]}" ;;
    response)
      RESP_COUNT=$((RESP_COUNT+1))
      local resp="${content//\\n/$'\n'}"; [ -z "$resp" ] && resp="$heading"
      local -a lines=()
      while IFS= read -r p; do [ -z "$p" ] && lines+=("") && continue
        while IFS= read -r w; do lines+=("$w"); done < <(word_wrap "$p" "$max_text")
      done <<< "$resp"
      print_bubble "A0" "$CYN" "$BG_A0" "$local_ts" "${lines[@]}"
      voice_notify "Агент Зеро: ${lines[0]:0:60}" ;;
    agent)
      [ "$VERBOSE" -eq 0 ] && case "$heading" in ""|-|*Reasoning*|*Calling*LLM*|*Calling*subordinate*|*thoughts*|*json*) return ;; esac
      printf '  %b%s%b %b⚡ %s%b\n' "$DIM" "$local_ts" "$RST" "$VIO" "${heading:0:$((TERM_COLS-12))}" "$RST" ;;
    code_exe) [ "$VERBOSE" -eq 1 ] && printf '  %b%s%b %b❯ %s%b\n' "$SLT" "$local_ts" "$RST" "$ORG" "${heading:0:$((TERM_COLS-12))}" "$RST" ;;
    tool)     [ "$VERBOSE" -eq 1 ] && printf '  %b%s%b %b🔧 %s%b\n' "$SLT" "$local_ts" "$RST" "$PNK" "${heading:0:$((TERM_COLS-12))}" "$RST" ;;
    util)     [ "$VERBOSE" -eq 1 ] && printf '  %b%s%b %b💾 %s%b\n' "$SLT" "$local_ts" "$RST" "$DIM" "${heading:0:$((TERM_COLS-12))}" "$RST" ;;
    *)        [ "$VERBOSE" -eq 1 ] && printf '  %b%s%b %b[%s] %s%b\n' "$SLT" "$local_ts" "$RST" "$DIM" "$type" "${heading:0:$((TERM_COLS-12))}" "$RST" ;;
  esac
}

# ── Gradient line helper (batched printf for efficiency) ──
print_gradient_line() {
  local sw=$((TERM_COLS-4)) th=$((sw/3)) rem=$((sw - (sw/3)*2))
  local s1; s1=$(printf '─%.0s' $(seq 1 "$th"))
  local s2; s2=$(printf '─%.0s' $(seq 1 "$th"))
  local s3; s3=$(printf '─%.0s' $(seq 1 "$rem"))
  printf '  %b%s%b%b%s%b%b%s%b\n' "$GH1" "$s1" "$RST" "$GH2" "$s2" "$RST" "$GH3" "$s3" "$RST"
}

# ── Fetch chat ──
fetch_chat() {
  local ctx_id="$1" log_json lat_s lat_e
  lat_s=$(date +%s%N)
  log_json=$(curl -s --max-time 8 -H "X-API-KEY: $A0_TOKEN" -H "Content-Type: application/json" \
    -d "{\"context_id\": \"$ctx_id\", \"length\": 50}" "http://${A0_HOST}/api_log_get" 2>/dev/null)
  lat_e=$(date +%s%N); LAST_LATENCY=$(( (lat_e - lat_s) / 1000000 ))
  [ -z "$log_json" ] && { CURRENT_PROGRESS=""; return 1; }
  echo "$log_json" | jq -e '.error // empty' >/dev/null 2>&1 && { CURRENT_PROGRESS=""; return 1; }

  # Progress tracking — stored for status line display (no new lines)
  local progress; progress=$(echo "$log_json" | jq -r '.log.progress // ""' 2>/dev/null)
  local pa; pa=$(echo "$log_json" | jq -r '.log.progress_active // false' 2>/dev/null)
  if [ "$pa" = "true" ] && [ -n "$progress" ]; then
    CURRENT_PROGRESS=$(strip_agent_prefix "$(strip_icon "$progress")")
  else
    CURRENT_PROGRESS=""
  fi

  # New items
  local new_items
  new_items=$(echo "$log_json" | jq -r --argjson last "$LAST_NO" '
    [.log.items[] | select(.no > $last)] | sort_by(.no) | .[] |
    [(.no|tostring),(.timestamp//0|tostring),(.type//"?"),
     ((.heading//"")|gsub("\n";" ")|.[:200]),
     ((.content//""|tostring)|.[:8000]|gsub("\n";"\\n")|gsub("\t";" "))] | join("\t")
  ' 2>/dev/null)
  local had_new=0
  [ -n "$new_items" ] && {
    clear_status
    while IFS=$'\t' read -r no ts type heading content; do
      [ -z "$no" ] && continue; format_item "$no" "$ts" "$type" "$heading" "$content"; had_new=1
    done <<< "$new_items"
  }
  local mx; mx=$(echo "$log_json" | jq '[.log.items[].no] | max' 2>/dev/null || echo "$LAST_NO")
  [ "$mx" -gt "$LAST_NO" ] 2>/dev/null && LAST_NO=$mx
  INITIAL_LOAD=0; [ "$had_new" -eq 1 ]
}

# ── Print header (once per context — never repeated) ──
print_header() {
  local ctx="$1"
  printf '\n'
  print_gradient_line
  # Title row
  printf '  %b◆%b %b%bA0 CHAT%b %b◆%b' "$GH1" "$RST" "$GH2" "$BLD" "$RST" "$GH1" "$RST"
  [ -n "$ctx" ] && printf '  %b%s%b' "$SLT" "${ctx:0:12}" "$RST"
  printf '\n'
  print_gradient_line
  printf '\n'
}

print_hints() {
  local vl="verbose"; [ "$VERBOSE" -eq 1 ] && vl="clean"
  printf '  %b%bm%b%b=msg %b%bn%b%b=new %b%bv%b%b=%s %b%br%b%b=refresh %b%bh%b%b=health %b%bq%b%b=quit  %bScroll: Shift+PgUp/PgDn%b\n\n' \
    "$GRN" "$BLD" "$RST" "$SEP" "$CYN" "$BLD" "$RST" "$SEP" \
    "$CYN" "$BLD" "$RST" "$SEP" "$vl" "$CYN" "$BLD" "$RST" "$SEP" \
    "$CYN" "$BLD" "$RST" "$SEP" "$RED" "$BLD" "$RST" "$SEP" "$DIM" "$RST"
}

show_idle() {
  print_header ""
  printf '  %bНет активного диалога%b\n\n' "$SLT" "$RST"
  local h; h=$(curl -s --max-time 3 "http://${A0_HOST}/health" 2>/dev/null)
  [ -n "$h" ] && printf '  %b● Agent Zero онлайн%b\n\n' "$GRN" "$RST" || \
    printf '  %b○ Agent Zero оффлайн%b\n\n' "$RED" "$RST"
  print_hints
  printf '  %bCLI: bun AgentZero.ts message \"текст\"%b\n\n' "$DIM" "$RST"
}

# ── Actions ──
do_send_message() {
  clear_status
  printf "  %b%bСообщение:%b " "$GRN" "$BLD" "$RST"; read -r msg
  if [ -n "$msg" ]; then
    printf "  %bОтправка...%b\n" "$DIM" "$RST"
    local ctx_flag=""; [ -n "$CTX_ID" ] && ctx_flag="--context $CTX_ID"
    local result; result=$(bun "$A0_CLI" message "$msg" $ctx_flag 2>&1)
    local rt; rt=$(echo "$result" | jq -r '.response // empty' 2>/dev/null)
    local rc; rc=$(echo "$result" | jq -r '.context_id // empty' 2>/dev/null)
    [ -n "$rc" ] && { CTX_ID="$rc"; LAST_CTX=""; LAST_NO=-1
      printf '{"context_id":"%s","updated":"%s","last_message":"%s"}' \
        "$rc" "$(date -Iseconds)" "${msg:0:60}" > "$A0_CONTEXT_FILE"; }
    if [ -n "$rt" ]; then
      rt=$(strip_ansi "$rt")
      local -a il=(); while IFS= read -r w; do il+=("$w"); done < <(word_wrap "$msg" "$((BUBBLE_W-6))")
      print_bubble "Ivan" "$GRN" "$BG_IVAN" "$(date +%H:%M:%S)" "${il[@]}"
      local -a al=()
      while IFS= read -r p; do [ -z "$p" ] && al+=("") && continue
        while IFS= read -r w; do al+=("$w"); done < <(word_wrap "$p" "$((BUBBLE_W-6))")
      done <<< "$rt"
      print_bubble "A0" "$CYN" "$BG_A0" "$(date +%H:%M:%S)" "${al[@]}"
      INITIAL_LOAD=0; voice_notify "Агент Зеро: ${rt:0:60}"
    fi
  fi
}

do_new_chat() {
  clear_status
  printf "  %b%bНовый чат:%b " "$CYN" "$BLD" "$RST"; read -r msg
  if [ -n "$msg" ]; then
    printf "  %bСоздание...%b\n" "$DIM" "$RST"
    local result; result=$(bun "$A0_CLI" message "$msg" 2>&1)
    local rt; rt=$(echo "$result" | jq -r '.response // empty' 2>/dev/null)
    local rc; rc=$(echo "$result" | jq -r '.context_id // empty' 2>/dev/null)
    if [ -n "$rc" ]; then
      CTX_ID="$rc"; LAST_CTX=""; LAST_NO=-1; MSG_COUNT=0; RESP_COUNT=0
      printf '{"context_id":"%s","updated":"%s","last_message":"%s"}' \
        "$rc" "$(date -Iseconds)" "${msg:0:60}" > "$A0_CONTEXT_FILE"
      print_header "$rc"
      local -a il=(); while IFS= read -r w; do il+=("$w"); done < <(word_wrap "$msg" "$((BUBBLE_W-6))")
      print_bubble "Ivan" "$GRN" "$BG_IVAN" "$(date +%H:%M:%S)" "${il[@]}"
      if [ -n "$rt" ]; then
        rt=$(strip_ansi "$rt")
        local -a al=()
        while IFS= read -r p; do [ -z "$p" ] && al+=("") && continue
          while IFS= read -r w; do al+=("$w"); done < <(word_wrap "$p" "$((BUBBLE_W-6))")
        done <<< "$rt"
        print_bubble "A0" "$CYN" "$BG_A0" "$(date +%H:%M:%S)" "${al[@]}"
        INITIAL_LOAD=0; voice_notify "Агент Зеро: ${rt:0:60}"
      fi
    fi
  fi
}

do_health() {
  clear_status
  local lat_s lat_e lat_ms; lat_s=$(date +%s%N)
  local h; h=$(curl -s --max-time 5 "http://${A0_HOST}/health" 2>/dev/null)
  lat_e=$(date +%s%N); lat_ms=$(( (lat_e - lat_s) / 1000000 ))
  if [ -n "$h" ]; then
    printf '  %b%b● A0 ONLINE%b  %b%sms%b\n' "$GRN" "$BLD" "$RST" "$EMR" "$lat_ms" "$RST"
    INITIAL_LOAD=0; voice_notify "Агент Зеро онлайн"
  else printf '  %b%b○ A0 UNREACHABLE%b\n' "$RED" "$BLD" "$RST"; fi
}

# ── Cleanup ──
trap 'clear_status; printf "\n%b[A0 Chat closed]%b\n" "$DIM" "$RST"; exit 0' INT TERM

# ── Main ──
LAST_CTX=""; IDLE_SHOWN=0

while true; do
  CTX_ID=$(get_context_id)
  if [ -n "$CTX_ID" ]; then
    if [ "$CTX_ID" != "$LAST_CTX" ]; then
      clear_status
      MSG_COUNT=0; RESP_COUNT=0; LAST_NO=-1; LAST_CTX="$CTX_ID"
      IDLE_SHOWN=0; INITIAL_LOAD=1
      print_header "$CTX_ID"; fetch_chat "$CTX_ID"; print_hints
    else
      fetch_chat "$CTX_ID"
    fi
    print_status "$CTX_ID"
  else
    [ "$IDLE_SHOWN" -eq 0 ] && { show_idle; IDLE_SHOWN=1; }
  fi

  read -r -t "$POLL_INTERVAL" -n 1 -s key 2>/dev/null || key=""
  while read -r -t 0.01 -n 1 -s _ 2>/dev/null; do :; done
  case "$key" in
    q|Q) clear_status; printf '\n%b[A0 Chat closed]%b\n' "$DIM" "$RST"; break ;;
    m|M) do_send_message ;;
    n|N) do_new_chat ;;
    h|H) do_health ;;
    v|V) clear_status; VERBOSE=$((1-VERBOSE)); LAST_NO=-1; LAST_CTX=""
         printf '\n  %b[%s mode]%b\n' "$CYN" "$([ "$VERBOSE" -eq 1 ] && echo verbose || echo clean)" "$RST" ;;
    r|R) clear_status; LAST_NO=-1; LAST_CTX=""; IDLE_SHOWN=0; MSG_COUNT=0; RESP_COUNT=0; INITIAL_LOAD=1
         printf '\n  %b[refreshing...]%b\n' "$DIM" "$RST" ;;
    c|C) clear_status; printf "  %bContext ID:%b " "$CYN" "$RST"; read -r nc
         [ -n "$nc" ] && { CTX_ID="$nc"; LAST_CTX=""; LAST_NO=-1; MSG_COUNT=0; RESP_COUNT=0
           printf '{"context_id":"%s","updated":"%s","last_message":"switch"}' \
             "$nc" "$(date -Iseconds)" > "$A0_CONTEXT_FILE"; } ;;
    l|L) clear_status; printf '  %b── лог ──%b\n' "$DIM" "$RST"
         bun "$A0_CLI" log 2>&1 | head -8 | while IFS= read -r line; do
           printf '  %b%s%b\n' "$DIM" "${line:0:$((TERM_COLS-6))}" "$RST"; done ;;
    t|T) clear_status; printf '  %b── задачи ──%b\n' "$DIM" "$RST"
         printf '  %b●%b Daily Health  %b●%b Weekly Security  %b●%b Weekly TELOS\n' \
           "$GRN" "$RST" "$RED" "$RST" "$CYN" "$RST" ;;
  esac
done
