#!/bin/bash
# PAI Telemetry Dashboard — Metrics panel (Golden Signals + Providers + System)
# Data: events.jsonl (16 event types, 10 sources)
# Runs in right pane; left pane = events-tail.sh (live stream)
# Keys: r=refresh | q=quit

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

EVENTS_FILE="$HOME/.claude/MEMORY/STATE/events.jsonl"
HOOKS_DIR="$HOME/.claude/hooks"
HOOKS_TESTS="$HOME/.claude/hooks/tests"
INTERVAL=10

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
trap 'alt_screen_exit' EXIT INT TERM

# ── Metric variables (populated by compute_metrics) ──
M_INF_OK=0 M_INF_FAIL=0 M_P50="0" M_P95="0"
M_VOICE_SENT=0 M_VOICE_FAIL=0
M_AGENT_START=0 M_AGENT_STOP=0
M_SESSIONS=0 M_WORK=0 M_TOTAL=0
M_TRAFFIC_1H=0
M_PROV_DATA=""

# Algorithm state
M_ALGO_SLUG="" M_ALGO_PHASE="" M_ALGO_PROG="" M_ALGO_TOTAL=""

# Active agents (newline-separated: type\tid\tdesc\tepoch)
M_ACTIVE_AGENTS=""
M_ACTIVE_AGENTS_COUNT=0

# Recent events (newline-separated: time\ticon\ttype\tdetail)
M_RECENT=""

# Panel line array
METRIC_LINES=()

# ═══════════════════════════════════════════════════
# ── Compute all metrics in single jq pass ──
# ═══════════════════════════════════════════════════
compute_metrics() {
  [ ! -f "$EVENTS_FILE" ] && return

  local raw
  raw=$(jq -sr '
    (now - 3600) as $hour_ago |
    length as $total |

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
    ([.[] | select(
      (.timestamp // "" | length) > 10 and
      ((.timestamp[:19] + "Z" | try strptime("%Y-%m-%dT%H:%M:%SZ") | mktime) // 0) > $hour_ago
    )] | length) as $traffic |

    # Voice
    ([.[] | select(.type == "voice.sent")] | length) as $vs |
    ([.[] | select(.type == "voice.failed")] | length) as $vf |

    # Agents
    ([.[] | select(.type == "agent.start")] | length) as $as |
    ([.[] | select(.type == "agent.stop")] | length) as $ao |

    # Sessions / Work
    ([.[] | select(.type == "session.completed")] | length) as $sc |
    ([.[] | select(.type == "work.completed")] | length) as $wc |

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
# ── Algorithm: current task from prd.synced events ──
# ═══════════════════════════════════════════════════
compute_algorithm() {
  [ ! -f "$EVENTS_FILE" ] && return

  local raw
  raw=$(jq -sr '
    [.[] | select(.type == "prd.synced")] |
    if length == 0 then "|||" else
      group_by(.slug) |
      map(sort_by(.timestamp) | last) |
      sort_by(.timestamp) | last |
      [(.slug // ""), (.phase // ""), (.progress // "")] |
      (.[2] | split("/") | if length == 2 then .[1] else "0" end) as $total |
      (.[0] + "\t" + .[1] + "\t" + .[2] + "\t" + $total)
    end
  ' "$EVENTS_FILE" 2>/dev/null)

  if [ -n "$raw" ] && [ "$raw" != "|||" ]; then
    IFS=$'\t' read -r M_ALGO_SLUG M_ALGO_PHASE M_ALGO_PROG M_ALGO_TOTAL <<< "$raw"
  fi
}

# ═══════════════════════════════════════════════════
# ── Active Agents: start without matching stop ──
# ═══════════════════════════════════════════════════
compute_active_agents() {
  [ ! -f "$EVENTS_FILE" ] && return

  M_ACTIVE_AGENTS=$(jq -sr '
    # Collect all agent events
    [.[] | select(.type == "agent.start" or .type == "agent.stop")] |
    # Group by agent_id
    group_by(.agent_id) |
    # Keep only those where last event is agent.start
    map(sort_by(.timestamp) | last | select(.type == "agent.start")) |
    # Format output
    .[] |
    [
      (.agent_type // "unknown"),
      (.agent_id // "?" | .[:7]),
      (.description // ""),
      (.timestamp // "")
    ] | @tsv
  ' "$EVENTS_FILE" 2>/dev/null)

  M_ACTIVE_AGENTS_COUNT=0
  if [ -n "$M_ACTIVE_AGENTS" ]; then
    M_ACTIVE_AGENTS_COUNT=$(echo "$M_ACTIVE_AGENTS" | wc -l)
  fi
}

# ═══════════════════════════════════════════════════
# ── Recent: last 5 non-inference events ──
# ═══════════════════════════════════════════════════
compute_recent() {
  [ ! -f "$EVENTS_FILE" ] && return

  M_RECENT=$(jq -sr --argjson tz "$TZ_OFFSET_H" '
    [.[] | select(.type | startswith("inference.") | not)] |
    sort_by(.timestamp) | .[-5:] | reverse |
    .[] |
    # Extract HH:MM with timezone
    (.timestamp // "" | .[:19] | split("T") |
      if length == 2 then
        (.[1] | split(":") | (.[0] | tonumber) + $tz |
          if . < 0 then . + 24 elif . >= 24 then . - 24 else . end |
          tostring | if length < 2 then "0" + . else . end
        ) as $h |
        (.[1] | split(":") | .[1]) as $m |
        ($h + ":" + $m)
      else "--:--"
      end
    ) as $time |
    # Icon and detail by type
    (
      if   .type == "agent.start"          then ["🚀", (.agent_type // "") + " " + ((.agent_id // "")[:7])]
      elif .type == "agent.stop"           then ["🏁", (.agent_id // "")[:7]]
      elif .type == "prd.synced"           then ["📋", "φ=" + (.phase // "") + " " + (.progress // "")]
      elif .type == "voice.sent"           then ["🔊", (.data.hook // .source // "")]
      elif .type == "voice.failed"         then ["🔇", (.data.error // "fail")]
      elif .type == "rating.captured"      then ["⭐", "★" + ((.data.rating // .rating // 0) | tostring)]
      elif .type == "session.completed"    then ["📍", "done"]
      elif .type == "work.completed"       then ["📦", "done"]
      elif .type == "a0.response"          then ["🧠", "ctx=" + ((.data.context_id // .context_id // "")[:8])]
      elif .type == "custom.post_compact_recovery" then ["♻️", "compact"]
      elif .type == "task.completed"       then ["✅", (.task_subject // "")[:20]]
      elif (.type | startswith("worktree")) then ["🌿", (.type | ltrimstr("worktree_"))]
      elif .type == "security.alert"       then ["🛡️", (.data.severity // "")]
      else ["•", ""]
      end
    ) as [$icon, $detail] |
    [$time, $icon, .type, $detail] | @tsv
  ' "$EVENTS_FILE" 2>/dev/null)
}

# ═══════════════════════════════════════════════════
# ── Build metrics panel (full-width, single column) ──
# ═══════════════════════════════════════════════════
build_metrics() {
  METRIC_LINES=()

  local total_inf=$(( M_INF_OK + M_INF_FAIL ))
  local err_rate=0
  [ "$total_inf" -gt 0 ] && err_rate=$(( M_INF_FAIL * 100 / total_inf ))

  # ── Golden Signals ──
  local lat_status="--" lat_color="$SLT"
  if [ "$M_INF_OK" -gt 0 ]; then
    local p95_int=${M_P95%.*}
    [ -z "$p95_int" ] && p95_int=0
    if [ "$p95_int" -lt 5 ]; then
      lat_status="ok"; lat_color="$GRN"
    elif [ "$p95_int" -lt 15 ]; then
      lat_status="WARN"; lat_color="$YLW"
    else
      lat_status="CRIT"; lat_color="$RED"
    fi
  fi

  local traf_status="ok" traf_color="$GRN"
  if [ "$M_TRAFFIC_1H" -lt 5 ]; then
    traf_status="low"; traf_color="$SLT"
  elif [ "$M_TRAFFIC_1H" -gt 200 ]; then
    traf_status="HIGH"; traf_color="$RED"
  elif [ "$M_TRAFFIC_1H" -gt 100 ]; then
    traf_status="WARN"; traf_color="$YLW"
  fi

  local err_status="ok" err_color="$GRN"
  if [ "$err_rate" -gt 50 ]; then
    err_status="CRIT"; err_color="$RED"
  elif [ "$err_rate" -gt 20 ]; then
    err_status="WARN"; err_color="$YLW"
  fi

  local sat_status="ok" sat_color="$GRN"
  if [ "$M_TOTAL" -gt 5000 ]; then
    sat_status="CRIT"; sat_color="$RED"
  elif [ "$M_TOTAL" -gt 1000 ]; then
    sat_status="WARN"; sat_color="$YLW"
  fi

  # ── Algorithm ──
  METRIC_LINES+=("$(printf '%b%bALGORITHM%b' "$ORG" "$BLD" "$RST")")
  if [ -n "$M_ALGO_SLUG" ] && [ "$M_ALGO_PHASE" != "complete" ] && [ "$M_ALGO_PHASE" != "COMPLETE" ]; then
    local slug_display
    slug_display=$(truncate "$M_ALGO_SLUG" 30)
    local phase_upper
    phase_upper=$(echo "$M_ALGO_PHASE" | tr '[:lower:]' '[:upper:]')
    # Compute percentage for progress bar
    local prog_pct=0
    if [ -n "$M_ALGO_TOTAL" ] && [ "$M_ALGO_TOTAL" != "0" ]; then
      local prog_done="${M_ALGO_PROG%%/*}"
      prog_pct=$(( prog_done * 100 / M_ALGO_TOTAL ))
    fi
    local pbar
    pbar=$(progress_bar "$prog_pct" 10)
    METRIC_LINES+=("$(printf '  %b%s%b  %b%s%b  %s %b%s%b' \
      "$WHT" "$slug_display" "$RST" \
      "$YLW" "$phase_upper" "$RST" \
      "$pbar" "$SLT" "$M_ALGO_PROG" "$RST")")
  else
    METRIC_LINES+=("$(printf '  %b(idle)%b' "$DIM" "$RST")")
  fi
  METRIC_LINES+=("")

  # ── Active Agents ──
  METRIC_LINES+=("$(printf '%b%bAGENTS%b %b(%s active)%b' "$CYN" "$BLD" "$RST" "$SLT" "$M_ACTIVE_AGENTS_COUNT" "$RST")")
  if [ -n "$M_ACTIVE_AGENTS" ] && [ "$M_ACTIVE_AGENTS_COUNT" -gt 0 ]; then
    while IFS=$'\t' read -r a_type a_id a_desc a_ts; do
      [ -z "$a_type" ] && continue
      local elapsed=""
      if [ -n "$a_ts" ]; then
        local ts_epoch
        ts_epoch=$(date -d "${a_ts}" +%s 2>/dev/null || echo 0)
        [ "$ts_epoch" -gt 0 ] && elapsed=$(time_ago "$ts_epoch")
      fi
      local desc_display=""
      [ -n "$a_desc" ] && desc_display=$(truncate "$a_desc" 25)
      METRIC_LINES+=("$(printf '  %b%-10s%b %b%s%b  %s  %b%s%b' \
        "$WHT" "$a_type" "$RST" "$DIM" "$a_id" "$RST" \
        "$desc_display" "$SLT" "$elapsed" "$RST")")
    done <<< "$M_ACTIVE_AGENTS"
  else
    METRIC_LINES+=("$(printf '  %b(no active agents)%b' "$DIM" "$RST")")
  fi
  METRIC_LINES+=("")

  # ── Golden Signals ──
  METRIC_LINES+=("$(printf '%b%bGOLDEN SIGNALS%b' "$WHT" "$BLD" "$RST")")
  METRIC_LINES+=("$(printf '%b⏱ Latency%b  P50:%b%ss%b  P95:%b%ss%b  %b%s%b' \
    "$SLT" "$RST" "$WHT" "$M_P50" "$RST" "$lat_color" "$M_P95" "$RST" "$lat_color" "$lat_status" "$RST")")
  METRIC_LINES+=("$(printf '%b📊 Traffic%b  %b%s%b evt/h  %b%s%b' \
    "$SLT" "$RST" "$traf_color" "$M_TRAFFIC_1H" "$RST" "$traf_color" "$traf_status" "$RST")")
  METRIC_LINES+=("$(printf '%b❌ Errors%b   %b%s%b/%b%s%b  %b%s%%%b fail  %b%s%b' \
    "$SLT" "$RST" "$GRN" "$M_INF_OK" "$RST" "$RED" "$M_INF_FAIL" "$RST" \
    "$err_color" "$err_rate" "$RST" "$err_color" "$err_status" "$RST")")
  METRIC_LINES+=("$(printf '%b📦 Saturat%b  %b%s%b events  %b%s%b' \
    "$SLT" "$RST" "$sat_color" "$M_TOTAL" "$RST" "$sat_color" "$sat_status" "$RST")")
  METRIC_LINES+=("")

  # ── Providers ──
  METRIC_LINES+=("$(printf '%b%bAPI PROVIDERS%b' "$VIO" "$BLD" "$RST")")
  if [ -n "$M_PROV_DATA" ]; then
    while IFS=$'\t' read -r prov ok fail p95; do
      [ -z "$prov" ] && continue
      local total=$(( ok + fail ))
      local prov_err=0
      [ "$total" -gt 0 ] && prov_err=$(( fail * 100 / total ))

      local icon prov_color
      if [ "$prov_err" -gt 50 ]; then
        icon="⚠"; prov_color="$RED"
      elif [ "$prov_err" -gt 20 ]; then
        icon="⚠"; prov_color="$YLW"
      else
        icon="✅"; prov_color="$GRN"
      fi

      METRIC_LINES+=("$(printf '%b%s%b %b%-10s%b %b%s%b ok  %b%s%b fail  P95:%b%ss%b  %b%s%%%b err' \
        "$prov_color" "$icon" "$RST" "$WHT" "$prov" "$RST" \
        "$GRN" "$ok" "$RST" "$RED" "$fail" "$RST" \
        "$WHT" "$p95" "$RST" "$prov_color" "$prov_err" "$RST")")
    done <<< "$M_PROV_DATA"
  else
    METRIC_LINES+=("$(printf '%b— no data%b' "$DIM" "$RST")")
  fi
  METRIC_LINES+=("")

  # ── Recent Activity ──
  METRIC_LINES+=("$(printf '%b%bRECENT%b' "$BLU" "$BLD" "$RST")")
  if [ -n "$M_RECENT" ]; then
    while IFS=$'\t' read -r r_time r_icon r_type r_detail; do
      [ -z "$r_time" ] && continue
      local type_short
      type_short=$(truncate "$r_type" 18)
      local detail_short
      detail_short=$(truncate "$r_detail" 25)
      METRIC_LINES+=("$(printf '  %b%s%b %s %b%-18s%b %b%s%b' \
        "$DIM" "$r_time" "$RST" "$r_icon" "$WHT" "$type_short" "$RST" \
        "$SLT" "$detail_short" "$RST")")
    done <<< "$M_RECENT"
  else
    METRIC_LINES+=("$(printf '  %b(no events)%b' "$DIM" "$RST")")
  fi
  METRIC_LINES+=("")

  # ── System ──
  METRIC_LINES+=("$(printf '%b%bSYSTEM%b' "$CYN" "$BLD" "$RST")")

  local hook_count test_count
  hook_count=$(find "$HOOKS_DIR" -maxdepth 1 -name "*.hook.ts" 2>/dev/null | wc -l)
  test_count=$(find "$HOOKS_TESTS" -maxdepth 1 -name "*.test.ts" 2>/dev/null | wc -l)

  METRIC_LINES+=("$(printf '%bHooks%b   %b%s%b files   %b%s%b tests' \
    "$SLT" "$RST" "$WHT" "$hook_count" "$RST" "$SLT" "$test_count" "$RST")")
  METRIC_LINES+=("$(printf '%bVoice%b   %b%s%b sent   %b%s%b fail' \
    "$SLT" "$RST" "$GRN" "$M_VOICE_SENT" "$RST" "$RED" "$M_VOICE_FAIL" "$RST")")
  METRIC_LINES+=("$(printf '%bAgents%b  %b%s%b start  %b%s%b stop' \
    "$SLT" "$RST" "$CYN" "$M_AGENT_START" "$RST" "$SLT" "$M_AGENT_STOP" "$RST")")
  METRIC_LINES+=("$(printf '%bTotal%b   %b%s%b events  %b%s%b sessions' \
    "$SLT" "$RST" "$WHT" "$M_TOTAL" "$RST" "$SLT" "$M_SESSIONS" "$RST")")
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
# ── Main render ──
# ═══════════════════════════════════════════════════
poll() {
  printf '\033[2J\033[H'

  local now_time now_date
  now_time=$(date '+%H:%M')
  local day month year
  day=$(date '+%-d')
  year=$(date '+%Y')
  case $(date '+%-m') in
    1) month="Jan" ;; 2) month="Feb" ;; 3) month="Mar" ;;
    4) month="Apr" ;; 5) month="May" ;; 6) month="Jun" ;;
    7) month="Jul" ;; 8) month="Aug" ;; 9) month="Sep" ;;
    10) month="Oct" ;; 11) month="Nov" ;; 12) month="Dec" ;;
  esac
  now_date=$(printf '%02d %s %s' "$day" "$month" "$year")

  local pulse=" "
  [ $(( 10#$(date +%S) % 2 )) -eq 0 ] && pulse="●"

  if [ ! -f "$EVENTS_FILE" ]; then
    box_top
    box_line "$(printf '%b%b📡 PAI TELEMETRY%b  %bwaiting for events.jsonl...%b' \
      "$VIO" "$BLD" "$RST" "$DIM" "$RST")"
    box_bot
    return
  fi

  # Compute
  spin_start "metrics..."
  compute_metrics
  compute_algorithm
  compute_active_agents
  compute_recent
  spin_stop

  build_metrics

  # ── Header ──
  box_top
  box_line "$(printf '%b%b📡 PAI TELEMETRY%b                          %b%s %s%b  %b%s%b  %b↻%ss%b' \
    "$VIO" "$BLD" "$RST" "$WHT" "$now_date" "$now_time" "$RST" \
    "$VIO" "$pulse" "$RST" "$DIM" "$INTERVAL" "$RST")"
  box_sep

  # ── Metrics body ──
  for line in "${METRIC_LINES[@]}"; do
    box_line "$line"
  done

  # ── Footer ──
  box_sep
  box_line "$(printf '%br=refresh  q=quit%b' "$DIM" "$RST")"
  box_bot

  compute_tab_color
}

# ═══════════════════════════════════════════════════
# ── Main loop ──
# ═══════════════════════════════════════════════════

poll

while true; do
  for (( countdown=INTERVAL; countdown>0; countdown-- )); do
    read -rsn1 -t1 key
    case "$key" in
      r|R) break ;;
      q|Q) exit 0 ;;
    esac
  done
  poll
done
