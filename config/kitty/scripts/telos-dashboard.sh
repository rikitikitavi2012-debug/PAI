#!/bin/bash
# TELOS Radar — Strategic Life Dashboard for Kitty (Tab 1: 🎯 TELOS)
# Data: telos-state.json (pre-computed by TelosParser.ts)
# Architecture: 5-level hierarchy (Actionable → Progress → Reference)
# Refresh: 300s smart poll (mtime-check) | r = refresh now | q = quit

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

STATE_FILE="$HOME/.claude/MEMORY/STATE/telos-state.json"
TELOS_PARSER="$HOME/.claude/PAI/Tools/TelosParser.ts"
TELOS_DIR="$HOME/.claude/PAI/USER/TELOS"

INTERVAL=300
ITL='\e[3m'
LO_GRN='\e[38;2;134;239;172m' # brighter green for low-value progress bars

# ── Helpers ──

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
    G13) echo "Хим. чист." ;;
    *)   echo "$gid" ;;
  esac
}

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

severity_icon() {
  case "$1" in
    high)   printf "%b🔴%b" "$RED" "$RST" ;;
    medium) printf "%b🟡%b" "$YLW" "$RST" ;;
    low)    printf "%b🟢%b" "$GRN" "$RST" ;;
    *)      printf "⚪" ;;
  esac
}

effect_icon() {
  case "$1" in
    working) printf "✅" ;;
    partial) printf "⚡" ;;
    *)       printf "⚪" ;;
  esac
}

sphere_icon() {
  case "$1" in
    green)  printf "%b●%b" "$GRN" "$RST" ;;
    yellow) printf "%b●%b" "$YLW" "$RST" ;;
    red)    printf "%b●%b" "$RED" "$RST" ;;
    *)      printf "%b●%b" "$SLT" "$RST" ;;
  esac
}

trend_arrow() {
  case "$1" in
    up)   printf "%b↑%b" "$GRN" "$RST" ;;
    down) printf "%b↓%b" "$RED" "$RST" ;;
    *)    printf "%b→%b" "$SLT" "$RST" ;;
  esac
}

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

# Track last known mtime of TELOS source files
LAST_MTIME=0

# Smart refresh: only run TelosParser if source files changed
maybe_refresh_state() {
  if [ ! -f "$STATE_FILE" ]; then
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
    return
  fi

  # Check max mtime across all TELOS source files
  local max_mtime=0
  for f in "$TELOS_DIR"/*.md; do
    [ -f "$f" ] || continue
    local mt
    mt=$(stat -c %Y "$f" 2>/dev/null || echo 0)
    [ "$mt" -gt "$max_mtime" ] && max_mtime=$mt
  done

  # Only reparse if sources changed since last check
  if [ "$max_mtime" -gt "$LAST_MTIME" ]; then
    LAST_MTIME=$max_mtime
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
  fi
}

# ── Flicker-free refresh ──
FIRST_RENDER=true

# ── Main render ──
poll() {
  if [ "$FIRST_RENDER" = true ]; then
    printf '\033[2J\033[H'
    FIRST_RENDER=false
  else
    printf '\033[H\033[J'
  fi
  maybe_refresh_state

  local now
  now=$(date '+%H:%M')

  if [ ! -f "$STATE_FILE" ] || ! timeout 3 jq empty "$STATE_FILE" 2>/dev/null; then
    printf "\n%b  🎯 TELOS RADAR  —  %bЗагрузка...%b\n\n" "$VIO$BLD" "$DIM" "$RST"
    return
  fi

  # ══════════════════════════════════════════════════════════════════
  # HEADER: Season + Spheres + Meta-metrics
  # ══════════════════════════════════════════════════════════════════

  # Batch extract header data (1 jq call)
  local hdr
  hdr=$(jq -r '[
    .season.seasonLabel // "—",
    (.season.daysRemaining // 0 | tostring),
    (.season.elapsedPercent // 0 | tostring),
    .season.current // "",
    (.learning.performanceRating.current // 0 | tostring),
    (.learning.performanceRating.weekAvg // 0 | tostring),
    .learning.performanceRating.trend // "flat",
    (.learning.sessionsWeek // 0 | tostring),
    (.system.eventCount24h // 0 | tostring)
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  local s_label s_days s_pct s_current perf_cur perf_week perf_trend sess_wk evt_24h
  IFS=$'\t' read -r s_label s_days s_pct s_current perf_cur perf_week perf_trend sess_wk evt_24h <<< "$hdr"

  local s_icon="📅"
  [ "$s_current" = "offseason" ] && s_icon="❄"
  [ "$s_current" = "season" ]    && s_icon="☀"

  local cb_filled=$(( s_pct * 12 / 100 ))
  local cb_empty=$(( 12 - cb_filled ))
  local cbar=""
  [ "$cb_filled" -gt 0 ] && cbar+=$(printf '█%.0s' $(seq 1 "$cb_filled"))
  [ "$cb_empty"  -gt 0 ] && cbar+=$(printf '░%.0s' $(seq 1 "$cb_empty"))

  local t_arrow
  t_arrow=$(trend_arrow "$perf_trend")

  # Spheres
  local spheres_str=""
  while IFS=$'\t' read -r sp_name sp_color; do
    local sp_short="${sp_name%% *}"
    [ ${#sp_short} -gt 6 ] && sp_short="${sp_short:0:6}"
    local sp_i
    sp_i=$(sphere_icon "$sp_color")
    spheres_str+="$sp_i $sp_short  "
  done < <(jq -r '.status.spheres[]? | [.name, .color] | @tsv' "$STATE_FILE" 2>/dev/null)

  printf "\n"
  printf '%b%s%b\n' "$SEP" "$(hline "$PAI_UI_WIDTH")" "$RST"
  printf "  %b%b🎯 TELOS RADAR%b  %s %b%-12s%b %b%s%b %b%3sд%b %b%3s%%%b  %bP:%b%b%s%b%s %bS:%b%b%s%b %bE:%b%b%s%b  %b%s%b\n" \
    "$VIO" "$BLD" "$RST" "$s_icon" "$CYN" "$s_label" "$RST" \
    "$YLW" "$cbar" "$RST" "$WHT" "$s_days" "$RST" "$SLT" "$s_pct" "$RST" \
    "$SLT" "$RST" "$WHT" "$perf_cur" "$RST" "$t_arrow" \
    "$SLT" "$RST" "$BLU" "$sess_wk" "$RST" \
    "$SLT" "$RST" "$SLT" "$evt_24h" "$RST" \
    "$DIM" "$now" "$RST"
  printf "  %s\n" "$spheres_str"
  printf '%b%s%b\n' "$SEP" "$(hline "$PAI_UI_WIDTH")" "$RST"

  # ══════════════════════════════════════════════════════════════════
  # LEVEL 1: ACTIONABLE — Focus + Blockers
  # ══════════════════════════════════════════════════════════════════

  printf "\n"

  # Weekly focus (left) + Blockers (right)
  local -a focus_lines=()
  local -a blocker_lines=()

  focus_lines+=("$(printf "%b%b📋 ФОКУС НЕДЕЛИ%b" "$CYN" "$BLD" "$RST")")

  while IFS= read -r focus_item; do
    [ -z "$focus_item" ] && continue
    focus_lines+=("$(printf "  %b•%b %b%s%b" "$CYN" "$RST" "$WHT" "$focus_item" "$RST")")
  done < <(jq -r '.status.weeklyFocus[]? // empty' "$STATE_FILE" 2>/dev/null)

  [ ${#focus_lines[@]} -eq 1 ] && focus_lines+=("$(printf "  %b(не задан)%b" "$DIM" "$RST")")

  blocker_lines+=("$(printf "%b%b🚧 БЛОКЕРЫ%b" "$RED" "$BLD" "$RST")")

  while IFS=$'\t' read -r b_blocker b_linked b_urgency b_next; do
    [ -z "$b_blocker" ] && continue
    local b_short="${b_blocker:0:28}"
    local urg_icon="⚪"
    [[ "$b_urgency" == *"Высок"* ]] && urg_icon="🔴"
    [[ "$b_urgency" == *"Средн"* ]] && urg_icon="🟡"
    blocker_lines+=("$(printf "  %s %b%-28s%b %b→%s%b" \
      "$urg_icon" "$WHT" "$b_short" "$RST" "$SLT" "$b_linked" "$RST")")
  done < <(jq -r '.status.blockers[]? | [.blocker, .linked, .urgency, .next] | @tsv' "$STATE_FILE" 2>/dev/null)

  [ ${#blocker_lines[@]} -eq 1 ] && blocker_lines+=("$(printf "  %b(нет блокеров)%b" "$DIM" "$RST")")

  # Render two columns
  local max_fb=${#focus_lines[@]}
  [ ${#blocker_lines[@]} -gt "$max_fb" ] && max_fb=${#blocker_lines[@]}

  for (( i=0; i<max_fb; i++ )); do
    local fl="${focus_lines[$i]:-}"
    local bl="${blocker_lines[$i]:-}"
    if [ -n "$fl" ] && [ -n "$bl" ]; then
      printf "  %-46b %b│%b  %b\n" "$fl" "$SEP" "$RST" "$bl"
    elif [ -n "$fl" ]; then
      printf "  %b\n" "$fl"
    else
      printf "  %-46s %b│%b  %b\n" "" "$SEP" "$RST" "$bl"
    fi
  done

  printf "\n"

  # ══════════════════════════════════════════════════════════════════
  # LEVEL 2: PROGRESS — Missions + Goals
  # ══════════════════════════════════════════════════════════════════

  # --- Missions (full width) ---
  printf "  %b%b🎯 МИССИИ%b\n" "$VIO" "$BLD" "$RST"
  printf "  %b%s%b\n" "$SEP" "$(hline 80)" "$RST"

  while IFS=$'\t' read -r m_id m_name m_progress m_goals_str; do
    local bar pcolor
    bar=$(progress_bar "$m_progress" 20)
    pcolor="$SLT"
    [ "$m_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$m_progress" -ge 25 ] && pcolor="$LO_GRN"
    [ "$m_progress" -ge 50 ] && pcolor="$GRN"

    printf "  %b%-3s%b %b%-20s%b %b%s%b  %b%3d%%%b\n" \
      "$CYN" "$m_id" "$RST" "$WHT" "$m_name" "$RST" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$m_progress" "$RST"

    # Show linked goals on next line
    if [ -n "$m_goals_str" ]; then
      printf "  %b    └─%b " "$SEP" "$RST"
      IFS=',' read -ra gpairs <<< "$m_goals_str"
      for gp in "${gpairs[@]}"; do
        local gid="${gp%%(*}"
        local gprog="${gp#*(}"
        gprog="${gprog%)}"
        printf "%b%s%b(%b%s%b)  " "$SLT" "$gid" "$RST" "$DIM" "$gprog" "$RST"
      done
      printf "\n"
    fi
  done < <(jq -r '
    .goals as $all_goals |
    .missions[] |
    [
      .id,
      .name,
      (.progress // 0 | tostring),
      ((.linkedGoals // []) | map(
        . as $gid |
        ($all_goals | map(select(.id == $gid)) | .[0].progress // 0) as $gp |
        "\($gid)(\($gp)%)"
      ) | join(","))
    ] | @tsv
  ' "$STATE_FILE" 2>/dev/null)

  printf "\n"

  # --- Goals: two columns (Active | Frozen/Ideas) ---
  local -a left_active=()
  local -a right_frozen=()

  left_active+=("$(printf "%b%b АКТИВНЫЕ ЦЕЛИ%b" "$GRN" "$BLD" "$RST")")
  left_active+=("$(printf "%b%s%b" "$SEP" "$(hline 42)" "$RST")")

  right_frozen+=("$(printf "%b%b ❄ ЗАМОРОЖЕНО / ИДЕИ%b" "$SLT" "$BLD" "$RST")")
  right_frozen+=("$(printf "%b%s%b" "$SEP" "$(hline 42)" "$RST")")

  while IFS=$'\t' read -r g_id g_status g_progress; do
    local emoji sname bar pcolor
    emoji=$(goal_emoji "$g_status")
    sname=$(short_goal "$g_id")
    bar=$(progress_bar "$g_progress" 10)
    pcolor="$SLT"
    [ "$g_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$g_progress" -ge 25 ] && pcolor="$LO_GRN"
    [ "$g_progress" -ge 50 ] && pcolor="$GRN"

    local line
    line=$(printf " %s %b%-3s%b %b%-16s%b %b%s%b %b%3d%%%b" \
      "$emoji" "$CYN" "$g_id" "$RST" "$WHT" "$sname" "$RST" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$g_progress" "$RST")

    local st_lower="${g_status,,}"
    if [[ "$st_lower" == *"заморожен"* ]] || [[ "$st_lower" == *"идея"* ]]; then
      right_frozen+=("$line")
    else
      left_active+=("$line")
    fi
  done < <(jq -r '.goals[] | [.id, .status, (.progress // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)

  local max_goals=${#left_active[@]}
  [ ${#right_frozen[@]} -gt "$max_goals" ] && max_goals=${#right_frozen[@]}

  for (( i=0; i<max_goals; i++ )); do
    local ll="${left_active[$i]:-}"
    local rl="${right_frozen[$i]:-}"
    if [ -n "$ll" ] && [ -n "$rl" ]; then
      printf "  %-46b %b│%b %b\n" "$ll" "$SEP" "$RST" "$rl"
    elif [ -n "$ll" ]; then
      printf "  %b\n" "$ll"
    else
      printf "  %-46s %b│%b %b\n" "" "$SEP" "$RST" "$rl"
    fi
  done

  printf "\n"

  # ══════════════════════════════════════════════════════════════════
  # LEVEL 3: CHALLENGES → STRATEGIES (dependency graph)
  # ══════════════════════════════════════════════════════════════════

  printf "  %b%b⚡ ВЫЗОВЫ → СТРАТЕГИИ%b\n" "$RED" "$BLD" "$RST"
  printf "  %b%s%b\n" "$SEP" "$(hline 80)" "$RST"

  # Build C→S mapping
  # Extract challenges with their linked strategies, then for each strategy show effectiveness
  while IFS=$'\t' read -r c_id c_name c_severity c_strats; do
    local sev_str
    sev_str=$(severity_icon "$c_severity")
    printf "  %s %b%-3s%b %b%s%b\n" "$sev_str" "$CYN" "$c_id" "$RST" "$WHT" "${c_name:0:45}" "$RST"

    if [ -n "$c_strats" ]; then
      IFS=',' read -ra strat_ids <<< "$c_strats"
      local si=0
      local scount=${#strat_ids[@]}
      for sid in "${strat_ids[@]}"; do
        # Get strategy name and effectiveness
        local s_info
        s_info=$(jq -r --arg sid "$sid" '
          .strategies[] | select(.id == $sid) |
          [.name[:35], .effectiveness // "unknown"] | @tsv
        ' "$STATE_FILE" 2>/dev/null)

        local s_name s_eff
        IFS=$'\t' read -r s_name s_eff <<< "$s_info"
        local eff_str
        eff_str=$(effect_icon "$s_eff")

        local branch="├──→"
        [ "$si" -eq $(( scount - 1 )) ] && branch="└──→"

        printf "  %b     %s%b  %b%s%b %b%-35s%b %s\n" \
          "$SEP" "$branch" "$RST" "$SLT" "$sid" "$RST" "$WHT" "$s_name" "$RST" "$eff_str"
        si=$((si + 1))
      done
    fi
    printf "\n"
  done < <(jq -r '.challenges[]? | [.id, .name, (.severity // "medium"), ((.linkedStrategies // []) | join(","))] | @tsv' "$STATE_FILE" 2>/dev/null)

  printf "\n"

  # ══════════════════════════════════════════════════════════════════
  # LEVEL 4: WINS + GROWTH
  # ══════════════════════════════════════════════════════════════════

  local -a left_wins=()
  local -a right_growth=()

  left_wins+=("$(printf "%b%b🏆 ПОБЕДЫ%b" "$GRN" "$BLD" "$RST")")
  left_wins+=("$(printf "%b%s%b" "$SEP" "$(hline 42)" "$RST")")

  while IFS=$'\t' read -r w_date w_text; do
    [ ${#w_text} -gt 38 ] && w_text="${w_text:0:37}."
    left_wins+=("$(printf " %b✦%b %b%-10s%b %b%s%b" \
      "$GRN" "$RST" "$SLT" "$w_date" "$RST" "$WHT" "$w_text" "$RST")")
  done < <(jq -r '.status.recentWins[-5:][]? | [(.date // ""), .win] | @tsv' "$STATE_FILE" 2>/dev/null)

  # Growth metrics
  right_growth+=("$(printf "%b%b📈 РОСТ%b" "$BLU" "$BLD" "$RST")")
  right_growth+=("$(printf "%b%s%b" "$SEP" "$(hline 42)" "$RST")")

  local learn_data
  learn_data=$(jq -r '[
    (.learning.sessionsWeek // 0 | tostring),
    (.learning.wisdomFramesCount // 0 | tostring),
    (.learning.lessonsCount // 0 | tostring),
    (.learning.performanceRating.current // 0 | tostring),
    (.learning.performanceRating.weekAvg // 0 | tostring),
    .learning.performanceRating.trend // "flat"
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  local l_sess l_frames l_lessons l_perf l_pavg l_trend
  IFS=$'\t' read -r l_sess l_frames l_lessons l_perf l_pavg l_trend <<< "$learn_data"
  local l_tarrow
  l_tarrow=$(trend_arrow "$l_trend")

  right_growth+=("$(printf " %bSessions:%b %b%b%s%b/wk  %bEvents:%b %b%b%s%b/24h" \
    "$SLT" "$RST" "$BLU" "$BLD" "$l_sess" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$evt_24h" "$RST")")
  right_growth+=("$(printf " %bФреймы:%b  %b%b%s%b (85%%+)  %bУроки:%b %b%b%s%b" \
    "$SLT" "$RST" "$VIO" "$BLD" "$l_frames" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$l_lessons" "$RST")")
  right_growth+=("$(printf " %bРейтинг:%b %b%b%s/10%b %s (%bнед: %s%b)" \
    "$SLT" "$RST" "$WHT" "$BLD" "$l_perf" "$RST" "$l_tarrow" "$SLT" "$l_pavg" "$RST")")

  local max_wg=${#left_wins[@]}
  [ ${#right_growth[@]} -gt "$max_wg" ] && max_wg=${#right_growth[@]}

  for (( i=0; i<max_wg; i++ )); do
    local wl="${left_wins[$i]:-}"
    local gl="${right_growth[$i]:-}"
    if [ -n "$wl" ] && [ -n "$gl" ]; then
      printf "  %-46b %b│%b  %b\n" "$wl" "$SEP" "$RST" "$gl"
    elif [ -n "$wl" ]; then
      printf "  %b\n" "$wl"
    else
      printf "  %-46s %b│%b  %b\n" "" "$SEP" "$RST" "$gl"
    fi
  done

  # ══════════════════════════════════════════════════════════════════
  # LEVEL 5: COMPASS + CAPITAL (reference)
  # ══════════════════════════════════════════════════════════════════
  printf "\n"
  printf "  %b%s%b\n" "$SEP" "$(hline 80)" "$RST"

  # Compass: rotating wisdom quote
  local quote_count
  quote_count=$(jq '.learning.wisdomQuotes | length' "$STATE_FILE" 2>/dev/null || echo 0)
  if [ "$quote_count" -gt 0 ]; then
    # Rotate based on minute of day
    local min_of_day
    min_of_day=$(( $(date +%H) * 60 + $(date +%M) ))
    local q_idx=$(( min_of_day % quote_count ))
    local q_text
    q_text=$(jq -r --argjson idx "$q_idx" '.learning.wisdomQuotes[$idx].text // ""' "$STATE_FILE" 2>/dev/null)
    local q_id
    q_id=$(jq -r --argjson idx "$q_idx" '.learning.wisdomQuotes[$idx].id // ""' "$STATE_FILE" 2>/dev/null)

    [ ${#q_text} -gt 80 ] && q_text="${q_text:0:79}…"
    printf "  %b🧭%b %b%b\"%s\"%b  %b— %s%b\n" "$VIO" "$RST" "$ITL" "$WHT" "$q_text" "$RST" "$SLT" "$q_id" "$RST"
  fi

  # Meta counters
  local meta_data
  meta_data=$(jq -r '[
    (.learning.beliefsCount // 0 | tostring),
    (.learning.ideasCount // 0 | tostring),
    (.learning.wisdomQuotes | length | tostring)
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  local m_beliefs m_ideas m_quotes
  IFS=$'\t' read -r m_beliefs m_ideas m_quotes <<< "$meta_data"

  printf "  %b📚 %sB%b  %b🧠 %sW%b  %b💡 %sI%b  %b📖 %s уроков%b" \
    "$SLT" "$m_beliefs" "$RST" "$SLT" "$m_quotes" "$RST" \
    "$SLT" "$m_ideas" "$RST" "$SLT" "$l_lessons" "$RST"

  # Capital in one line
  local cap_total
  cap_total=$(jq -r '.capital.total // 0' "$STATE_FILE" 2>/dev/null)
  local cap_fmt
  cap_fmt=$(fmt_k "$cap_total")

  printf "          %b💰 %s%b" "$ORG" "$cap_fmt" "$RST"

  # Inline allocations
  while IFS=$'\t' read -r a_name a_amount a_pct; do
    local a_fmt
    a_fmt=$(fmt_k "$a_amount")
    local a_short="${a_name:0:7}"
    printf " %b│%b%b%s%b %s" "$SEP" "$RST" "$SLT" "$a_short" "$RST" "$a_fmt"
  done < <(jq -r '.capital.allocations[:3][]? | [.name, (.amount // 0 | tostring), (.percent // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)

  printf "\n"

  # ── Dynamic tab color ──
  if [ -f "$STATE_FILE" ]; then
    local blocker_count
    blocker_count=$(jq '.status.blockers | length' "$STATE_FILE" 2>/dev/null || echo 0)
    if [ "$blocker_count" -gt 2 ]; then tab_warn
    else tab_ok; fi
  fi

  # ── Footer ──
  printf "\n%b%s%b\n" "$SEP" "$(hline "$PAI_UI_WIDTH")" "$RST"
  printf " %b%s │ ↻ %sс │ r = обновить │ q = выход%b\n" "$SLT" "$now" "$INTERVAL" "$RST"
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
