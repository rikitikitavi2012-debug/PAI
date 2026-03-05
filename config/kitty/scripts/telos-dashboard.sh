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

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "🎯 TELOS"
trap 'alt_screen_exit' EXIT INT TERM

# ── Main render ──
poll() {
  printf '\033[2J\033[H'
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

  # Pulse
  local pulse=" "
  [ $(( 10#$(date +%S) % 2 )) -eq 0 ] && pulse="●"

  printf "\n"
  printf '%b%s%b\n' "$SEP" "$(hline "$PAI_UI_WIDTH")" "$RST"
  printf "  %b%b🎯 TELOS RADAR%b  %s %b%-12s%b %b%s%b %b%3sд%b %b%3s%%%b  %bP:%b%b%s%b%s %bS:%b%b%s%b %bE:%b%b%s%b %b%s%b %b%s%b\n" \
    "$VIO" "$BLD" "$RST" "$s_icon" "$CYN" "$s_label" "$RST" \
    "$YLW" "$cbar" "$RST" "$WHT" "$s_days" "$RST" "$SLT" "$s_pct" "$RST" \
    "$SLT" "$RST" "$WHT" "$perf_cur" "$RST" "$t_arrow" \
    "$SLT" "$RST" "$BLU" "$sess_wk" "$RST" \
    "$SLT" "$RST" "$SLT" "$evt_24h" "$RST" \
    "$DIM" "$now" "$RST" "$VIO" "$pulse" "$RST"
  printf "  %s\n" "$spheres_str"
  printf '%b%s%b\n' "$SEP" "$(hline "$PAI_UI_WIDTH")" "$RST"

  # ══════════════════════════════════════════════════════════════════
  # GOALS — all in one compact list
  # ══════════════════════════════════════════════════════════════════

  printf "  %b%bЦЕЛИ%b\n" "$GRN" "$BLD" "$RST"

  while IFS=$'\t' read -r g_id g_status g_progress; do
    local emoji sname bar pcolor
    emoji=$(goal_emoji "$g_status")
    sname=$(short_goal "$g_id")
    bar=$(progress_bar "$g_progress" 12)
    pcolor="$SLT"
    [ "$g_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$g_progress" -ge 25 ] && pcolor="$LO_GRN"
    [ "$g_progress" -ge 50 ] && pcolor="$GRN"

    local sname_vw
    sname_vw=$(printf '%s' "$sname" | wc -L)
    local sname_pad=$(( 18 - sname_vw ))
    [ "$sname_pad" -lt 0 ] && sname_pad=0
    printf "  %s %b%-3s%b %s%*s %b%s%b %b%3d%%%b\n" \
      "$emoji" "$CYN" "$g_id" "$RST" "$sname" "$sname_pad" "" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$g_progress" "$RST"
  done < <(jq -r '.goals[] | [.id, .status, (.progress // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)

  # ══════════════════════════════════════════════════════════════════
  # CHALLENGES → STRATEGIES (compact)
  # ══════════════════════════════════════════════════════════════════
  printf "\n"
  printf "  %b%bВЫЗОВЫ → СТРАТЕГИИ%b\n" "$RED" "$BLD" "$RST"

  while IFS=$'\t' read -r c_id c_name c_severity c_strats; do
    local sev_str
    sev_str=$(severity_icon "$c_severity")

    # Inline strategies on same line as challenge
    local strat_inline=""
    if [ -n "$c_strats" ]; then
      IFS=',' read -ra strat_ids <<< "$c_strats"
      for sid in "${strat_ids[@]}"; do
        local s_eff
        s_eff=$(jq -r --arg sid "$sid" '.strategies[] | select(.id == $sid) | .effectiveness // "unknown"' "$STATE_FILE" 2>/dev/null)
        local eff_str
        eff_str=$(effect_icon "$s_eff")
        strat_inline+=" $sid$eff_str"
      done
    fi

    local c_short="${c_name:0:35}"
    local c_vw
    c_vw=$(printf '%s' "$c_short" | wc -L)
    local c_pad=$(( 35 - c_vw ))
    [ "$c_pad" -lt 0 ] && c_pad=0
    printf "  %s %b%-3s%b %b%s%b%*s%b%s%b\n" \
      "$sev_str" "$CYN" "$c_id" "$RST" "$WHT" "$c_short" "$RST" "$c_pad" "" "$SLT" "$strat_inline" "$RST"
  done < <(jq -r '.challenges[]? | [.id, .name, (.severity // "medium"), ((.linkedStrategies // []) | join(","))] | @tsv' "$STATE_FILE" 2>/dev/null)

  # ══════════════════════════════════════════════════════════════════
  # WINS + GROWTH (inline)
  # ══════════════════════════════════════════════════════════════════
  printf "\n"

  # Growth metrics inline
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

  printf "  %b%b📈 РОСТ%b  %bP:%b%b%s/10%b%s  %bS:%b%b%s%b/wk  %bE:%b%b%s%b/24h  %bF:%b%b%s%b  %bL:%b%b%s%b\n" \
    "$BLU" "$BLD" "$RST" \
    "$SLT" "$RST" "$WHT" "$l_perf" "$RST" "$l_tarrow" \
    "$SLT" "$RST" "$BLU" "$l_sess" "$RST" \
    "$SLT" "$RST" "$WHT" "$evt_24h" "$RST" \
    "$SLT" "$RST" "$VIO" "$l_frames" "$RST" \
    "$SLT" "$RST" "$WHT" "$l_lessons" "$RST"

  # Recent wins (last 3, one line each)
  printf "  %b%b🏆 ПОБЕДЫ%b " "$GRN" "$BLD" "$RST"
  local win_count=0
  while IFS=$'\t' read -r w_date w_text; do
    [ "$win_count" -ge 3 ] && break
    [ ${#w_text} -gt 35 ] && w_text="${w_text:0:34}…"
    printf " %b✦%b%b%s%b" "$GRN" "$RST" "$DIM" " $w_text" "$RST"
    win_count=$((win_count + 1))
  done < <(jq -r '.status.recentWins[-3:][]? | [(.date // ""), .win] | @tsv' "$STATE_FILE" 2>/dev/null)
  printf "\n"

  # ══════════════════════════════════════════════════════════════════
  # LEVEL 5: COMPASS + CAPITAL (reference)
  # ══════════════════════════════════════════════════════════════════
  printf "\n"
  printf "  %b%b%s%b\n" "$SEP" "$DIM" "$(hline 80)" "$RST"

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
  printf " %b↻ %sс │ r = обновить │ q = выход%b" "$SLT" "$INTERVAL" "$RST"
  right_align "$(printf '%b%s%b' "$DIM" "$now" "$RST")" "$PAI_UI_WIDTH"
  printf "\n"
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
