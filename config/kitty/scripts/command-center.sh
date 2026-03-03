#!/bin/bash
# PAI Command Center — Live Dashboard for Kitty (Tab 2: ⬢ Center)
# Polls: system health, AI brigade, TELOS goals, decisions, wins
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
  # Jules open PRs
  local jules_prs="?"
  jules_prs=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --json number 2>/dev/null | jq 'length' 2>/dev/null || echo "?")

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

  two_col \
    "$(printf '%bEvents%b %b24ч:%b%b%b%s%b %b7д:%b%b%b%s%b' "$SLT" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$events_24h" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$events_7d" "$RST")" \
    ""

  two_col_bot
  printf "\n"

  # ═══════════════════════════════════════════════════
  # ── 3. АКТИВНЫЕ ЦЕЛИ ──
  # ═══════════════════════════════════════════════════
  box_top
  box_line "$(printf '%b%b АКТИВНЫЕ ЦЕЛИ%b' "$GRN" "$BLD" "$RST")"
  printf '%b├%s┤%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"

  if [ -f "$TELOS_JSON" ]; then
    # Extract active goals (status contains "Активна")
    local goal_count
    goal_count=$(jq '[.goals[] | select(.status | test("Активна"))] | length' "$TELOS_JSON" 2>/dev/null || echo 0)

    if [ "$goal_count" -gt 0 ]; then
      jq -r '.goals[] | select(.status | test("Активна")) | "\(.id)|\(.name)|\(.progress)|\(.checked)/\(.total)"' "$TELOS_JSON" 2>/dev/null | while IFS='|' read -r gid gname gpct gchecked; do
        local bar
        bar=$(progress_bar "$gpct" 16)
        local pct_color="$DIM"
        if [ "$gpct" -gt 50 ]; then pct_color="$GRN"
        elif [ "$gpct" -gt 0 ]; then pct_color="$YLW"
        fi
        # Truncate name to fit
        local name_max=$((cols - 38))
        local short_name="${gname:0:$name_max}"
        box_line "$(printf '%b%s%b %s %b%3d%%%b %b[%s]%b %b%s%b' "$CYN" "$gid" "$RST" "$bar" "$pct_color" "$gpct" "$RST" "$DIM" "$gchecked" "$RST" "$SLT" "$short_name" "$RST")"
      done
    else
      box_line "$(printf '%bНет активных целей%b' "$DIM" "$RST")"
    fi

    # Show blockers inline
    local blocker_count
    blocker_count=$(jq '.status.blockers | length' "$TELOS_JSON" 2>/dev/null || echo 0)
    if [ "$blocker_count" -gt 0 ]; then
      printf '%b├%s┤%b\n' "${SEP}" "$(hline '─' $((cols - 2)))" "${RST}"
      box_line "$(printf '%b%b⚠ БЛОКЕРЫ%b' "$RED" "$BLD" "$RST")"
      jq -r '.status.blockers[] | "\(.blocker)|\(.urgency)"' "$TELOS_JSON" 2>/dev/null | while IFS='|' read -r btxt burgency; do
        local bcolor="$YLW"
        if [ "$burgency" = "Высокая" ]; then bcolor="$RED"; fi
        local bmax=$((cols - 18))
        local short_b="${btxt:0:$bmax}"
        box_line "$(printf '%b▸%b %b%s%b %b[%s]%b' "$bcolor" "$RST" "$WHT" "$short_b" "$RST" "$bcolor" "$burgency" "$RST")"
      done
    fi
  else
    box_line "$(printf '%bЗагрузка...%b' "$DIM" "$RST")"
  fi
  box_bot
  printf "\n"

  # ═══════════════════════════════════════════════════
  # ── 4. Two-column: РЕШЕНИЯ + ПОБЕДЫ ──
  # ═══════════════════════════════════════════════════
  box_top
  two_col \
    "$(printf '%b%b РЕШЕНИЯ%b' "$YLW" "$BLD" "$RST")" \
    "$(printf '%b%b ПОБЕДЫ%b' "$GRN" "$BLD" "$RST")"
  two_col_mid

  # Left: decisions / season countdown
  local season_label days_remaining elapsed_pct
  season_label=$(jq_val '.season.seasonLabel' '?')
  days_remaining=$(jq_val '.season.daysRemaining' '?')
  elapsed_pct=$(jq_val '.season.elapsedPercent' '0')

  # Season bar
  local season_bar
  season_bar=$(progress_bar "$elapsed_pct" 12)

  # Right: last 5 wins
  local wins_raw
  wins_raw=""
  if [ -f "$TELOS_JSON" ]; then
    wins_raw=$(jq -r '.status.recentWins[:5][] | "\(.date)|\(.win)"' "$TELOS_JSON" 2>/dev/null)
  fi

  # Build arrays for parallel rendering
  local -a left_lines=()
  local -a right_lines=()

  # Left lines: season + blockers as decisions
  left_lines+=("$(printf '%b%s%b %s %b%sд%b' "$CYN" "$season_label" "$RST" "$season_bar" "$YLW" "$days_remaining" "$RST")")

  if [ -f "$TELOS_JSON" ]; then
    local bcount
    bcount=$(jq '.status.blockers | length' "$TELOS_JSON" 2>/dev/null || echo 0)
    local bi=0
    while [ "$bi" -lt "$bcount" ] && [ "$bi" -lt 4 ]; do
      local bnext
      bnext=$(jq -r ".status.blockers[$bi].next // empty" "$TELOS_JSON" 2>/dev/null)
      if [ -n "$bnext" ]; then
        local short_next="${bnext:0:$((half - 6))}"
        left_lines+=("$(printf '%b▸%b %b%s%b' "$YLW" "$RST" "$WHT" "$short_next" "$RST")")
      fi
      bi=$((bi + 1))
    done
  fi

  # Right lines: wins
  if [ -n "$wins_raw" ]; then
    while IFS='|' read -r _wdate wtext; do
      local short_win="${wtext:0:$((half - 4))}"
      right_lines+=("$(printf '%b✓%b %b%s%b' "$GRN" "$RST" "$WHT" "$short_win" "$RST")")
    done <<< "$wins_raw"
  fi

  # Render both columns, matching row count
  local max_rows=${#left_lines[@]}
  if [ ${#right_lines[@]} -gt "$max_rows" ]; then
    max_rows=${#right_lines[@]}
  fi

  local ri=0
  while [ "$ri" -lt "$max_rows" ]; do
    local lc="${left_lines[$ri]:-}"
    local rc="${right_lines[$ri]:-}"
    two_col "$lc" "$rc"
    ri=$((ri + 1))
  done

  two_col_bot

  # ═══════════════════════════════════════════════════
  # ── 5. Tab navigation footer ──
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
