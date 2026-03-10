#!/bin/bash
# TELOS Radar — Strategic Overview (Left Pane of TELOS Tab)
# Data: telos-state.json (pre-computed by TelosParser.ts)
# Compact: header + goals + challenges + growth + capital
# Refresh: 300s smart poll | r = refresh | q = quit

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

STATE_FILE="$HOME/.claude/MEMORY/STATE/telos-state.json"
TELOS_PARSER="$HOME/.claude/PAI/Tools/TelosParser.ts"
TELOS_DIR="$HOME/.claude/PAI/USER/TELOS"

INTERVAL=300
LO_GRN='\e[38;2;134;239;172m'

# ── Helpers ──

short_goal() {
  case "$1" in
    G0)  echo "Цифр.Прораб" ;;
    G1)  echo "Timber Frame" ;;
    G2)  echo "Orchestrator" ;;
    G3)  echo "Фин.независ." ;;
    G4)  echo "Шале" ;;
    G5)  echo "Квартира" ;;
    G6)  echo "A0T" ;;
    G7)  echo "Земля Былым" ;;
    G8)  echo "Акции" ;;
    G9)  echo "Инфра интернет" ;;
    G10) echo "Аудит скиллов" ;;
    G11) echo "PAI community" ;;
    G12) echo "RU Metrics" ;;
    G13) echo "PAI Workspace" ;;
    *)   echo "$1" ;;
  esac
}

goal_emoji() {
  case "$1" in
    *"Активна"*|*"активная"*|*"непрерывная"*) echo "+" ;;
    *"К действию"*)                             echo "!" ;;
    *"Планирование"*)                           echo "~" ;;
    *"Заморожено"*)                              echo "*" ;;
    *"Идея"*)                                    echo "?" ;;
    *)                                           echo "-" ;;
  esac
}

severity_icon() {
  case "$1" in
    high)   printf "%b!%b" "$RED" "$RST" ;;
    medium) printf "%b~%b" "$YLW" "$RST" ;;
    low)    printf "%b-%b" "$GRN" "$RST" ;;
    *)      printf "-" ;;
  esac
}

effect_icon() {
  case "$1" in
    working) printf "%b+%b" "$GRN" "$RST" ;;
    partial) printf "%b~%b" "$YLW" "$RST" ;;
    *)       printf "-" ;;
  esac
}

# Track last known mtime of TELOS source files
LAST_MTIME=0

maybe_refresh_state() {
  if [ ! -f "$STATE_FILE" ]; then
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
    return
  fi
  local max_mtime=0
  for f in "$TELOS_DIR"/*.md; do
    [ -f "$f" ] || continue
    local mt
    mt=$(stat -c %Y "$f" 2>/dev/null || echo 0)
    [ "$mt" -gt "$max_mtime" ] && max_mtime=$mt
  done
  if [ "$max_mtime" -gt "$LAST_MTIME" ]; then
    LAST_MTIME=$max_mtime
    timeout 15 bun "$TELOS_PARSER" >/dev/null 2>&1 &
  fi
}

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "TELOS"
trap 'alt_screen_exit' EXIT INT TERM

# ── Main render ──
poll() {
  printf '\033[2J\033[H'
  maybe_refresh_state
  local now
  now=$(date '+%H:%M')

  if [ ! -f "$STATE_FILE" ] || ! timeout 3 jq empty "$STATE_FILE" 2>/dev/null; then
    printf "\n  %bTELOS RADAR  —  %bЗагрузка...%b\n" "$VIO$BLD" "$DIM" "$RST"
    return
  fi

  # ── HEADER ──
  local hdr
  hdr=$(jq -r '[
    .season.seasonLabel // "—",
    (.season.daysRemaining // 0 | tostring),
    (.season.elapsedPercent // 0 | tostring),
    .season.current // "",
    (.learning.performanceRating.current // 0 | tostring),
    .learning.performanceRating.trend // "flat",
    (.learning.sessionsWeek // 0 | tostring),
    (.system.eventCount24h // 0 | tostring)
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  local s_label s_days s_pct s_current perf_cur perf_trend sess_wk evt_24h
  IFS=$'\t' read -r s_label s_days s_pct s_current perf_cur perf_trend sess_wk evt_24h <<< "$hdr"

  # Phase detection
  local phase_id phase_name phase_color
  local today_day today_month
  today_day=$(date +%-d); today_month=$(date +%-m)
  if [ "$today_month" -eq 3 ] && [ "$today_day" -lt 10 ]; then
    phase_id="A"; phase_name="Заточка"; phase_color="$YLW"
  elif [ "$today_month" -ge 4 ]; then
    phase_id="S"; phase_name="Сезон"; phase_color="$ORG"
  else
    phase_id="B"; phase_name="Продукт"; phase_color="$CYN"
  fi

  local t_arrow="→"
  [ "$perf_trend" = "up" ] && t_arrow=$'\e[38;2;74;222;128m↑\e[0m'
  [ "$perf_trend" = "down" ] && t_arrow=$'\e[38;2;251;113;133m↓\e[0m'

  # Season bar
  local cb_filled=$(( s_pct * 8 / 100 ))
  local cb_empty=$(( 8 - cb_filled ))
  local cbar=""
  [ "$cb_filled" -gt 0 ] && cbar+=$(printf '█%.0s' $(seq 1 "$cb_filled"))
  [ "$cb_empty"  -gt 0 ] && cbar+=$(printf '░%.0s' $(seq 1 "$cb_empty"))

  printf "\n"
  printf "  %b%bTELOS RADAR%b  %b%s%b %b%s%b %bd%s%b %b%s%%%b  %bP:%s%b%s  %bS:%s E:%s%b  %b%s%b\n" \
    "$VIO" "$BLD" "$RST" \
    "$phase_color" "$phase_id:$phase_name" "$RST" \
    "$YLW" "$cbar" "$RST" "$WHT" "$s_days" "$RST" "$SLT" "$s_pct" "$RST" \
    "$WHT" "$perf_cur" "$RST" "$t_arrow" "$SLT" "$sess_wk" "$evt_24h" "$RST" \
    "$DIM" "$now" "$RST"

  # Spheres
  local spheres_str=""
  while IFS=$'\t' read -r sp_name sp_color; do
    local sp_short="${sp_name%% *}"
    [ ${#sp_short} -gt 6 ] && sp_short="${sp_short:0:6}"
    local c="$SLT"
    [ "$sp_color" = "green" ] && c="$GRN"
    [ "$sp_color" = "yellow" ] && c="$YLW"
    [ "$sp_color" = "red" ] && c="$RED"
    spheres_str+="$(printf '%b●%b%s ' "$c" "$RST" "$sp_short")"
  done < <(jq -r '.status.spheres[]? | [.name, .color] | @tsv' "$STATE_FILE" 2>/dev/null)
  [ -n "$spheres_str" ] && printf "  %s\n" "$spheres_str"

  printf '%b%s%b\n' "$SEP" "$(hline 46)" "$RST"

  # ── GOALS (active/progress first, inactive collapsed) ──
  local total_goals=0 shown_goals=0 hidden_goals=0
  local hidden_ids=""
  printf "  %b%bЦЕЛИ%b" "$GRN" "$BLD" "$RST"
  total_goals=$(jq '.goals | length' "$STATE_FILE" 2>/dev/null || echo 0)
  printf " %b(%s)%b\n" "$SLT" "$total_goals" "$RST"

  while IFS=$'\t' read -r g_id g_status g_progress; do
    # Show: active, has progress, or "К действию". Hide: frozen/idea/planning with 0%
    local dominated=false
    if [ "$g_progress" -eq 0 ]; then
      case "$g_status" in
        *"Заморожено"*|*"Идея"*) dominated=true ;;
        *"Планирование"*) dominated=true ;;
      esac
    fi

    if $dominated; then
      hidden_goals=$((hidden_goals + 1))
      hidden_ids+=" $g_id"
      continue
    fi

    local emoji sname bar pcolor
    emoji=$(goal_emoji "$g_status")
    sname=$(short_goal "$g_id")
    bar=$(progress_bar "$g_progress" 8)
    pcolor="$SLT"
    [ "$g_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$g_progress" -ge 25 ] && pcolor="$LO_GRN"
    [ "$g_progress" -ge 50 ] && pcolor="$GRN"

    local sname_vw
    sname_vw=$(printf '%s' "$sname" | wc -L)
    local sname_pad=$(( 15 - sname_vw ))
    [ "$sname_pad" -lt 0 ] && sname_pad=0
    printf "  %b%s%b %b%-3s%b %s%*s %b%s%b %b%3d%%%b\n" \
      "$SLT" "$emoji" "$RST" "$CYN" "$g_id" "$RST" "$sname" "$sname_pad" "" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$g_progress" "$RST"
    shown_goals=$((shown_goals + 1))
  done < <(jq -r '.goals[] | [.id, .status, (.progress // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)

  if [ "$hidden_goals" -gt 0 ]; then
    printf "  %b  +%s ещё:%b%s\n" "$DIM" "$hidden_goals" "$RST" "$hidden_ids"
  fi

  # ── CHALLENGES ──
  printf "\n  %b%bВЫЗОВЫ%b\n" "$RED" "$BLD" "$RST"

  while IFS=$'\t' read -r c_id c_name c_severity c_strats; do
    local sev_str
    sev_str=$(severity_icon "$c_severity")
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
    local c_short="${c_name:0:22}"
    local c_vw
    c_vw=$(printf '%s' "$c_short" | wc -L)
    local c_pad=$(( 22 - c_vw ))
    [ "$c_pad" -lt 0 ] && c_pad=0
    printf "  %s %b%-3s%b %b%s%b%*s%b%s%b\n" \
      "$sev_str" "$CYN" "$c_id" "$RST" "$WHT" "$c_short" "$RST" "$c_pad" "" "$SLT" "$strat_inline" "$RST"
  done < <(jq -r '.challenges[]? | [.id, .name, (.severity // "medium"), ((.linkedStrategies // []) | join(","))] | @tsv' "$STATE_FILE" 2>/dev/null)

  # ── GROWTH + WINS ──
  local l_frames l_lessons
  l_frames=$(jq -r '.learning.wisdomFramesCount // 0' "$STATE_FILE" 2>/dev/null)
  l_lessons=$(jq -r '.learning.lessonsCount // 0' "$STATE_FILE" 2>/dev/null)
  printf "\n  %b%bРОСТ%b  P:%b%s%b%s  %bF:%s L:%s%b\n" \
    "$BLU" "$BLD" "$RST" "$WHT" "$perf_cur" "$RST" "$t_arrow" "$SLT" \
    "$l_frames" "$l_lessons" "$RST"

  # Last 2 wins
  local win_count=0
  while IFS=$'\t' read -r w_date w_text; do
    [ "$win_count" -ge 2 ] && break
    [ ${#w_text} -gt 30 ] && w_text="${w_text:0:29}..."
    printf "  %b+%b %b%s%b\n" "$GRN" "$RST" "$DIM" "$w_text" "$RST"
    win_count=$((win_count + 1))
  done < <(jq -r '.status.recentWins[-2:][]? | [(.date // ""), .win] | @tsv' "$STATE_FILE" 2>/dev/null)

  # ── CAPITAL (one line) ──
  local cap_total
  cap_total=$(jq -r '.capital.total // 0' "$STATE_FILE" 2>/dev/null)
  local cap_fmt
  if [ "$cap_total" -ge 1000000 ]; then
    cap_fmt=$(printf "%.1fM" "$(echo "scale=1; $cap_total / 1000000" | bc)")
  elif [ "$cap_total" -ge 1000 ]; then
    cap_fmt=$(printf "%dK" $(( cap_total / 1000 )))
  else
    cap_fmt="$cap_total"
  fi
  printf "\n  %bKAPITAL%b %b%s%b" "$ORG$BLD" "$RST" "$ORG" "$cap_fmt" "$RST"
  while IFS=$'\t' read -r a_name a_amount _; do
    local a_short="${a_name:0:6}"
    local a_fmt
    if [ "$a_amount" -ge 1000 ]; then a_fmt=$(printf "%dK" $(( a_amount / 1000 ))); else a_fmt="$a_amount"; fi
    printf " %b|%b%s:%s" "$SEP" "$RST" "$a_short" "$a_fmt"
  done < <(jq -r '.capital.allocations[:3][]? | [.name, (.amount // 0 | tostring), (.percent // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)
  printf "\n"

  # ── Wisdom quote ──
  local quote_count
  quote_count=$(jq '.learning.wisdomQuotes | length' "$STATE_FILE" 2>/dev/null || echo 0)
  if [ "$quote_count" -gt 0 ]; then
    local min_of_day
    min_of_day=$(( $(date +%H) * 60 + $(date +%M) ))
    local q_idx=$(( min_of_day % quote_count ))
    local q_text
    q_text=$(jq -r --argjson idx "$q_idx" '.learning.wisdomQuotes[$idx].text // ""' "$STATE_FILE" 2>/dev/null)
    [ ${#q_text} -gt 40 ] && q_text="${q_text:0:39}..."
    printf "\n  %b\"%s\"%b\n" "$DIM" "$q_text" "$RST"
  fi

  # ── Tab color ──
  local blocker_count
  blocker_count=$(jq '.status.blockers | length' "$STATE_FILE" 2>/dev/null || echo 0)
  if [ "$blocker_count" -gt 2 ]; then tab_warn; else tab_ok; fi

  # ── Footer ──
  printf "\n%b%s%b\n" "$SEP" "$(hline 46)" "$RST"
  printf " %br | q%b" "$SLT" "$RST"
  printf '\033[46G%b%s%b\n' "$DIM" "$now" "$RST"
}

# ── Initial poll ──
poll

# ── Main loop ──
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
