#!/bin/bash
# TELOS Dashboard — Strategic Life Overview for Kitty (Tab 7)
# Data: telos-state.json (pre-computed by TelosParser.ts)
# Refresh: every 60 seconds | r = refresh now | q = quit

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"

STATE_FILE="$HOME/.claude/MEMORY/STATE/telos-state.json"
TELOS_PARSER="$HOME/.claude/PAI/Tools/TelosParser.ts"

INTERVAL=60
W=96  # target content width

# ── Colors (24-bit RGB — PAI palette, same as brigade-watch.sh) ──
RST='\e[0m'; BLD='\e[1m'; DIM='\e[2m'
GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'
YLW='\e[38;2;251;191;36m'
CYN='\e[38;2;103;232;249m'
SLT='\e[38;2;148;163;184m'
SEP='\e[38;2;71;85;105m'
# BLU='\e[38;2;59;130;246m'
VIO='\e[38;2;167;139;250m'
WHT='\e[38;2;203;213;225m'
ORG='\e[38;2;251;146;60m'

# ── Helpers ──

progress_bar() {
  local pct=${1:-0} width=${2:-16}
  local filled=$(( pct * width / 100 ))
  local empty=$(( width - filled ))
  [ "$filled" -gt 0 ] && printf '%s' "$(printf '█%.0s' $(seq 1 "$filled"))"
  [ "$empty"  -gt 0 ] && printf '%s' "$(printf '░%.0s' $(seq 1 "$empty"))"
}

# Box drawing helpers
box_top() {
  local label="$1" w=${2:-$W}
  local label_len=${#label}
  local pad=$(( w - label_len - 4 ))
  [ "$pad" -lt 1 ] && pad=1
  printf "%b┌─ %s " "$SEP" "$label"
  printf '─%.0s' $(seq 1 "$pad")
  printf "┐%b\n" "$RST"
}

box_bottom() {
  local w=$W
  printf "%b└" "$SEP"
  printf '─%.0s' $(seq 1 $(( w - 1 )))
  printf "┘%b\n" "$RST"
}

box_line() {
  # Print a line inside a box, auto-padded to width
  local content="$1" w=${2:-$W}
  printf "%b│%b  %s%b\n" "$SEP" "$RST" "$content" "$RST"
}

# Goal name shortening
short_goal() {
  local gid="$1"
  case "$gid" in
    G0)  echo "Цифровой Прораб" ;;
    G1)  echo "Timber Frame" ;;
    G2)  echo "Orchestrator" ;;
    G3)  echo "Фин. независ." ;;
    G4)  echo "Шале" ;;
    G5)  echo "Квартира" ;;
    G6)  echo "A0T" ;;
    G7)  echo "Земля Былым" ;;
    G8)  echo "Акции" ;;
    G9)  echo "Инфра интернет" ;;
    G10) echo "Аудит скиллов" ;;
    G11) echo "PAI community" ;;
    G12) echo "RU Metrics" ;;
    *)   echo "$gid" ;;
  esac
}

# Status emoji for goals
goal_emoji() {
  local status="$1"
  case "$status" in
    *"Активна"*|*"активная"*|*"непрерывная"*) echo "🟢" ;;
    *"К действию"*)                             echo "🟡" ;;
    *"Планирование"*)                           echo "🟡" ;;
    *"Заморожено"*)                              echo "❄️" ;;
    *"Идея"*)                                    echo "💡" ;;
    *)                                           echo "⚪" ;;
  esac
}

# Goal status sort key (lower = higher priority)
goal_sort_key() {
  local status="$1" progress="$2"
  case "$status" in
    *"Активна"*|*"активная"*|*"непрерывная"*) printf "%03d" $(( 100 - progress )) ;;
    *"К действию"*)                             printf "1%03d" $(( 100 - progress )) ;;
    *"Планирование"*)                           printf "2%03d" $(( 100 - progress )) ;;
    *"Заморожено"*)                              printf "3%03d" $(( 100 - progress )) ;;
    *"Идея"*)                                    printf "4%03d" $(( 100 - progress )) ;;
    *)                                           printf "5%03d" $(( 100 - progress )) ;;
  esac
}

# Severity color for challenges
severity_icon() {
  case "$1" in
    high)   printf "%b🔴%b" "$RED" "$RST" ;;
    medium) printf "%b🟡%b" "$YLW" "$RST" ;;
    low)    printf "%b🟢%b" "$GRN" "$RST" ;;
    *)      printf "⚪" ;;
  esac
}

# Effectiveness icon for strategies
effect_icon() {
  case "$1" in
    working) printf "✅" ;;
    partial) printf "⚡" ;;
    unknown) printf "⚪" ;;
    *)       printf "⚪" ;;
  esac
}

# Format amount in thousands
fmt_k() {
  local amt=${1:-0}
  if [ "$amt" -ge 1000000 ]; then
    printf "%.1fM" "$(echo "scale=1; $amt / 1000000" | bc)"
  elif [ "$amt" -ge 1000 ]; then
    printf "%dK" $(( amt / 1000 ))
  else
    printf "%d" "$amt"
  fi
}

# Refresh telos-state.json if older than 5 minutes
maybe_refresh_state() {
  if [ ! -f "$STATE_FILE" ]; then
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
    return
  fi
  local age now file_mtime
  now=$(date +%s)
  file_mtime=$(stat -c %Y "$STATE_FILE" 2>/dev/null || echo "$now")
  age=$(( now - file_mtime ))
  if [ "$age" -gt 300 ]; then
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
  fi
}

# ── Main poll function ──
poll() {
  clear
  maybe_refresh_state

  local now
  now=$(date '+%H:%M:%S')

  # Check if state file exists and is valid JSON
  if [ ! -f "$STATE_FILE" ] || ! jq empty "$STATE_FILE" 2>/dev/null; then
    printf "%b┌──────────────────────────────────────────────────────────────────────────────────────────────┐%b\n" "$SEP" "$RST"
    printf "%b│%b  %b%bТЕЛОС%b  %bЗагрузка...%b                                                                      %b│%b\n" "$SEP" "$RST" "$VIO" "$BLD" "$RST" "$DIM" "$RST" "$SEP" "$RST"
    printf "%b└──────────────────────────────────────────────────────────────────────────────────────────────┘%b\n" "$SEP" "$RST"
    return
  fi

  # ═══════════════════════════════════════════════════════════
  # Section 1: HEADER with seasonal countdown
  # ═══════════════════════════════════════════════════════════
  local season_label days_remaining elapsed_pct
  season_label=$(jq -r '.season.seasonLabel // "—"' "$STATE_FILE")
  days_remaining=$(jq -r '.season.daysRemaining // 0' "$STATE_FILE")
  elapsed_pct=$(jq -r '.season.elapsedPercent // 0' "$STATE_FILE")

  # Season icon
  local season_icon
  case "$(jq -r '.season.current // ""' "$STATE_FILE")" in
    offseason) season_icon="❄" ;;
    season)    season_icon="☀" ;;
    *)         season_icon="📅" ;;
  esac

  # Countdown bar (12 chars)
  local cb_filled=$(( elapsed_pct * 12 / 100 ))
  local cb_empty=$(( 12 - cb_filled ))
  local countdown_bar=""
  [ "$cb_filled" -gt 0 ] && countdown_bar+=$(printf '█%.0s' $(seq 1 "$cb_filled"))
  [ "$cb_empty"  -gt 0 ] && countdown_bar+=$(printf '░%.0s' $(seq 1 "$cb_empty"))

  printf "%b┌──────────────────────────────────────────────────────────────────────────────────────────────────┐%b\n" "$SEP" "$RST"
  printf "%b│%b  %b%b🎯 TELOS%b          %b%s %s%b %b│%b До сезона: %b%s%b %b%sд%b (%b%s%%%b)             %b↻ %sс%b     %b│%b\n" \
    "$SEP" "$RST" "$VIO" "$BLD" "$RST" "$CYN" "$season_icon" "$season_label" "$RST" "$SEP" "$RST" \
    "$YLW" "$countdown_bar" "$RST" "$WHT" "$days_remaining" "$RST" "$SLT" "$elapsed_pct" "$RST" \
    "$DIM" "$INTERVAL" "$RST" "$SEP" "$RST"
  printf "%b└──────────────────────────────────────────────────────────────────────────────────────────────────┘%b\n" "$SEP" "$RST"

  # ═══════════════════════════════════════════════════════════
  # Section 2: МИССИИ (full-width)
  # ═══════════════════════════════════════════════════════════
  box_top "🎯 МИССИИ"

  local mission_count
  mission_count=$(jq '.missions | length' "$STATE_FILE")

  for (( mi=0; mi<mission_count; mi++ )); do
    local m_id m_name m_progress m_goals_str
    m_id=$(jq -r ".missions[$mi].id" "$STATE_FILE")
    m_name=$(jq -r ".missions[$mi].name" "$STATE_FILE")
    m_progress=$(jq -r ".missions[$mi].progress // 0" "$STATE_FILE")

    # Build linked goals string
    m_goals_str=""
    local lg_count
    lg_count=$(jq ".missions[$mi].linkedGoals | length" "$STATE_FILE")
    for (( gi=0; gi<lg_count; gi++ )); do
      local g_id g_progress
      g_id=$(jq -r ".missions[$mi].linkedGoals[$gi]" "$STATE_FILE")
      g_progress=$(jq -r ".goals[] | select(.id==\"$g_id\") | .progress // 0" "$STATE_FILE")
      [ -n "$m_goals_str" ] && m_goals_str+=" "
      m_goals_str+="${g_id}(${g_progress}%)"
    done

    # Progress bar (16 chars)
    local bar
    bar=$(progress_bar "$m_progress" 16)

    # Color based on progress
    local pcolor="$SLT"
    [ "$m_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$m_progress" -ge 50 ] && pcolor="$GRN"

    printf "%b│%b  %b%-3s%b %b%-20s%b %b%s%b  %b%3d%%%b  %b<- %s%b\n" \
      "$SEP" "$RST" "$CYN" "$m_id" "$RST" "$WHT" "$m_name" "$RST" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$m_progress" "$RST" \
      "$SLT" "$m_goals_str" "$RST"
  done

  box_bottom

  # ═══════════════════════════════════════════════════════════
  # Section 3: Two-column — ВСЕ ЦЕЛИ + КАПИТАЛ
  # ═══════════════════════════════════════════════════════════

  # --- Left column: goals (sorted) ---
  local -a left_goals=()

  # Build sortable array: "sortkey|index"
  local goal_count
  goal_count=$(jq '.goals | length' "$STATE_FILE")
  local -a goal_sorted=()

  for (( gi=0; gi<goal_count; gi++ )); do
    local g_status g_progress sk
    g_status=$(jq -r ".goals[$gi].status" "$STATE_FILE")
    g_progress=$(jq -r ".goals[$gi].progress // 0" "$STATE_FILE")
    sk=$(goal_sort_key "$g_status" "$g_progress")
    goal_sorted+=("${sk}|${gi}")
  done

  # Sort
  mapfile -t goal_sorted < <(printf "%s\n" "${goal_sorted[@]}" | sort)

  left_goals+=("$(printf "%b%b ВСЕ ЦЕЛИ (%s)%b" "$CYN" "$BLD" "$goal_count" "$RST")")
  left_goals+=("$(printf "%b%s%b" "$SEP" "──────────────────────────────────────────────" "$RST")")

  for entry in "${goal_sorted[@]}"; do
    local idx=${entry#*|}
    local g_id g_status g_progress emoji sname bar pcolor
    g_id=$(jq -r ".goals[$idx].id" "$STATE_FILE")
    g_status=$(jq -r ".goals[$idx].status" "$STATE_FILE")
    g_progress=$(jq -r ".goals[$idx].progress // 0" "$STATE_FILE")
    emoji=$(goal_emoji "$g_status")
    sname=$(short_goal "$g_id")
    bar=$(progress_bar "$g_progress" 10)

    pcolor="$SLT"
    [ "$g_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$g_progress" -ge 50 ] && pcolor="$GRN"

    left_goals+=("$(printf " %s %b%-3s%b %b%-17s%b %b%s%b %b%3d%%%b" \
      "$emoji" "$CYN" "$g_id" "$RST" "$WHT" "$sname" "$RST" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$g_progress" "$RST")")
  done

  # --- Right column: capital ---
  local -a right_capital=()
  local total_cap
  total_cap=$(jq -r '.capital.total // 0' "$STATE_FILE")
  local total_fmt
  total_fmt=$(fmt_k "$total_cap")

  right_capital+=("$(printf "%b%b КАПИТАЛ: %s%b" "$ORG" "$BLD" "$total_fmt" "$RST")")
  right_capital+=("$(printf "%b%s%b" "$SEP" "──────────────────────────────────────────────" "$RST")")

  local alloc_count
  alloc_count=$(jq '.capital.allocations | length' "$STATE_FILE")

  for (( ai=0; ai<alloc_count; ai++ )); do
    local a_name a_amount a_percent a_priority
    a_name=$(jq -r ".capital.allocations[$ai].name" "$STATE_FILE")
    a_amount=$(jq -r ".capital.allocations[$ai].amount // 0" "$STATE_FILE")
    a_percent=$(jq -r ".capital.allocations[$ai].percent // 0" "$STATE_FILE")
    a_priority=$(jq -r ".capital.allocations[$ai].priority // \"\"" "$STATE_FILE")

    local a_fmt bar_w cap_bar
    a_fmt=$(fmt_k "$a_amount")
    bar_w=$(( a_percent * 22 / 100 ))
    [ "$bar_w" -lt 1 ] && [ "$a_percent" -gt 0 ] && bar_w=1
    cap_bar=""
    [ "$bar_w" -gt 0 ] && cap_bar=$(printf '█%.0s' $(seq 1 "$bar_w"))
    local cap_empty=$(( 22 - bar_w ))
    [ "$cap_empty" -gt 0 ] && cap_bar+=$(printf '░%.0s' $(seq 1 "$cap_empty"))

    # Color: reserve=DIM, top priority=ORG, rest=WHT
    local cap_color="$WHT"
    [[ "$a_name" == *"Резерв"* ]] && cap_color="$DIM"
    [[ "$a_priority" == "1"* ]]   && cap_color="$ORG"

    right_capital+=("$(printf " %b%-14s%b %b%s%b %b%6s%b %b%2d%%%b" \
      "$cap_color" "${a_name:0:14}" "$RST" \
      "$cap_color" "$cap_bar" "$RST" \
      "$WHT" "$a_fmt" "$RST" \
      "$SLT" "$a_percent" "$RST")")
  done

  # Paste two columns together
  local max_lines=${#left_goals[@]}
  [ ${#right_capital[@]} -gt "$max_lines" ] && max_lines=${#right_capital[@]}

  printf "\n"
  for (( li=0; li<max_lines; li++ )); do
    local lline="${left_goals[$li]:-}"
    local rline="${right_capital[$li]:-}"
    if [ -n "$lline" ] && [ -n "$rline" ]; then
      printf "  %-48b %b│%b %b\n" "$lline" "$SEP" "$RST" "$rline"
    elif [ -n "$lline" ]; then
      printf "  %b\n" "$lline"
    else
      printf "  %-48s %b│%b %b\n" "" "$SEP" "$RST" "$rline"
    fi
  done

  # ═══════════════════════════════════════════════════════════
  # Section 4: Two-column — ВЫЗОВЫ + СТРАТЕГИИ
  # ═══════════════════════════════════════════════════════════
  printf "\n"

  local -a left_challenges=()
  local -a right_strategies=()

  # --- Left: Challenges ---
  local ch_count
  ch_count=$(jq '.challenges | length' "$STATE_FILE")

  left_challenges+=("$(printf "%b%b ВЫЗОВЫ (%s)%b" "$RED" "$BLD" "$ch_count" "$RST")")
  left_challenges+=("$(printf "%b%s%b" "$SEP" "──────────────────────────────────────────────" "$RST")")

  for (( ci=0; ci<ch_count; ci++ )); do
    local c_id c_name c_severity c_linked
    c_id=$(jq -r ".challenges[$ci].id" "$STATE_FILE")
    c_name=$(jq -r ".challenges[$ci].name" "$STATE_FILE")
    c_severity=$(jq -r ".challenges[$ci].severity // \"medium\"" "$STATE_FILE")

    # Linked strategies
    c_linked=""
    local ls_count
    ls_count=$(jq ".challenges[$ci].linkedStrategies | length" "$STATE_FILE")
    for (( si=0; si<ls_count; si++ )); do
      local s_id
      s_id=$(jq -r ".challenges[$ci].linkedStrategies[$si]" "$STATE_FILE")
      [ -n "$c_linked" ] && c_linked+=","
      c_linked+="$s_id"
    done

    local sev_str
    sev_str=$(severity_icon "$c_severity")

    left_challenges+=("$(printf " %s %b%-3s%b %b%-23s%b %b%s%b" \
      "$sev_str" "$CYN" "$c_id" "$RST" "$WHT" "${c_name:0:23}" "$RST" \
      "$SLT" "$c_linked" "$RST")")
  done

  # --- Right: Strategies ---
  local str_count
  str_count=$(jq '.strategies | length' "$STATE_FILE")

  right_strategies+=("$(printf "%b%b СТРАТЕГИИ (%s)%b" "$GRN" "$BLD" "$str_count" "$RST")")
  right_strategies+=("$(printf "%b%s%b" "$SEP" "──────────────────────────────────────────────" "$RST")")

  for (( si=0; si<str_count; si++ )); do
    local s_id s_name s_eff s_addresses_str
    s_id=$(jq -r ".strategies[$si].id" "$STATE_FILE")
    s_name=$(jq -r ".strategies[$si].name" "$STATE_FILE")
    s_eff=$(jq -r ".strategies[$si].effectiveness // \"unknown\"" "$STATE_FILE")

    # Get short name (before parenthesis)
    local s_short="${s_name%%(*}"
    s_short="${s_short%% }"
    [ ${#s_short} -gt 24 ] && s_short="${s_short:0:23}."

    # Addresses
    s_addresses_str=""
    local sa_count
    sa_count=$(jq ".strategies[$si].addresses | length" "$STATE_FILE")
    for (( ai=0; ai<sa_count; ai++ )); do
      local addr
      addr=$(jq -r ".strategies[$si].addresses[$ai]" "$STATE_FILE")
      [ -n "$s_addresses_str" ] && s_addresses_str+=","
      s_addresses_str+="$addr"
    done

    local eff_str
    eff_str=$(effect_icon "$s_eff")

    right_strategies+=("$(printf " %s %b%-3s%b %b%-24s%b %b%s%b" \
      "$eff_str" "$CYN" "$s_id" "$RST" "$WHT" "$s_short" "$RST" \
      "$SLT" "$s_addresses_str" "$RST")")
  done

  # Paste columns
  local max_cs=${#left_challenges[@]}
  [ ${#right_strategies[@]} -gt "$max_cs" ] && max_cs=${#right_strategies[@]}

  for (( li=0; li<max_cs; li++ )); do
    local lline="${left_challenges[$li]:-}"
    local rline="${right_strategies[$li]:-}"
    if [ -n "$lline" ] && [ -n "$rline" ]; then
      printf "  %-48b %b│%b %b\n" "$lline" "$SEP" "$RST" "$rline"
    elif [ -n "$lline" ]; then
      printf "  %b\n" "$lline"
    else
      printf "  %-48s %b│%b %b\n" "" "$SEP" "$RST" "$rline"
    fi
  done

  # ═══════════════════════════════════════════════════════════
  # Section 5: Two-column — (empty left) + ПОБЕДЫ
  # ═══════════════════════════════════════════════════════════
  printf "\n"

  local -a right_wins=()
  right_wins+=("$(printf "%b%b 🏆 ПОБЕДЫ (последние 7)%b" "$GRN" "$BLD" "$RST")")
  right_wins+=("$(printf "%b%s%b" "$SEP" "──────────────────────────────────────────────────────────────────────────────────────────────" "$RST")")

  local win_count
  win_count=$(jq '.status.recentWins | length' "$STATE_FILE")
  local win_start=$(( win_count - 7 ))
  [ "$win_start" -lt 0 ] && win_start=0

  for (( wi=win_start; wi<win_count; wi++ )); do
    local w_text w_date
    w_text=$(jq -r ".status.recentWins[$wi].win" "$STATE_FILE")
    w_date=$(jq -r ".status.recentWins[$wi].date // \"\"" "$STATE_FILE")

    # Truncate win text
    [ ${#w_text} -gt 72 ] && w_text="${w_text:0:71}."

    right_wins+=("$(printf " %b✦%b %b%-10s%b %b%s%b" \
      "$GRN" "$RST" "$SLT" "$w_date" "$RST" "$WHT" "$w_text" "$RST")")
  done

  # Print wins full-width (empty left, full content right)
  for (( li=0; li<${#right_wins[@]}; li++ )); do
    printf "  %b\n" "${right_wins[$li]}"
  done

  # ═══════════════════════════════════════════════════════════
  # Section 6: ДЕРЕВО ЗАВИСИМОСТЕЙ (full-width)
  # ═══════════════════════════════════════════════════════════
  printf "\n"
  box_top "🌳 ДЕРЕВО: МИССИЯ → ЦЕЛИ"

  # Find highest-progress goal that appears in mission links (for star marker)
  local max_goal_progress=0 max_goal_id=""
  local linked_goals_all
  linked_goals_all=$(jq -r '[.missions[].linkedGoals[]] | unique | .[]' "$STATE_FILE")
  for lgid in $linked_goals_all; do
    local gp
    gp=$(jq -r ".goals[] | select(.id==\"$lgid\") | .progress // 0" "$STATE_FILE")
    if [ "$gp" -gt "$max_goal_progress" ]; then
      max_goal_progress=$gp
      max_goal_id=$lgid
    fi
  done

  for (( mi=0; mi<mission_count; mi++ )); do
    local m_id m_name
    m_id=$(jq -r ".missions[$mi].id" "$STATE_FILE")
    m_name=$(jq -r ".missions[$mi].name" "$STATE_FILE")

    local lg_count
    lg_count=$(jq ".missions[$mi].linkedGoals | length" "$STATE_FILE")

    if [ "$lg_count" -eq 0 ]; then
      printf "%b│%b  %b%s %s%b\n" "$SEP" "$RST" "$CYN" "$m_id" "$m_name" "$RST"
      continue
    fi

    # First line: mission name + connector + first goal
    local first_gid first_gprog first_sname first_star=""
    first_gid=$(jq -r ".missions[$mi].linkedGoals[0]" "$STATE_FILE")
    first_gprog=$(jq -r ".goals[] | select(.id==\"$first_gid\") | .progress // 0" "$STATE_FILE")
    first_sname=$(short_goal "$first_gid")
    [ "$first_gid" = "$max_goal_id" ] && [ "$max_goal_progress" -gt 0 ] && first_star=" ★"

    local connector="──"
    [ "$lg_count" -gt 1 ] && connector="┬─"

    # Pad mission label
    local m_label
    m_label=$(printf "%s %-14s" "$m_id" "$m_name")

    printf "%b│%b  %b%s%b %b─%s─%b %b%s %s%b (%b%s%%%b)%b%s%b\n" \
      "$SEP" "$RST" "$CYN" "$m_label" "$RST" \
      "$SEP" "$connector" "$RST" \
      "$WHT" "$first_gid" "$first_sname" "$RST" \
      "$SLT" "$first_gprog" "$RST" \
      "$YLW" "$first_star" "$RST"

    # Remaining goals
    for (( gi=1; gi<lg_count; gi++ )); do
      local g_id g_prog g_sname star=""
      g_id=$(jq -r ".missions[$mi].linkedGoals[$gi]" "$STATE_FILE")
      g_prog=$(jq -r ".goals[] | select(.id==\"$g_id\") | .progress // 0" "$STATE_FILE")
      g_sname=$(short_goal "$g_id")
      [ "$g_id" = "$max_goal_id" ] && [ "$max_goal_progress" -gt 0 ] && star=" ★"

      local branch="├──"
      [ "$gi" -eq $(( lg_count - 1 )) ] && branch="└──"

      # Pad to align with first goal
      local pad_len=${#m_label}
      local pad_str
      pad_str=$(printf '%*s' "$pad_len" "")

      printf "%b│%b  %s %b%s%b %b%s %s%b (%b%s%%%b)%b%s%b\n" \
        "$SEP" "$RST" "$pad_str" \
        "$SEP" "$branch" "$RST" \
        "$WHT" "$g_id" "$g_sname" "$RST" \
        "$SLT" "$g_prog" "$RST" \
        "$YLW" "$star" "$RST"
    done
  done

  box_bottom

  # ── Footer ──
  printf "\n%b" "$SEP"
  printf '━%.0s' $(seq 1 "$W")
  printf "%b\n" "$RST"
  printf "%b %s │ ↻ Обновление через %sс │ r = сейчас │ q = выход%b\n" "$DIM" "$now" "$INTERVAL" "$RST"
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
