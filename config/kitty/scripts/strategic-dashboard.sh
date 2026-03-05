#!/bin/bash
# PAI Strategic Dashboard — Algorithm, Navi Growth, TELOS, Cost
# Complements telemetry-dashboard.sh (operational metrics)
# Keys: r=refresh | q=quit

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

EVENTS_FILE="$HOME/.claude/MEMORY/STATE/events.jsonl"
INTERVAL=10

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "📊 Strategic"
trap 'alt_screen_exit' EXIT INT TERM

# ── State variables ──
M_ALGO_SLUG="" M_ALGO_PHASE="" M_ALGO_PROG="" M_ALGO_TOTAL=""
M_RATE_TODAY="--" M_RATE_WEEK="--" M_RATE_MONTH="--"
M_RATE_HIGH=0 M_RATE_LOW=0 M_RATE_TREND="=" M_RATE_COUNT=0
M_LEARN_SIGNALS=0 M_LEARN_FAILURES=0
M_TELOS_ACTIVE=0 M_TELOS_TOP="" M_TELOS_PROGRESS=""
M_COST_FIXED=0 M_COST_API="0.00" M_COST_TOTAL="0.00"
M_API_COST="0.00"
M_SESSIONS=0 M_WORK=0

# Brigade compact
M_A0_STATUS="--" M_A0_LATENCY="--"
M_JULES_MERGED_TODAY=0 M_JULES_FAILED_TODAY=0

METRIC_LINES=()

# ═══════════════════════════════════════════════════
# ── Compute functions ──
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

compute_navi_growth() {
  [ ! -f "$EVENTS_FILE" ] && return
  local raw
  raw=$(jq -sr '
    (now | strftime("%Y-%m-%d")) as $today |
    (now - 7*86400 | strftime("%Y-%m-%d")) as $week_ago |
    (now - 14*86400 | strftime("%Y-%m-%d")) as $prev_week |
    (now - 30*86400 | strftime("%Y-%m-%d")) as $month_ago |
    [.[] | select(.type == "rating.captured")] |
    (length) as $total |
    ([.[] | select(.timestamp[:10] >= $today) | (.data.rating // .rating // 0)] |
      if length > 0 then (add / length * 10 | floor) / 10 else 0 end) as $avg_today |
    ([.[] | select(.timestamp[:10] >= $week_ago) | (.data.rating // .rating // 0)] |
      if length > 0 then (add / length * 10 | floor) / 10 else 0 end) as $avg_week |
    ([.[] | select(.timestamp[:10] >= $week_ago and .timestamp[:10] < $today) | (.data.rating // .rating // 0)] |
      if length > 0 then add / length else 0 end) as $this_week_raw |
    ([.[] | select(.timestamp[:10] >= $prev_week and .timestamp[:10] < $week_ago) | (.data.rating // .rating // 0)] |
      if length > 0 then add / length else 0 end) as $prev_week_raw |
    ([.[] | select(.timestamp[:10] >= $month_ago) | (.data.rating // .rating // 0)] |
      if length > 0 then (add / length * 10 | floor) / 10 else 0 end) as $avg_month |
    ([.[] | select((.data.rating // .rating // 0) >= 9)] | length) as $high |
    ([.[] | select((.data.rating // .rating // 0) <= 4)] | length) as $low |
    (if $this_week_raw > $prev_week_raw + 0.3 then "up"
     elif $this_week_raw < $prev_week_raw - 0.3 then "down"
     else "flat" end) as $trend |
    [$avg_today, $avg_week, $avg_month, $high, $low, $trend, $total] | @tsv
  ' "$EVENTS_FILE" 2>/dev/null)
  if [ -n "$raw" ]; then
    IFS=$'\t' read -r M_RATE_TODAY M_RATE_WEEK M_RATE_MONTH \
      M_RATE_HIGH M_RATE_LOW M_RATE_TREND M_RATE_COUNT <<< "$raw"
  fi
  local month_dir
  month_dir=$(date +%Y-%m)
  M_LEARN_SIGNALS=$(find "$HOME/.claude/MEMORY/LEARNING/ALGORITHM/$month_dir" -type f 2>/dev/null | wc -l)
  M_LEARN_FAILURES=$(find "$HOME/.claude/MEMORY/LEARNING/FAILURES/$month_dir" -type f 2>/dev/null | wc -l)
}

compute_telos() {
  local goals_file="$HOME/.claude/PAI/USER/TELOS/GOALS.md"
  [ ! -f "$goals_file" ] && return
  M_TELOS_ACTIVE=$(grep -c '^### G[0-9]' "$goals_file" 2>/dev/null || echo 0)
  M_TELOS_TOP=$(grep -A1 '^### G[0-9]' "$goals_file" 2>/dev/null | grep -B1 'Высокий' | head -1 | sed 's/^### G[0-9]*: //' | head -c 40)
  local done total
  done=$(awk '/^### G0:/,/^### G[1-9]/' "$goals_file" 2>/dev/null | grep -c '\[x\]' || echo 0)
  total=$(awk '/^### G0:/,/^### G[1-9]/' "$goals_file" 2>/dev/null | grep -c '\[.\]' || echo 0)
  [ "$total" -gt 0 ] && M_TELOS_PROGRESS="${done}/${total}" || M_TELOS_PROGRESS="--"
}

compute_cost() {
  local config="$HOME/.claude/PAI/config/cost-budget.json"
  [ ! -f "$config" ] && return
  M_COST_FIXED=$(jq -r '.monthly_fixed | to_entries | map(.value) | add // 0' "$config" 2>/dev/null)
  [ -z "$M_COST_FIXED" ] && M_COST_FIXED=0

  # API cost estimate from inference events
  M_API_COST=$(jq -sr '
    [.[] | select(.type == "inference.ok")] |
    map(
      (.data.provider // "unknown") as $prov |
      (.data.model // "unknown") as $model |
      ((.data.latency_s // "0") | tonumber) as $lat |
      (if $prov == "anthropic" then
        (if ($model | test("opus")) then 0.025
         elif ($model | test("sonnet")) then 0.005
         elif ($model | test("haiku")) then 0.001
         else 0.005 end)
       elif $prov == "zai" then 0.002
       elif $prov == "google" then 0.003
       else 0 end) as $rate |
      ($lat * $rate)
    ) | add // 0 |
    . * 100 | floor | . / 100 | tostring
  ' "$EVENTS_FILE" 2>/dev/null)
  [ -z "$M_API_COST" ] && M_API_COST="0.00"

  M_COST_API="$M_API_COST"
  local fixed_int="${M_COST_FIXED%.*}"
  local api_int="${M_COST_API%.*}"
  [ -z "$fixed_int" ] && fixed_int=0
  [ -z "$api_int" ] && api_int=0
  M_COST_TOTAL=$(( fixed_int + api_int ))
}

compute_brigade_compact() {
  [ ! -f "$EVENTS_FILE" ] && return
  local raw
  raw=$(jq -sr '
    (
      ([.[] | select(.type == "a0.health_check")] | sort_by(.timestamp) | last) //
      ([.[] | select(.type == "a0.response")] | sort_by(.timestamp) | last) //
      null
    ) |
    if . then
      (if .type == "a0.health_check" then
        (if .all_healthy then "up" else "down" end)
       else "up" end)
    else "--" end
  ' "$EVENTS_FILE" 2>/dev/null)
  M_A0_STATUS="${raw:-"--"}"

  local today
  today=$(date -u +%Y-%m-%d)
  raw=$(jq -sr --arg today "$today" '
    [.[] | select((.type == "merge.ok" or .type == "merge.fail") and (.timestamp // "" | startswith($today)))] |
    ([.[] | select(.type == "merge.ok")] | length) as $m |
    ([.[] | select(.type == "merge.fail")] | length) as $f |
    [$m, $f] | @tsv
  ' "$EVENTS_FILE" 2>/dev/null)
  [ -n "$raw" ] && IFS=$'\t' read -r M_JULES_MERGED_TODAY M_JULES_FAILED_TODAY <<< "$raw"

  # Session/work counts
  raw=$(jq -sr '
    ([.[] | select(.type == "session.completed")] | length) as $sc |
    ([.[] | select(.type == "work.completed")] | length) as $wc |
    [$sc, $wc] | @tsv
  ' "$EVENTS_FILE" 2>/dev/null)
  [ -n "$raw" ] && IFS=$'\t' read -r M_SESSIONS M_WORK <<< "$raw"
}

# ═══════════════════════════════════════════════════
# ── Build panel ──
# ═══════════════════════════════════════════════════
build_panel() {
  METRIC_LINES=()

  # ── Algorithm ──
  METRIC_LINES+=("$(printf '%b%bALGORITHM%b' "$ORG" "$BLD" "$RST")")
  if [ -n "$M_ALGO_SLUG" ] && [ "$M_ALGO_PHASE" != "complete" ] && [ "$M_ALGO_PHASE" != "COMPLETE" ]; then
    local slug_display phase_upper
    slug_display=$(truncate "$M_ALGO_SLUG" 35)
    phase_upper=$(echo "$M_ALGO_PHASE" | tr '[:lower:]' '[:upper:]')
    local prog_pct=0
    if [ -n "$M_ALGO_TOTAL" ] && [ "$M_ALGO_TOTAL" != "0" ]; then
      local prog_done="${M_ALGO_PROG%%/*}"
      prog_pct=$(( prog_done * 100 / M_ALGO_TOTAL ))
    fi
    local pbar
    pbar=$(progress_bar "$prog_pct" 12)
    METRIC_LINES+=("$(printf '  %b%s%b' "$WHT" "$slug_display" "$RST")")
    METRIC_LINES+=("$(printf '  %b%s%b  %s  %b%s%b' \
      "$YLW" "$phase_upper" "$RST" "$pbar" "$SLT" "$M_ALGO_PROG" "$RST")")
  else
    METRIC_LINES+=("$(printf '  %b(idle)%b' "$DIM" "$RST")")
  fi
  METRIC_LINES+=("")

  # ── Navi Growth ──
  local trend_icon trend_color
  case "$M_RATE_TREND" in
    up)   trend_icon="▲"; trend_color="$GRN" ;;
    down) trend_icon="▼"; trend_color="$RED" ;;
    *)    trend_icon="─"; trend_color="$SLT" ;;
  esac

  METRIC_LINES+=("$(printf '%b%bNAVI GROWTH%b  %b%s%b' "$ORG" "$BLD" "$RST" "$trend_color" "$trend_icon" "$RST")")
  METRIC_LINES+=("$(printf '  %bRating%b  day %b%s%b  week %b%s%b  month %b%s%b' \
    "$SLT" "$RST" "$WHT" "$M_RATE_TODAY" "$RST" "$WHT" "$M_RATE_WEEK" "$RST" \
    "$WHT" "$M_RATE_MONTH" "$RST")")
  METRIC_LINES+=("$(printf '  %b★9+%b %b%s%b   %b★≤4%b %b%s%b   %b%s signals%b  %b%s failures%b' \
    "$GRN" "$RST" "$GRN" "$M_RATE_HIGH" "$RST" \
    "$SLT" "$RST" "$RED" "$M_RATE_LOW" "$RST" \
    "$CYN" "$M_LEARN_SIGNALS" "$RST" "$RED" "$M_LEARN_FAILURES" "$RST")")
  METRIC_LINES+=("")

  # ── TELOS ──
  METRIC_LINES+=("$(printf '%b%bTELOS%b  %b%s active goals%b' "$BLU" "$BLD" "$RST" "$SLT" "$M_TELOS_ACTIVE" "$RST")")
  if [ -n "$M_TELOS_TOP" ]; then
    local telos_pct=0
    local telos_done="${M_TELOS_PROGRESS%%/*}"
    local telos_total="${M_TELOS_PROGRESS##*/}"
    if [ "$telos_total" != "--" ] && [ "$telos_total" -gt 0 ] 2>/dev/null; then
      telos_pct=$(( telos_done * 100 / telos_total ))
    fi
    local tbar
    tbar=$(progress_bar "$telos_pct" 12)
    METRIC_LINES+=("$(printf '  %b►%b %b%s%b' "$YLW" "$RST" "$WHT" "$M_TELOS_TOP" "$RST")")
    METRIC_LINES+=("$(printf '    %s  %b%s%b' "$tbar" "$SLT" "$M_TELOS_PROGRESS" "$RST")")
  else
    METRIC_LINES+=("$(printf '  %b(no active goals)%b' "$DIM" "$RST")")
  fi
  METRIC_LINES+=("")

  # ── Cost ──
  local total_color="$GRN"
  [ "$M_COST_TOTAL" -gt 300 ] && total_color="$YLW"
  [ "$M_COST_TOTAL" -gt 500 ] && total_color="$RED"
  METRIC_LINES+=("$(printf '%b%bCOST%b  %b$%s%b/mo' "$VIO" "$BLD" "$RST" "$total_color" "$M_COST_TOTAL" "$RST")")
  METRIC_LINES+=("$(printf '  %bFixed%b   %b$%s%b/mo  %b(subscriptions)%b' \
    "$SLT" "$RST" "$WHT" "$M_COST_FIXED" "$RST" "$DIM" "$RST")")
  METRIC_LINES+=("$(printf '  %bAPI%b     %b$%s%b     %b(inference estimate)%b' \
    "$SLT" "$RST" "$WHT" "$M_COST_API" "$RST" "$DIM" "$RST")")
  METRIC_LINES+=("")

  # ── Brigade compact ──
  local a0_color="$GRN"
  [ "$M_A0_STATUS" = "down" ] && a0_color="$RED"
  [ "$M_A0_STATUS" = "--" ] && a0_color="$SLT"
  METRIC_LINES+=("$(printf '%b%bBRIGADE%b  A0:%b%s%b  Jules:%b+%s%b/%b-%s%b  Sessions:%b%s%b' \
    "$CYN" "$BLD" "$RST" \
    "$a0_color" "$M_A0_STATUS" "$RST" \
    "$GRN" "$M_JULES_MERGED_TODAY" "$RST" \
    "$RED" "$M_JULES_FAILED_TODAY" "$RST" \
    "$SLT" "$M_SESSIONS" "$RST")")
}

# ═══════════════════════════════════════════════════
# ── Render ──
# ═══════════════════════════════════════════════════
poll() {
  printf '\033[2J\033[H'

  local now_time
  now_time=$(date '+%H:%M')
  local pulse=" "
  [ $(( 10#$(date +%S) % 2 )) -eq 0 ] && pulse="●"

  if [ ! -f "$EVENTS_FILE" ]; then
    box_top
    box_line "$(printf '%b%b📊 STRATEGIC%b  %bwaiting...%b' "$BLU" "$BLD" "$RST" "$DIM" "$RST")"
    box_bot
    return
  fi

  spin_start "computing..."
  compute_algorithm
  compute_navi_growth
  compute_telos
  compute_cost
  compute_brigade_compact
  spin_stop

  build_panel

  box_top
  box_line "$(printf '%b%b📊 PAI STRATEGIC%b                %b%s%b  %b%s%b  %b↻%ss%b' \
    "$BLU" "$BLD" "$RST" "$WHT" "$now_time" "$RST" \
    "$BLU" "$pulse" "$RST" "$DIM" "$INTERVAL" "$RST")"
  box_sep

  for line in "${METRIC_LINES[@]}"; do
    box_line "$line"
  done

  box_sep
  box_line "$(printf '%br=refresh  q=quit%b' "$DIM" "$RST")"
  box_bot
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
