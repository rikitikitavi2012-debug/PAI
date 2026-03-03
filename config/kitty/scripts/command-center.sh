#!/bin/bash
# PAI Command Center — Operational Pulse for Kitty (Tab 2: ⬢ Center)
# Scope: system health, AI brigade, sessions, PRs, hooks (NO goal/strategy duplication with Telos tab)
# Refresh: every 30 seconds | r = refresh now | q = exit

export PATH="$HOME/.bun/bin:$PATH"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"
# A0 is direct WAN — bypass proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"

# Source API keys
# shellcheck disable=SC1091
. "$HOME/.config/PAI/.env" 2>/dev/null

INTERVAL=30
TELOS_JSON="$HOME/.claude/MEMORY/STATE/telos-state.json"
TELOS_PARSER="$HOME/.claude/PAI/Tools/TelosParser.ts"
A0_HEALTH_URL="http://72.56.86.51:50002/health"
WORK_DIR="$HOME/.claude/MEMORY/WORK"
AUTOMERGE_JSON="$HOME/.claude/MEMORY/STATE/jules-automerge.json"
HOOKS_DIR="$HOME/.claude/hooks"
HOOKS_TESTS="$HOME/.claude/hooks/tests"

# ── Colors (24-bit RGB — PAI palette, shared across all dashboards) ──
RST='\e[0m'; BLD='\e[1m'; DIM='\e[2m'
GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'
YLW='\e[38;2;251;191;36m'
CYN='\e[38;2;103;232;249m'
SLT='\e[38;2;148;163;184m'    # secondary text (bright enough for readability)
SEP='\e[38;2;71;85;105m'      # separators and borders
BLU='\e[38;2;59;130;246m'
VIO='\e[38;2;167;139;250m'
WHT='\e[38;2;203;213;225m'    # primary text
ORG='\e[38;2;251;146;60m'

# ── Terminal width ──
cols=$(tput cols 2>/dev/null || echo 96)
if [ "$cols" -gt 96 ]; then cols=96; fi
if [ "$cols" -lt 80 ]; then cols=80; fi

# Half-width for two-column layout (subtract 4 for borders/padding)
half=$(( (cols - 4) / 2 ))

# ── Helpers ──
hline() {
  local ch="${1:-─}" w="${2:-$cols}"
  printf '%s' "$ch"
  local i
  for ((i=1; i<w; i++)); do printf '%s' "$ch"; done
}

# Print a box top: ┌────...────┐
box_top() {
  printf '%b┌%s┐%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"
}

# Print a box bottom: └────...────┘
box_bot() {
  printf '%b└%s┘%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"
}

# Print a box line: │ content... (padded) │
# Usage: box_line "content" [color_prefix]
box_line() {
  local content="$1"
  # Strip ANSI codes for length calculation
  local stripped
  stripped=$(printf '%b' "$content" | sed 's/\x1b\[[0-9;]*m//g')
  local len=${#stripped}
  local pad=$((cols - 4 - len))
  if [ "$pad" -lt 0 ]; then pad=0; fi
  printf '%b│%b  %b%*s  %b│%b\n' "${SEP}" "${RST}" "$content" "$pad" "" "${SEP}" "${RST}"
}

# Section header (full width box)
section_box() {
  local title="$1" color="$2"
  printf '%b├%s┤%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"
  box_line "$(printf '%b%b%s%b' "$color" "$BLD" "$title" "$RST")"
  printf '%b├%s┤%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"
}

# Progress bar: filled/empty with color based on percentage
progress_bar() {
  local pct=$1 width=${2:-16}
  local filled=$((pct * width / 100))
  local empty=$((width - filled))
  local color="$DIM"
  if [ "$pct" -gt 50 ]; then
    color="$GRN"
  elif [ "$pct" -gt 0 ]; then
    color="$YLW"
  fi
  printf '%b' "$color"
  local i
  for ((i=0; i<filled; i++)); do printf '%s' '█'; done
  printf '%b' "$SEP"
  for ((i=0; i<empty; i++)); do printf '%s' '░'; done
  printf '%b' "$RST"
}

# Two-column line: left and right content side by side
# Usage: two_col "left content" "right content"
two_col() {
  local left="$1" right="$2"
  local left_stripped right_stripped
  left_stripped=$(printf '%b' "$left" | sed 's/\x1b\[[0-9;]*m//g')
  right_stripped=$(printf '%b' "$right" | sed 's/\x1b\[[0-9;]*m//g')
  local left_len=${#left_stripped}
  local right_len=${#right_stripped}
  local left_pad=$((half - left_len))
  local right_pad=$((cols - 4 - half - 1 - right_len))
  if [ "$left_pad" -lt 0 ]; then left_pad=0; fi
  if [ "$right_pad" -lt 0 ]; then right_pad=0; fi
  printf '%b│%b %b%*s%b│%b %b%*s %b│%b\n' \
    "${SEP}" "${RST}" \
    "$left" "$left_pad" "" \
    "${SEP}" "${RST}" \
    "$right" "$right_pad" "" \
    "${SEP}" "${RST}"
}

# Two-column separator
two_col_top() {
  local left_w=$half right_w=$((cols - 2 - half - 1))
  printf '%b├%s┬%s┤%b\n' "${SEP}" "$(hline '─' "$left_w")" "$(hline '─' "$right_w")" "${RST}"
}

two_col_mid() {
  local left_w=$half right_w=$((cols - 2 - half - 1))
  printf '%b├%s┼%s┤%b\n' "${SEP}" "$(hline '─' "$left_w")" "$(hline '─' "$right_w")" "${RST}"
}

two_col_bot() {
  local left_w=$half right_w=$((cols - 2 - half - 1))
  printf '%b├%s┴%s┤%b\n' "${SEP}" "$(hline '─' "$left_w")" "$(hline '─' "$right_w")" "${RST}"
}

# ── TELOS refresh (only if older than 5 minutes) ──
refresh_telos() {
  if [ -f "$TELOS_JSON" ]; then
    local age
    age=$(( $(date +%s) - $(stat -c %Y "$TELOS_JSON") ))
  else
    local age=999
  fi
  if [ "$age" -gt 300 ]; then
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
  fi
}

# ── Safe jq reader ──
jq_val() {
  local query="$1" default="${2:-}"
  if [ -f "$TELOS_JSON" ]; then
    local val
    val=$(jq -r "$query // empty" "$TELOS_JSON" 2>/dev/null)
    if [ -n "$val" ] && [ "$val" != "null" ]; then
      echo "$val"
    else
      echo "$default"
    fi
  else
    echo "$default"
  fi
}

# ═══════════════════════════════════════════════════
# ── Main poll function ──
# ═══════════════════════════════════════════════════
poll() {
  clear
  refresh_telos

  local now_time now_date
  now_time=$(date '+%H:%M')
  # Russian month names
  local day month year
  day=$(date '+%-d')
  year=$(date '+%Y')
  case $(date '+%-m') in
    1) month="Янв" ;; 2) month="Фев" ;; 3) month="Мар" ;;
    4) month="Апр" ;; 5) month="Май" ;; 6) month="Июн" ;;
    7) month="Июл" ;; 8) month="Авг" ;; 9) month="Сен" ;;
    10) month="Окт" ;; 11) month="Ноя" ;; 12) month="Дек" ;;
  esac
  now_date=$(printf '%02d %s %s' "$day" "$month" "$year")

  # ═══════════════════════════════════════════════════
  # ── 1. Header ──
  # ═══════════════════════════════════════════════════
  box_top
  local header_left header_right
  header_left=$(printf '%b%b⬢ PAI COMMAND CENTER%b' "$VIO" "$BLD" "$RST")
  header_right=$(printf '%b%s %s%b  %b↻ %sс%b' "$WHT" "$now_date" "$now_time" "$RST" "$DIM" "$INTERVAL" "$RST")
  box_line "$(printf '%s                             %s' "$header_left" "$header_right")"
  box_bot

  # ═══════════════════════════════════════════════════
  # ── 2. Two-column: СИСТЕМА + AI БРИГАДА ──
  # ═══════════════════════════════════════════════════
  box_top
  two_col \
    "$(printf '%b%b СИСТЕМА%b' "$CYN" "$BLD" "$RST")" \
    "$(printf '%b%b AI БРИГАДА%b' "$VIO" "$BLD" "$RST")"
  two_col_mid

  # -- Left: System health --
  local hook_count test_count events_24h events_7d
  hook_count=$(jq_val '.system.hookCount' '?')
  test_count=$(jq_val '.system.testCount' '?')
  events_24h=$(jq_val '.system.eventCount24h' '?')
  events_7d=$(jq_val '.system.eventCount7d' '?')

  # VoiceServer check
  local vs_icon
  local vs_http
  vs_http=$(curl -s --max-time 2 -o /dev/null -w "%{http_code}" "http://localhost:8888/" 2>/dev/null)
  if [ "$vs_http" = "200" ]; then
    vs_icon=$(printf '%b✅%b' "$GRN" "$RST")
  else
    vs_icon=$(printf '%b❌%b' "$RED" "$RST")
  fi

  # Agent Zero check
  local a0_icon a0_latency_str a0_latency_val=""
  local a0_start a0_end a0_json
  a0_start=$(date +%s%N)
  a0_json=$(curl -s --max-time 10 "$A0_HEALTH_URL" 2>/dev/null)
  a0_end=$(date +%s%N)
  if [ -n "$a0_json" ]; then
    a0_latency_val=$(( (a0_end - a0_start) / 1000000 ))
    if [ "$a0_latency_val" -lt 2000 ]; then
      a0_icon=$(printf '%b✅%b' "$GRN" "$RST")
    else
      a0_icon=$(printf '%b⚠%b' "$YLW" "$RST")
    fi
    a0_latency_str="${a0_latency_val}ms"
  else
    a0_icon=$(printf '%b❌%b' "$RED" "$RST")
    a0_latency_str="timeout"
  fi

  # Z.AI / Gemini key checks
  local zai_icon gemini_icon
  if [ -n "$ZAI_API_KEY" ]; then
    zai_icon=$(printf '%b✅ Key set%b' "$GRN" "$RST")
  else
    zai_icon=$(printf '%b⚠ No key%b' "$YLW" "$RST")
  fi
  if [ -n "$GEMINI_API_KEY" ]; then
    gemini_icon=$(printf '%b✅ Key set%b' "$GRN" "$RST")
  else
    gemini_icon=$(printf '%b⚠ No key%b' "$YLW" "$RST")
  fi

  # -- Right: AI brigade --
  # Jules open PRs (cache for reuse in PR section)
  local jules_pr_json jules_prs="?"
  jules_pr_json=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --json number,title --limit 5 2>/dev/null)
  jules_prs=$(echo "$jules_pr_json" | jq 'length' 2>/dev/null || echo "?")

  # AutoMerge stats
  local am_merged am_failed am_skipped
  am_merged=$(jq_val '.system.automerge.merged' '0')
  am_failed=$(jq_val '.system.automerge.failed' '0')
  am_skipped=$(jq_val '.system.automerge.skipped' '0')

  # Gemini CLI
  local gemini_cli_icon
  if command -v gemini >/dev/null 2>&1; then
    gemini_cli_icon=$(printf '%b✅%b' "$GRN" "$RST")
  else
    gemini_cli_icon=$(printf '%b❌%b' "$RED" "$RST")
  fi

  # Render rows
  two_col \
    "$(printf '%bPAI%b    %b%bv4.0.3%b  %b%s хуков  %s тестов%b' "$SLT" "$RST" "$WHT" "$BLD" "$RST" "$SLT" "$hook_count" "$test_count" "$RST")" \
    "$(printf '%bNavi%b   %b✅ Claude Code%b' "$SLT" "$RST" "$GRN" "$RST")"

  two_col \
    "$(printf '%bVoice%b  %s  %b:8888%b' "$SLT" "$RST" "$vs_icon" "$SLT" "$RST")" \
    "$(printf '%bJules%b  %bPR:%b %b%b%s%b %bоткрыто%b' "$SLT" "$RST" "$SLT" "$RST" "$YLW" "$BLD" "$jules_prs" "$RST" "$SLT" "$RST")"

  two_col \
    "$(printf '%bA0%b     %s  %b%s%b' "$SLT" "$RST" "$a0_icon" "$SLT" "$a0_latency_str" "$RST")" \
    "$(printf '%bMerge%b  %b+%s%b %b✗%s%b %b~%s%b' "$SLT" "$RST" "$GRN" "$am_merged" "$RST" "$RED" "$am_failed" "$RST" "$SLT" "$am_skipped" "$RST")"

  two_col \
    "$(printf '%bZ.AI%b   %s' "$SLT" "$RST" "$zai_icon")" \
    "$(printf '%bGemini%b %s  %bCLI%b %s' "$SLT" "$RST" "$gemini_icon" "$SLT" "$RST" "$gemini_cli_icon")"

  two_col_bot
  printf "\n"

  # ═══════════════════════════════════════════════════
  # ── 3. АКТИВНЫЕ СЕССИИ ──
  # ═══════════════════════════════════════════════════
  box_top
  box_line "$(printf '%b%b АКТИВНЫЕ СЕССИИ%b' "$BLU" "$BLD" "$RST")"
  printf '%b├%s┤%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"

  # Parse recent WORK directories (last 5 with META.yaml)
  local session_count=0
  if [ -d "$WORK_DIR" ]; then
    while IFS= read -r meta_file; do
      [ "$session_count" -ge 5 ] && break
      local s_title s_status s_created s_dir s_age_str
      s_dir=$(dirname "$meta_file")
      s_title=$(grep '^title:' "$meta_file" 2>/dev/null | sed 's/^title: *//; s/^"//; s/"$//')
      s_status=$(grep '^status:' "$meta_file" 2>/dev/null | sed 's/^status: *//; s/^"//; s/"$//')
      s_created=$(grep '^created_at:' "$meta_file" 2>/dev/null | sed 's/^created_at: *//; s/^"//; s/"$//')
      [ -z "$s_title" ] && continue

      # Age calculation
      local s_epoch now_epoch s_ago
      now_epoch=$(date +%s)
      s_epoch=$(date -d "$s_created" +%s 2>/dev/null || echo "$now_epoch")
      s_ago=$(( (now_epoch - s_epoch) / 3600 ))
      if [ "$s_ago" -lt 1 ]; then
        s_age_str="<1ч"
      elif [ "$s_ago" -lt 24 ]; then
        s_age_str="${s_ago}ч"
      else
        s_age_str="$(( s_ago / 24 ))д"
      fi

      # Status icon
      local s_icon
      case "$s_status" in
        ACTIVE)    s_icon=$(printf '%b⚡%b' "$YLW" "$RST") ;;
        COMPLETED) s_icon=$(printf '%b✅%b' "$GRN" "$RST") ;;
        *)         s_icon=$(printf '%b○%b' "$SLT" "$RST") ;;
      esac

      # Truncate title
      local name_max=$((cols - 24))
      local short_title="${s_title:0:$name_max}"

      box_line "$(printf '%s %b%-*s%b %b%4s%b %b%s%b' "$s_icon" "$WHT" "$name_max" "$short_title" "$RST" "$SLT" "$s_age_str" "$RST" "$SLT" "$s_status" "$RST")"
      session_count=$((session_count + 1))
    done < <(find "$WORK_DIR" -maxdepth 2 -name "META.yaml" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -8 | awk '{print $2}')
  fi

  if [ "$session_count" -eq 0 ]; then
    box_line "$(printf '%bНет активных сессий%b' "$SLT" "$RST")"
  fi
  box_bot
  printf "\n"

  # ═══════════════════════════════════════════════════
  # ── 4. PULL REQUESTS ──
  # ═══════════════════════════════════════════════════
  box_top
  box_line "$(printf '%b%b PULL REQUESTS%b' "$ORG" "$BLD" "$RST")"
  printf '%b├%s┤%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"

  # Fetch open PRs from both repos
  local has_prs=false

  # Private repo PRs (Jules) — reuse cached data from section 2
  if [ -n "$jules_pr_json" ] && [ "$jules_pr_json" != "[]" ]; then
    has_prs=true
    echo "$jules_pr_json" | jq -r '.[] | "#\(.number)|\(.title)"' 2>/dev/null | while IFS='|' read -r pr_num pr_title; do
      local pr_max=$((cols - 28))
      local short_pr="${pr_title:0:$pr_max}"
      box_line "$(printf '%b%-6s%b %b%-*s%b %bprivate%b' "$YLW" "$pr_num" "$RST" "$WHT" "$pr_max" "$short_pr" "$RST" "$SLT" "$RST")"
    done
  fi

  # Public repo PRs (upstream)
  local public_pr_json
  public_pr_json=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI --state open --json number,title --limit 5 2>/dev/null)
  if [ -n "$public_pr_json" ] && [ "$public_pr_json" != "[]" ]; then
    has_prs=true
    echo "$public_pr_json" | jq -r '.[] | "#\(.number)|\(.title)"' 2>/dev/null | while IFS='|' read -r pr_num pr_title; do
      local pr_max=$((cols - 28))
      local short_pr="${pr_title:0:$pr_max}"
      box_line "$(printf '%b%-6s%b %b%-*s%b %bpublic%b' "$CYN" "$pr_num" "$RST" "$WHT" "$pr_max" "$short_pr" "$RST" "$SLT" "$RST")"
    done
  fi

  if [ "$has_prs" = false ]; then
    box_line "$(printf '%bНет открытых PR%b' "$SLT" "$RST")"
  fi
  box_bot
  printf "\n"

  # ═══════════════════════════════════════════════════
  # ── 5. Two-column: ХУКИ & ТЕСТЫ + ЗАДАЧИ ──
  # ═══════════════════════════════════════════════════
  box_top
  two_col \
    "$(printf '%b%b ХУКИ & ТЕСТЫ%b' "$CYN" "$BLD" "$RST")" \
    "$(printf '%b%b АВТОМЕРЖ%b' "$VIO" "$BLD" "$RST")"
  two_col_mid

  # Left: hook health
  local hook_file_count test_file_count
  hook_file_count=$(find "$HOOKS_DIR" -maxdepth 1 -name "*.hook.ts" 2>/dev/null | wc -l)
  test_file_count=$(find "$HOOKS_TESTS" -maxdepth 1 -name "*.test.ts" 2>/dev/null | wc -l)

  # Right: AutoMerge pipeline stats (from JSON directly, not telos-state)
  local am_total am_merged_d am_failed_d am_skipped_d am_last
  if [ -f "$AUTOMERGE_JSON" ]; then
    am_total=$(jq '.processedSessions | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_merged_d=$(jq '[.processedSessions[] | select(.result == "merged")] | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_failed_d=$(jq '[.processedSessions[] | select(.result | startswith("failed"))] | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_skipped_d=$(jq '[.processedSessions[] | select(.result == "skipped")] | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_last=$(jq -r '.lastCheck // empty' "$AUTOMERGE_JSON" 2>/dev/null | head -c 16 | sed 's/T/ /')
  else
    am_total=0; am_merged_d=0; am_failed_d=0; am_skipped_d=0; am_last="—"
  fi

  two_col \
    "$(printf '%bХуков%b   %b%b%s%b %bфайлов%b' "$SLT" "$RST" "$WHT" "$BLD" "$hook_file_count" "$RST" "$SLT" "$RST")" \
    "$(printf '%bВсего%b   %b%b%s%b %bсессий%b' "$SLT" "$RST" "$WHT" "$BLD" "$am_total" "$RST" "$SLT" "$RST")"

  two_col \
    "$(printf '%bТестов%b  %b%b%s%b %bсьютов%b' "$SLT" "$RST" "$WHT" "$BLD" "$test_file_count" "$RST" "$SLT" "$RST")" \
    "$(printf '%b+%s%b %b✗%s%b %b~%s%b' "$GRN" "$am_merged_d" "$RST" "$RED" "$am_failed_d" "$RST" "$SLT" "$am_skipped_d" "$RST")"

  two_col \
    "$(printf '%bEvents%b  %b24ч:%b%b%b%s%b  %b7д:%b%b%b%s%b' "$SLT" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$events_24h" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$events_7d" "$RST")" \
    "$(printf '%bПосл:%b %b%s%b' "$SLT" "$RST" "$WHT" "$am_last" "$RST")"

  two_col_bot

  # ═══════════════════════════════════════════════════
  # ── 6. Tab navigation footer ──
  # ═══════════════════════════════════════════════════
  printf "\n"
  local tab_str=""
  tab_str+="${YLW}${BLD}1${RST}${SLT}TELOS${RST}  "
  tab_str+="${YLW}${BLD}2${RST}${SLT}Center${RST}  "
  tab_str+="${CYN}${BLD}3${RST}${SLT}Brigade${RST}  "
  tab_str+="${CYN}${BLD}4${RST}${SLT}Infra${RST}  "
  tab_str+="${GRN}${BLD}5${RST}${SLT}PAI${RST}  "
  tab_str+="${GRN}${BLD}6${RST}${SLT}Projects${RST}"
  box_top
  box_line "$tab_str"
  box_bot
  printf ' %b%s │ ↻ %sс │ r = обновить │ q = выход%b\n' "$SLT" "$(date '+%H:%M')" "$INTERVAL" "$RST"
}

# ── Initial poll ──
poll

# ── Main loop with interruptible sleep ──
while true; do
  for ((i=INTERVAL; i>0; i--)); do
    read -rsn1 -t1 key
    case "$key" in
      r|R) break ;;
      q|Q) exit 0 ;;
    esac
  done
  poll
done
