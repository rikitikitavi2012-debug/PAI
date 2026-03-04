#!/bin/bash
# Brigade Watch — AI Brigade Dashboard for Kitty
# Polls: Agent Zero health, Jules sessions, JulesAutoMerge status
# Refresh: every 30 seconds | Exit: Ctrl+C | r = refresh now

export PATH="$HOME/.bun/bin:$PATH"
# VPN proxy required for Jules API and GitHub CLI
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"
# A0 is direct WAN — bypass proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"

A0_HOST="72.56.86.51:50002"
A0_HEALTH_URL="http://${A0_HOST}/health"
JULES_TOOL="$HOME/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts"
JAM_STATE="$HOME/.claude/MEMORY/STATE/jules-automerge.json"

INTERVAL=30
API_TIMEOUT=10

# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "🤖 Brigade"
trap 'alt_screen_exit' EXIT INT TERM

poll() {
  printf '\033[2J\033[H'

  local now
  now=$(date '+%H:%M:%S')

  # Pulse: visual heartbeat
  local pulse=" "
  [ $(( 10#$(date +%S) % 2 )) -eq 0 ] && pulse="●"

  # ── Header ──
  box_top
  box_line "$(printf '%b%b🤖 AI BRIGADE%b                                   %b%s%b %b%s%b  %b↻%sс%b' \
    "$VIO" "$BLD" "$RST" "$WHT" "$now" "$RST" "$VIO" "$pulse" "$RST" "$DIM" "$INTERVAL" "$RST")"

  # ═══════════════════════════════════════════════════
  # ── Agent Zero ──
  # ═══════════════════════════════════════════════════
  section_header "🧠" "AGENT ZERO" "$CYN"

  local a0_start a0_end a0_latency a0_json
  a0_start=$(date +%s%N)
  spin_start "A0 health..."
  a0_json=$(curl -s --max-time "$API_TIMEOUT" "$A0_HEALTH_URL" 2>/dev/null)
  a0_end=$(date +%s%N)
  spin_stop

  if [ -n "$a0_json" ]; then
    a0_latency=$(( (a0_end - a0_start) / 1000000 ))
    local a0_error a0_sha

    # Status + latency + SHA on one line
    local status_str
    if [ "$a0_latency" -lt 1000 ]; then
      status_str=$(printf '%b✅ Online%b %b%sms%b' "$GRN" "$RST" "$DIM" "$a0_latency" "$RST")
    else
      status_str=$(printf '%b⚠ Slow%b %b%sms%b' "$YLW" "$RST" "$YLW" "$a0_latency" "$RST")
    fi

    a0_sha=$(echo "$a0_json" | jq -r '.gitinfo // empty' 2>/dev/null)
    if [ -n "$a0_sha" ] && [ "$a0_sha" != "null" ]; then
      status_str+=$(printf '  %bSHA:%b%b%s%b' "$SLT" "$RST" "$DIM" "${a0_sha:0:8}" "$RST")
    fi

    box_line "$(printf '%s  %bHost:%b%b%s%b  %b3 containers%b' \
      "$status_str" "$SLT" "$RST" "$DIM" "$A0_HOST" "$RST" "$DIM" "$RST")"

    # Error if present
    a0_error=$(echo "$a0_json" | jq -r '.error // empty' 2>/dev/null)
    if [ -n "$a0_error" ] && [ "$a0_error" != "null" ]; then
      box_line "$(printf '%b⚙ %s%b' "$DIM" "${a0_error:0:80}" "$RST")"
    fi
  else
    box_line "$(printf '%b❌ Недоступен%b  %bssh agentzero docker ps%b' "$RED" "$RST" "$DIM" "$RST")"
  fi

  # ═══════════════════════════════════════════════════
  # ── Local Services ──
  # ═══════════════════════════════════════════════════
  section_header "⚡" "ЛОКАЛЬНЫЕ СЕРВИСЫ" "$VIO"

  # VoiceServer
  local vs_http vs_str
  vs_http=$(curl -s --max-time 2 -o /dev/null -w "%{http_code}" "http://localhost:8888/health" 2>/dev/null)
  if [ "$vs_http" = "200" ]; then
    vs_str=$(printf '%b✅%b %bVoice%b %b:8888%b' "$GRN" "$RST" "$WHT" "$RST" "$DIM" "$RST")
  elif [ -n "$vs_http" ] && [ "$vs_http" != "000" ]; then
    vs_str=$(printf '%b⚠%b  %bVoice%b %bHTTP %s%b' "$YLW" "$RST" "$WHT" "$RST" "$DIM" "$vs_http" "$RST")
  else
    vs_str=$(printf '%b❌%b %bVoice%b' "$RED" "$RST" "$WHT" "$RST")
  fi

  # Z.AI
  local zai_str
  local zai_key
  zai_key=$(grep '^ZAI_API_KEY=' "$HOME/.config/PAI/.env" 2>/dev/null | cut -d= -f2)
  if [ -n "$zai_key" ]; then
    zai_str=$(printf '%b✅%b %bZ.AI%b %bGLM-5%b' "$GRN" "$RST" "$WHT" "$RST" "$DIM" "$RST")
  else
    zai_str=$(printf '%b⚠%b  %bZ.AI%b %bno key%b' "$YLW" "$RST" "$WHT" "$RST" "$DIM" "$RST")
  fi

  box_line "$(printf '%s          %s' "$vs_str" "$zai_str")"

  # ═══════════════════════════════════════════════════
  # ── Jules Sessions ──
  # ═══════════════════════════════════════════════════
  section_header "📋" "JULES" "$YLW"

  local jules_out
  spin_start "Jules API..."
  jules_out=$(cd "$HOME/.claude" && timeout "$API_TIMEOUT" bun "$JULES_TOOL" sessions 2>/dev/null)
  spin_stop

  if [ -n "$jules_out" ]; then
    local clean_out
    # shellcheck disable=SC2001
    clean_out=$(echo "$jules_out" | sed 's/\x1b\[[0-9;]*m//g')

    local in_progress completed failed
    in_progress=$(echo "$clean_out" | grep -c "IN_PROGRESS")
    completed=$(echo "$clean_out" | grep -c "COMPLETED")
    failed=$(echo "$clean_out" | grep -c "FAILED")

    local summary=""
    summary+=$(printf '%b▸%b%b%s%b %bработе%b' "$YLW" "$RST" "$WHT" "$in_progress" "$RST" "$SLT" "$RST")
    summary+=$(printf '  %b▸%b%b%s%b %bготово%b' "$GRN" "$RST" "$WHT" "$completed" "$RST" "$SLT" "$RST")
    if [ "$failed" -gt 0 ] 2>/dev/null; then
      summary+=$(printf '  %b▸%b%b%s%b %bошибки%b' "$RED" "$RST" "$WHT" "$failed" "$RST" "$SLT" "$RST")
    fi
    box_line "$summary"

    # Active sessions
    if [ "$in_progress" -gt 0 ] 2>/dev/null; then
      echo "$clean_out" | grep "IN_PROGRESS" | while IFS= read -r line; do
        local title
        title=$(echo "$line" | sed 's/^[^|]*|[[:space:]]*//' | sed 's/[[:space:]]*|.*//')
        title=$(truncate "$title" 70)
        [ -n "$title" ] && box_line "$(printf '  %b⚡%b %b%s%b' "$YLW" "$RST" "$WHT" "$title" "$RST")"
      done
    fi
  else
    box_line "$(printf '%bAPI недоступен%b' "$DIM" "$RST")"
  fi

  # ═══════════════════════════════════════════════════
  # ── AutoMerge Pipeline ──
  # ═══════════════════════════════════════════════════
  section_header "🔀" "AUTOMERGE" "$GRN"

  if [ -f "$JAM_STATE" ]; then
    local merged failed_am skipped last_check
    merged=$(jq -r '.stats.totalMerged // 0' "$JAM_STATE" 2>/dev/null)
    failed_am=$(jq -r '.stats.totalFailed // 0' "$JAM_STATE" 2>/dev/null)
    skipped=$(jq -r '.stats.totalSkipped // 0' "$JAM_STATE" 2>/dev/null)
    last_check=$(jq -r '.lastCheck // "never"' "$JAM_STATE" 2>/dev/null)

    local check_time="—"
    if [ "$last_check" != "never" ] && [ "$last_check" != "null" ]; then
      check_time=$(echo "$last_check" | sed 's/T/ /' | cut -c1-19)
    fi

    box_line "$(printf '%b+%s%b  %b✗%s%b  %b~%s%b          %bcheck: %s%b' \
      "$GRN" "$merged" "$RST" "$RED" "$failed_am" "$RST" "$SLT" "$skipped" "$RST" \
      "$DIM" "$check_time" "$RST")"

    # Last 5 processed
    local recent
    recent=$(jq -r '.processedSessions[-5:][] | "\(.result) #\(.prNumber) \(.processedAt | split("T")[0])"' "$JAM_STATE" 2>/dev/null)
    if [ -n "$recent" ]; then
      echo "$recent" | while IFS= read -r entry; do
        local result prnum pdate
        result=$(echo "$entry" | cut -d' ' -f1)
        prnum=$(echo "$entry" | cut -d' ' -f2)
        pdate=$(echo "$entry" | cut -d' ' -f3)
        case "$result" in
          merged)        box_line "$(printf '  %b+%b %b%-8s%b %b%s%b' "$GRN" "$RST" "$WHT" "$prnum" "$RST" "$DIM" "$pdate" "$RST")" ;;
          failed_tests)  box_line "$(printf '  %b✗%b %b%-8s%b %btests%b %b%s%b' "$RED" "$RST" "$WHT" "$prnum" "$RST" "$RED" "$RST" "$DIM" "$pdate" "$RST")" ;;
          failed_merge)  box_line "$(printf '  %b✗%b %b%-8s%b %bmerge%b %b%s%b' "$RED" "$RST" "$WHT" "$prnum" "$RST" "$RED" "$RST" "$DIM" "$pdate" "$RST")" ;;
          failed_review) box_line "$(printf '  %b!%b %b%-8s%b %breview%b %b%s%b' "$YLW" "$RST" "$WHT" "$prnum" "$RST" "$YLW" "$RST" "$DIM" "$pdate" "$RST")" ;;
          skipped)       box_line "$(printf '  %b~ %-8s %s%b' "$DIM" "$prnum" "$pdate" "$RST")" ;;
        esac
      done
    fi
  else
    box_line "$(printf '%bНет данных%b %b(bun JulesAutoMerge.ts merge)%b' "$SLT" "$RST" "$DIM" "$RST")"
  fi

  # ── Open PRs ──
  box_sep
  local open_prs pr_line
  pr_line=$(printf '%bOpen PRs:%b ' "$SLT" "$RST")
  if open_prs=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --json number,title 2>/dev/null) && [ -n "$open_prs" ]; then
    local pr_count
    pr_count=$(echo "$open_prs" | jq 'length' 2>/dev/null || echo "?")
    if [ "$pr_count" -gt 0 ]; then
      pr_line+=$(printf '%b%b%s%b' "$YLW" "$BLD" "$pr_count" "$RST")
      box_line "$pr_line"
      echo "$open_prs" | jq -r '.[] | "#\(.number) \(.title[:60])"' 2>/dev/null | while IFS= read -r pr; do
        box_line "$(printf '  %b→%b %b%s%b' "$BLU" "$RST" "$WHT" "$pr" "$RST")"
      done
    else
      pr_line+=$(printf '%b0%b %b(чисто)%b' "$GRN" "$RST" "$DIM" "$RST")
      box_line "$pr_line"
    fi
  else
    pr_line+=$(printf '%b?%b' "$DIM" "$RST")
    box_line "$pr_line"
  fi

  # ── Dynamic tab color ──
  if [ -n "$a0_json" ]; then
    tab_ok
  else
    tab_crit
  fi

  # ── Footer ──
  box_sep
  local footer_left footer_right
  footer_left=$(printf '%b↻ %sс │ r = обновить │ q = выход%b' "$DIM" "$INTERVAL" "$RST")
  footer_right=$(printf '%b%s%b' "$DIM" "$(date '+%H:%M')" "$RST")
  box_line "$(printf '%s%*s%s' "$footer_left" "$(( PAI_UI_WIDTH - 4 - $(vwidth "$footer_left") - $(vwidth "$footer_right") ))" "" "$footer_right")"
  box_bot
}

# Initial poll
poll

# Main loop with interruptible sleep
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
