#!/bin/bash
# PAI Telemetry Dashboard — Full-screen nervous system monitor (Tab 4: 📡 Telemetry)
# Data: events.jsonl (16 event types, 10 sources)
# Layouts: 1=Dashboard (Golden Signals + Provider + System), 2=Live Log (legend + tail -f)
# Refresh: 10s (dashboard only) | 1/2=layout | r=refresh | q=quit | f/i/v/h/a=filter (live log)

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

EVENTS_FILE="$HOME/.claude/MEMORY/STATE/events.jsonl"
HOOKS_DIR="$HOME/.claude/hooks"
HOOKS_TESTS="$HOME/.claude/hooks/tests"
INTERVAL=10
LAYOUT="dashboard"  # "dashboard" | "livelog"
TAIL_PID=""
FILTER="all"
FILTER_LABEL="ALL"

# ── Timezone offset (hours from UTC) ──
_tz_raw=$(date +%z)
_tz_sign=1
[[ "$_tz_raw" == -* ]] && _tz_sign=-1
_tz_abs=${_tz_raw#[+-]}
_tz_h=$(( 10#${_tz_abs:0:2} ))
TZ_OFFSET_H=$(( _tz_sign * _tz_h ))
unset _tz_raw _tz_sign _tz_abs _tz_h

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "📡 Telemetry"
cleanup() {
  stop_livelog
  alt_screen_exit
}
trap 'cleanup' EXIT INT TERM

# ── Metric variables (populated by compute_metrics) ──
M_INF_OK=0 M_INF_FAIL=0 M_P50="0" M_P95="0"
M_VOICE_SENT=0 M_VOICE_FAIL=0
M_AGENT_START=0 M_AGENT_STOP=0
M_SESSIONS=0 M_WORK=0 M_TOTAL=0
M_TRAFFIC_1H=0
M_PROV_DATA=""


# ── Shared jq event formatter ──
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/events-format.sh"

# ═══════════════════════════════════════════════════
# ── Compute all metrics in single jq pass ──
# ═══════════════════════════════════════════════════
compute_metrics() {
  [ ! -f "$EVENTS_FILE" ] && return

  local raw
  raw=$(jq -sr '
    (now - 3600) as $hour_ago |

    # Inference
    [.[] | select(.type == "inference.ok")]  as $ok |
    [.[] | select(.type == "inference.fail")] as $fail |
    ($ok | length) as $ok_n |
    ($fail | length) as $fail_n |

    # Latency percentiles from ALL inference events with latency > 0
    ([$ok[], $fail[]] | map((.data.latency_s // "0") | tonumber) | map(select(. > 0)) | sort) as $lats |
    ($lats | length) as $ln |
    (if $ln > 0 then $lats[($ln * 50 / 100 | floor)] else 0 end) as $p50 |
    (if $ln > 0 then $lats[([$ln - 1, ($ln * 95 / 100 | floor)] | min)] else 0 end) as $p95 |

    # Traffic last hour
    [.[] | select(
      (.timestamp // "" | length) > 10 and
      ((.timestamp[:19] + "Z" | try strptime("%Y-%m-%dT%H:%M:%SZ") | mktime) // 0) > $hour_ago
    )] | length as $traffic |

    # Voice
    [.[] | select(.type == "voice.sent")] | length as $vs |
    [.[] | select(.type == "voice.failed")] | length as $vf |

    # Agents
    [.[] | select(.type == "agent.start")] | length as $as |
    [.[] | select(.type == "agent.stop")] | length as $ao |

    # Sessions / Work
    [.[] | select(.type == "session.completed")] | length as $sc |
    [.[] | select(.type == "work.completed")] | length as $wc |

    length as $total |

    [
      $ok_n, $fail_n,
      ($p50 * 10 | floor | . / 10),
      ($p95 * 10 | floor | . / 10),
      $vs, $vf, $as, $ao, $sc, $wc, $total, $traffic
    ] | @tsv
  ' "$EVENTS_FILE" 2>/dev/null)

  if [ -n "$raw" ]; then
    IFS=$'\t' read -r M_INF_OK M_INF_FAIL M_P50 M_P95 \
      M_VOICE_SENT M_VOICE_FAIL M_AGENT_START M_AGENT_STOP \
      M_SESSIONS M_WORK M_TOTAL M_TRAFFIC_1H <<< "$raw"
  fi

  # Per-provider breakdown
  M_PROV_DATA=$(jq -sr '
    [.[] | select(.type | startswith("inference."))] |
    group_by(.data.provider // "unknown") |
    map(
      (.[0].data.provider // "unknown") as $prov |
      ([.[] | select(.type == "inference.ok")] | length) as $ok |
      ([.[] | select(.type == "inference.fail")] | length) as $fail |
      ([.[] | (.data.latency_s // "0") | tonumber] | map(select(. > 0)) | sort) as $lats |
      ($lats | length) as $ln |
      (if $ln > 0 then $lats[([$ln - 1, ($ln * 95 / 100 | floor)] | min)] else 0 end) as $p95 |
      [$prov, $ok, $fail, ($p95 * 10 | floor | . / 10)] | @tsv
    ) | .[]
  ' "$EVENTS_FILE" 2>/dev/null)
}

# ═══════════════════════════════════════════════════
# ── Render: Golden Signals ──
# ═══════════════════════════════════════════════════
render_golden_signals() {
  local total_inf=$(( M_INF_OK + M_INF_FAIL ))
  local err_rate=0
  [ "$total_inf" -gt 0 ] && err_rate=$(( M_INF_FAIL * 100 / total_inf ))

  # Latency gauge
  local lat_pct=0 lat_status="—" lat_color="$SLT"
  if [ "$M_INF_OK" -gt 0 ]; then
    local p95_int=${M_P95%.*}
    [ -z "$p95_int" ] && p95_int=0
    if [ "$p95_int" -lt 5 ]; then
      lat_pct=25; lat_status="ok"; lat_color="$GRN"
    elif [ "$p95_int" -lt 15 ]; then
      lat_pct=60; lat_status="WARN"; lat_color="$YLW"
    else
      lat_pct=90; lat_status="CRIT"; lat_color="$RED"
    fi
  fi

  # Traffic gauge
  local traf_status="ok" traf_color="$GRN" traf_pct=30
  if [ "$M_TRAFFIC_1H" -lt 5 ]; then
    traf_pct=10; traf_status="low"; traf_color="$SLT"
  elif [ "$M_TRAFFIC_1H" -gt 200 ]; then
    traf_pct=90; traf_status="HIGH"; traf_color="$RED"
  elif [ "$M_TRAFFIC_1H" -gt 100 ]; then
    traf_pct=60; traf_status="WARN"; traf_color="$YLW"
  fi

  # Error gauge
  local err_status="ok" err_color="$GRN" err_pct=10
  if [ "$err_rate" -gt 50 ]; then
    err_pct=90; err_status="CRIT"; err_color="$RED"
  elif [ "$err_rate" -gt 20 ]; then
    err_pct=60; err_status="WARN"; err_color="$YLW"
  fi

  # Saturation gauge
  local sat_status="ok" sat_color="$GRN" sat_pct=20
  if [ "$M_TOTAL" -gt 5000 ]; then
    sat_pct=90; sat_status="CRIT"; sat_color="$RED"
  elif [ "$M_TOTAL" -gt 1000 ]; then
    sat_pct=60; sat_status="WARN"; sat_color="$YLW"
  fi

  # Compute bars (8 chars each)
  local lat_bar traf_bar err_bar sat_bar
  lat_bar=$(progress_bar "$lat_pct" 8)
  traf_bar=$(progress_bar "$traf_pct" 8)
  err_bar=$(progress_bar "$err_pct" 8)
  sat_bar=$(progress_bar "$sat_pct" 8)

  # Quarter width for 4 columns
  box_line "$(printf '%b⏱ LATENCY%b       %b📊 TRAFFIC%b       %b❌ ERRORS%b        %b📦 SATURATION%b' \
    "$WHT" "$RST" "$WHT" "$RST" "$WHT" "$RST" "$WHT" "$RST")"
  box_line "$(printf '%bP95: %ss%b        %b%s evt/ч%b        %b%s%% fail%b         %b%s events%b' \
    "$lat_color" "$M_P95" "$RST" "$traf_color" "$M_TRAFFIC_1H" "$RST" \
    "$err_color" "$err_rate" "$RST" "$sat_color" "$M_TOTAL" "$RST")"
  box_line "$(printf '%b%s%b %b%s%b     %b%s%b %b%s%b      %b%s%b %b%s%b       %b%s%b %b%s%b' \
    "$lat_color" "$lat_bar" "$RST" "$lat_color" "$lat_status" "$RST" \
    "$traf_color" "$traf_bar" "$RST" "$traf_color" "$traf_status" "$RST" \
    "$err_color" "$err_bar" "$RST" "$err_color" "$err_status" "$RST" \
    "$sat_color" "$sat_bar" "$RST" "$sat_color" "$sat_status" "$RST")"
}

# ═══════════════════════════════════════════════════
# ── Render: Provider + System Stats (two-column) ──
# ═══════════════════════════════════════════════════
render_bottom_panels() {
  two_col_top
  two_col \
    "$(printf '%b%b API ПРОВАЙДЕРЫ%b' "$VIO" "$BLD" "$RST")" \
    "$(printf '%b%b СИСТЕМА%b' "$CYN" "$BLD" "$RST")"
  two_col_mid

  # Left: providers
  local prov_lines=()
  if [ -n "$M_PROV_DATA" ]; then
    while IFS=$'\t' read -r prov ok fail p95; do
      [ -z "$prov" ] && continue
      local status_icon
      if [ "$fail" -gt "$ok" ] 2>/dev/null; then
        status_icon=$(printf '%b⚠%b' "$RED" "$RST")
      else
        status_icon=$(printf '%b✅%b' "$GRN" "$RST")
      fi
      prov_lines+=("$(printf '%s %b%-8s%b %b%sok%b / %b%sfail%b  %bP95:%ss%b' \
        "$status_icon" "$WHT" "$prov" "$RST" \
        "$GRN" "$ok" "$RST" "$RED" "$fail" "$RST" \
        "$SLT" "$p95" "$RST")")
    done <<< "$M_PROV_DATA"
  fi
  [ ${#prov_lines[@]} -eq 0 ] && prov_lines+=("$(printf '%bНет данных%b' "$DIM" "$RST")")

  # Right: system stats
  local hook_count test_count
  hook_count=$(find "$HOOKS_DIR" -maxdepth 1 -name "*.hook.ts" 2>/dev/null | wc -l)
  test_count=$(find "$HOOKS_TESTS" -maxdepth 1 -name "*.test.ts" 2>/dev/null | wc -l)

  local sys_lines=()
  sys_lines+=("$(printf '%bHooks:%b  %b%b%s%b файлов  %b%s%b тестов' \
    "$SLT" "$RST" "$WHT" "$BLD" "$hook_count" "$RST" "$SLT" "$test_count" "$RST")")
  sys_lines+=("$(printf '%bVoice:%b  %b%s%b sent  %b%s%b failed' \
    "$SLT" "$RST" "$GRN" "$M_VOICE_SENT" "$RST" "$RED" "$M_VOICE_FAIL" "$RST")")
  sys_lines+=("$(printf '%bAgents:%b %b%s%b start  %b%s%b stop' \
    "$SLT" "$RST" "$CYN" "$M_AGENT_START" "$RST" "$SLT" "$M_AGENT_STOP" "$RST")")
  sys_lines+=("$(printf '%bEvents:%b %b%b%s%b total  %b%s%b sessions' \
    "$SLT" "$RST" "$WHT" "$BLD" "$M_TOTAL" "$RST" "$SLT" "$M_SESSIONS" "$RST")")

  # Render rows
  local max_rows=${#prov_lines[@]}
  [ ${#sys_lines[@]} -gt "$max_rows" ] && max_rows=${#sys_lines[@]}

  for (( i=0; i<max_rows; i++ )); do
    two_col "${prov_lines[$i]:-}" "${sys_lines[$i]:-}"
  done

  two_col_bot
}

# ═══════════════════════════════════════════════════
# ── Dynamic tab color ──
# ═══════════════════════════════════════════════════
compute_tab_color() {
  local total_inf=$(( M_INF_OK + M_INF_FAIL ))
  local err_rate=0
  [ "$total_inf" -gt 0 ] && err_rate=$(( M_INF_FAIL * 100 / total_inf ))

  if [ "$err_rate" -gt 50 ] || [ "$M_TOTAL" -gt 5000 ]; then
    tab_crit
  elif [ "$err_rate" -gt 20 ] || [ "$M_TOTAL" -gt 1000 ]; then
    tab_warn
  else
    tab_ok
  fi
}

# ═══════════════════════════════════════════════════
# ── Layout 1: Dashboard poll ──
# ═══════════════════════════════════════════════════
poll_dashboard() {
  printf '\033[2J\033[H'

  local now_time now_date
  now_time=$(date '+%H:%M')
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

  # Pulse
  local pulse=" "
  [ $(( 10#$(date +%S) % 2 )) -eq 0 ] && pulse="●"

  if [ ! -f "$EVENTS_FILE" ]; then
    box_top
    box_line "$(printf '%b%b📡 PAI TELEMETRY%b                                    %bОжидание events.jsonl...%b' \
      "$VIO" "$BLD" "$RST" "$DIM" "$RST")"
    box_bot
    return
  fi

  # Compute all metrics
  spin_start "metrics..."
  compute_metrics
  spin_stop

  # ── Header ──
  box_top
  box_line "$(printf '%b%b📡 DASHBOARD%b                              %b%s %s%b  %b%s%b  %b↻%sс%b' \
    "$VIO" "$BLD" "$RST" "$WHT" "$now_date" "$now_time" "$RST" "$VIO" "$pulse" "$RST" "$DIM" "$INTERVAL" "$RST")"
  box_sep

  # ── Golden Signals ──
  render_golden_signals
  box_sep

  # ── Bottom panels ──
  render_bottom_panels

  # ── Tab color ──
  compute_tab_color

  # ── Footer ──
  box_sep
  local footer_left footer_right
  footer_left=$(printf '%b1=dashboard │ 2=live log │ r=обновить │ q=выход%b' "$DIM" "$RST")
  footer_right=$(printf '%b%s%b' "$DIM" "$(date '+%H:%M')" "$RST")
  box_line "$(printf '%s%*s%s' "$footer_left" "$(( PAI_UI_WIDTH - 4 - $(vwidth "$footer_left") - $(vwidth "$footer_right") ))" "" "$footer_right")"
  box_bot
}

# ═══════════════════════════════════════════════════
# ── Layout 2: Live Log ──
# ═══════════════════════════════════════════════════
render_legend() {
  box_top
  box_line "$(printf '%b%b📡 LIVE LOG%b                     %b(1=dashboard  q=выход  f/i/v/h/a=фильтр)%b' \
    "$CYN" "$BLD" "$RST" "$DIM" "$RST")"
  box_sep

  # Event types legend
  box_line "$(printf '%b%bСОБЫТИЯ%b' "$WHT" "$BLD" "$RST")"
  box_line "$(printf '%b🔮 inference%b  — API вызов к LLM (провайдер, latency, уровень)' "$VIO" "$RST")"
  box_line "$(printf '%b🔊 voice%b     — голосовое уведомление ElevenLabs (отправка/ошибка)' "$VIO" "$RST")"
  box_line "$(printf '%b🚀 agent.start%b — спавн субагента Claude Code (тип, id)' "$CYN" "$RST")"
  box_line "$(printf '%b🏁 agent.stop%b  — субагент завершил работу' "$CYN" "$RST")"
  box_line "$(printf '%b⭐ rating%b    — оценка сессии пользователем (★1-10)' "$YLW" "$RST")"
  box_line "$(printf '%b📦 work%b      — рабочий блок (WORK/) создан или завершён' "$GRN" "$RST")"
  box_line "$(printf '%b🔄 session%b   — сессия Claude Code завершена' "$CYN" "$RST")"
  box_line "$(printf '%b📋 prd%b       — синхронизация PRD (фаза, прогресс, задачи)' "$CYN" "$RST")"
  box_line "$(printf '%b🧠 a0%b        — Agent Zero (VPS) — ревью, задачи, коммуникация' "$CYN" "$RST")"
  box_line "$(printf '%b🌳 worktree%b  — создание/удаление git worktree для агентов' "$SLT" "$RST")"
  box_line "$(printf '%b⚡ custom%b    — кастомные события от хуков и скиллов' "$SLT" "$RST")"
  box_sep

  # Field descriptions
  box_line "$(printf '%b%bПОЛЯ%b' "$WHT" "$BLD" "$RST")"
  box_line "$(printf '%bsrc=%b источник (хук/скилл)    %bvia=%b провайдер API (anthropic/google/zhipu)' "$WHT" "$RST" "$WHT" "$RST")"
  box_line "$(printf '%bφ=%b   фаза алгоритма (A/B/C)   %bprog=%b прогресс задачи (%%)' "$WHT" "$RST" "$WHT" "$RST")"
  box_line "$(printf '%bhook=%b имя хука (.hook.ts)      %b★%b    рейтинг сессии (1-10)' "$WHT" "$RST" "$WHT" "$RST")"
  box_line "$(printf '%bagent=%b тип субагента           %bid=%b   ID агента (первые 8 символов)' "$WHT" "$RST" "$WHT" "$RST")"
  box_line "$(printf '%blvl=%b  уровень inference        %bctx=%b  ID контекста сессии' "$WHT" "$RST" "$WHT" "$RST")"
  box_line "$(printf '%bPR#%b  номер Pull Request        %bev=%b   подтип события' "$WHT" "$RST" "$WHT" "$RST")"
  box_sep
  box_line "$(printf '%bФильтры:%b  %bf%b=ошибки  %bi%b=inference  %bv%b=voice  %bh%b=hooks/agents  %ba%b=все      %bфильтр: %b%b%s%b' \
    "$WHT" "$RST" "$RED" "$RST" "$VIO" "$RST" "$VIO" "$RST" "$CYN" "$RST" "$GRN" "$RST" "$SLT" "$YLW" "$BLD" "$FILTER_LABEL" "$RST")"
  box_sep
}

stop_livelog() {
  if [ -n "$TAIL_PID" ] && kill -0 "$TAIL_PID" 2>/dev/null; then
    kill "$TAIL_PID" 2>/dev/null
    wait "$TAIL_PID" 2>/dev/null
  fi
  TAIL_PID=""
}

start_livelog() {
  printf '\033[2J\033[H'
  render_legend

  [ ! -f "$EVENTS_FILE" ] && {
    printf '%b  Ожидание events.jsonl...%b\n' "$DIM" "$RST"
    return
  }

  # Launch tail -f with jq formatting in background
  tail -n 30 -f "$EVENTS_FILE" | jq --unbuffered -r -R \
    --argjson tz "$TZ_OFFSET_H" --arg filt "$FILTER" \
    "$JQ_EVENT_FORMAT" 2>/dev/null &
  TAIL_PID=$!
}

# ═══════════════════════════════════════════════════
# ── Main loop ──
# ═══════════════════════════════════════════════════

# Initial render
poll_dashboard

while true; do
  if [ "$LAYOUT" = "dashboard" ]; then
    # Dashboard: poll every INTERVAL seconds, check keys each second
    for ((countdown=INTERVAL; countdown>0; countdown--)); do
      read -rsn1 -t1 key
      case "$key" in
        1) ;; # already on dashboard
        2) LAYOUT="livelog"; start_livelog; break ;;
        r|R) break ;;
        q|Q) exit 0 ;;
      esac
    done
    [ "$LAYOUT" = "dashboard" ] && poll_dashboard

  else
    # Live Log: tail -f runs in background, we just listen for keys
    read -rsn1 -t1 key
    case "$key" in
      1) stop_livelog; LAYOUT="dashboard"; poll_dashboard ;;
      2) ;; # already on livelog
      f) FILTER="fail"; FILTER_LABEL="FAILS"; stop_livelog; start_livelog ;;
      i) FILTER="inference"; FILTER_LABEL="INFERENCE"; stop_livelog; start_livelog ;;
      v) FILTER="voice"; FILTER_LABEL="VOICE"; stop_livelog; start_livelog ;;
      h) FILTER="hooks"; FILTER_LABEL="HOOKS"; stop_livelog; start_livelog ;;
      a) FILTER="all"; FILTER_LABEL="ALL"; stop_livelog; start_livelog ;;
      q|Q) exit 0 ;;
    esac
  fi
done
