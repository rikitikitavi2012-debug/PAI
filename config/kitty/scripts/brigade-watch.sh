#!/bin/bash
# Brigade Watch — AI Brigade Dashboard for Kitty
# Shows all 7 brigade members grouped by tier (T1/T2/T3)
# Polls: Agent Zero health, Jules sessions, JulesAutoMerge status
# Refresh: every 30 seconds | Exit: Ctrl+C | r = refresh now

export PATH="$HOME/.bun/bin:$HOME/.npm-global/bin:$HOME/.opencode/bin:$PATH"
# VPN proxy required for Jules API and GitHub CLI
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"
# A0 is direct WAN — bypass proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"

A0_HOST="72.56.86.51:50002"
A0_HEALTH_URL="http://${A0_HOST}/health"
A0_ENV="$HOME/.config/PAI/.env"
A0_TOKEN=""
if [ -f "$A0_ENV" ]; then
  A0_TOKEN=$(grep '^A0_API_TOKEN=' "$A0_ENV" | cut -d= -f2-)
fi
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
  box_line "$(printf '%b%b🤖 AI BRIGADE%b  %b7 members (4 T1 · 1 T2 · 2 T3)%b   %b%s%b %b%s%b  %b↻%sс%b' \
    "$VIO" "$BLD" "$RST" "$DIM" "$RST" "$WHT" "$now" "$RST" "$VIO" "$pulse" "$RST" "$DIM" "$INTERVAL" "$RST")"

  # ═══════════════════════════════════════════════════
  # ── T1 АВТОНОМНЫЕ АГЕНТЫ ──
  # ═══════════════════════════════════════════════════
  section_header "🚀" "T1 АВТОНОМНЫЕ АГЕНТЫ" "$CYN"

  # --- Navi (always online — this IS the Claude Code session) ---
  box_line "$(printf '  %bNavi%b      %b✅%b %bClaude Code%b' "$WHT" "$RST" "$GRN" "$RST" "$DIM" "$RST")"

  # --- Agent Zero ---
  local a0_start a0_end a0_latency a0_json
  a0_start=$(date +%s%N)
  spin_start "A0 health..."
  a0_json=$(curl -s --max-time "$API_TIMEOUT" "$A0_HEALTH_URL" 2>/dev/null)
  a0_end=$(date +%s%N)
  spin_stop

  if [ -n "$a0_json" ]; then
    a0_latency=$(( (a0_end - a0_start) / 1000000 ))

    # Parse fields cleanly — avoid JSON leak
    local a0_sha_raw _a0_sha_short _a0_branch a0_containers
    a0_sha_raw=$(echo "$a0_json" | jq -r '.gitinfo.sha // .sha // empty' 2>/dev/null)
    [ -z "$a0_sha_raw" ] && a0_sha_raw=$(echo "$a0_json" | jq -r '.gitinfo // empty' 2>/dev/null)
    # If gitinfo is a JSON object stringified or raw, extract just the sha
    if echo "$a0_sha_raw" | jq -r '.sha' >/dev/null 2>&1; then
      local parsed_sha
      parsed_sha=$(echo "$a0_sha_raw" | jq -r '.sha // empty' 2>/dev/null)
      [ -n "$parsed_sha" ] && a0_sha_raw="$parsed_sha"
    fi
    _a0_sha_short="${a0_sha_raw:0:8}"
    _a0_branch=$(echo "$a0_json" | jq -r '.gitinfo.branch // .branch // empty' 2>/dev/null)
    a0_containers=$(echo "$a0_json" | jq -r '.containers // 3' 2>/dev/null)

    local a0_status_icon a0_status_color
    if [ "$a0_latency" -lt 1000 ]; then
      a0_status_icon="✅"
      a0_status_color="$GRN"
    else
      a0_status_icon="⚠"
      a0_status_color="$YLW"
    fi

    local a0_line
    a0_line=$(printf '  %bA0%b        %b%s%b %b%sms%b  %b%s%b' \
      "$WHT" "$RST" "$a0_status_color" "$a0_status_icon" "$RST" "$DIM" "$a0_latency" "$RST" "$DIM" "72.56.86.51" "$RST")
    [ -n "$a0_containers" ] && [ "$a0_containers" != "null" ] && \
      a0_line+=$(printf '  %b%s containers%b' "$DIM" "$a0_containers" "$RST")
    box_line "$a0_line"

    # Error if present
    local a0_error
    a0_error=$(echo "$a0_json" | jq -r '.error // empty' 2>/dev/null)
    if [ -n "$a0_error" ] && [ "$a0_error" != "null" ]; then
      box_line "$(printf '            %b⚙ %s%b' "$DIM" "${a0_error:0:70}" "$RST")"
    fi
  else
    box_line "$(printf '  %bA0%b        %b❌%b %bНедоступен%b' "$WHT" "$RST" "$RED" "$RST" "$DIM" "$RST")"
  fi

  # --- Jules (from API) ---
  local jules_out
  spin_start "Jules API..."
  jules_out=$(cd "$HOME/.claude" && timeout "$API_TIMEOUT" bun "$JULES_TOOL" sessions 2>/dev/null)
  spin_stop

  if [ -n "$jules_out" ]; then
    local clean_out
    # shellcheck disable=SC2001
    clean_out=$(echo "$jules_out" | sed 's/\x1b\[[0-9;]*m//g')

    local in_progress completed
    in_progress=$(echo "$clean_out" | grep -c "IN_PROGRESS" || true)
    completed=$(echo "$clean_out" | grep -c "COMPLETED" || true)
    # sessions output may be truncated — count from summary line if present
    local summary_total
    summary_total=$(echo "$clean_out" | grep -oP '\d+ sessions?' | head -1 | grep -oP '\d+' || true)
    if [ -n "$summary_total" ] && [ "$summary_total" -gt "$((in_progress + completed))" ] 2>/dev/null; then
      completed=$((summary_total - in_progress))
    fi

    box_line "$(printf '  %bJules%b     %b▸%b%b%s%b %bработе%b  %b▸%b%b%s%b %bготово%b' \
      "$WHT" "$RST" "$YLW" "$RST" "$WHT" "$in_progress" "$RST" "$SLT" "$RST" \
      "$GRN" "$RST" "$WHT" "$completed" "$RST" "$SLT" "$RST")"
  else
    box_line "$(printf '  %bJules%b     %bAPI недоступен%b' "$WHT" "$RST" "$DIM" "$RST")"
  fi

  # --- OpenCode ---
  local oc_str
  if command -v opencode >/dev/null 2>&1; then
    oc_str=$(printf '  %bOpenCode%b  %b✅%b %bok%b' "$WHT" "$RST" "$GRN" "$RST" "$DIM" "$RST")
  else
    oc_str=$(printf '  %bOpenCode%b  %b❌%b %bне найден%b' "$WHT" "$RST" "$RED" "$RST" "$DIM" "$RST")
  fi
  box_line "$oc_str"

  # ═══════════════════════════════════════════════════
  # ── T2 CLI АГЕНТЫ ──
  # ═══════════════════════════════════════════════════
  section_header "💻" "T2 CLI АГЕНТЫ" "$VIO"

  local gem_str
  if command -v gemini >/dev/null 2>&1; then
    gem_str=$(printf '  %bGemini%b    %b✅%b %bok%b' "$WHT" "$RST" "$GRN" "$RST" "$DIM" "$RST")
  else
    gem_str=$(printf '  %bGemini%b    %b❌%b %bне найден%b' "$WHT" "$RST" "$RED" "$RST" "$DIM" "$RST")
  fi
  box_line "$gem_str"

  # ═══════════════════════════════════════════════════
  # ── T3 ИНСТРУМЕНТЫ ──
  # ═══════════════════════════════════════════════════
  section_header "🔧" "T3 ИНСТРУМЕНТЫ" "$ORG"

  # VoiceServer
  local vs_http vs_str
  vs_http=$(curl -s --max-time 2 -o /dev/null -w "%{http_code}" "http://localhost:8888/health" 2>/dev/null)
  if [ "$vs_http" = "200" ]; then
    vs_str=$(printf '  %bVoice%b     %b✅%b %b:8888%b' "$WHT" "$RST" "$GRN" "$RST" "$DIM" "$RST")
  elif [ -n "$vs_http" ] && [ "$vs_http" != "000" ]; then
    vs_str=$(printf '  %bVoice%b     %b⚠%b  %bHTTP %s%b' "$WHT" "$RST" "$YLW" "$RST" "$DIM" "$vs_http" "$RST")
  else
    vs_str=$(printf '  %bVoice%b     %b❌%b' "$WHT" "$RST" "$RED" "$RST")
  fi
  box_line "$vs_str"

  # Z.AI
  local zai_str zai_key
  zai_key=$(grep '^ZAI_API_KEY=' "$HOME/.config/PAI/.env" 2>/dev/null | cut -d= -f2)
  if [ -n "$zai_key" ]; then
    zai_str=$(printf '  %bZ.AI%b      %b✅%b %bGLM-5%b' "$WHT" "$RST" "$GRN" "$RST" "$DIM" "$RST")
  else
    zai_str=$(printf '  %bZ.AI%b      %b⚠%b  %bno key%b' "$WHT" "$RST" "$YLW" "$RST" "$DIM" "$RST")
  fi
  box_line "$zai_str"

  # ═══════════════════════════════════════════════════
  # ── Jules Active Sessions ──
  # ═══════════════════════════════════════════════════
  if [ -n "$jules_out" ] && [ "$in_progress" -gt 0 ] 2>/dev/null; then
    section_header "📋" "JULES АКТИВНЫЕ" "$YLW"
    echo "$clean_out" | grep "IN_PROGRESS" | while IFS= read -r line; do
      local title
      title=$(echo "$line" | sed 's/^[^|]*|[[:space:]]*//' | sed 's/[[:space:]]*|.*//')
      title=$(truncate "$title" 70)
      [ -n "$title" ] && box_line "$(printf '  %b⚡%b %b%s%b' "$YLW" "$RST" "$WHT" "$title" "$RST")"
    done
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

    # Stale indicator: warn if lastCheck > 24h ago
    local stale_tag=""
    if [ "$last_check" != "never" ] && [ "$last_check" != "null" ]; then
      local check_epoch now_epoch check_age_h
      check_epoch=$(date -d "$last_check" +%s 2>/dev/null || echo 0)
      now_epoch=$(date +%s)
      check_age_h=$(( (now_epoch - check_epoch) / 3600 ))
      if [ "$check_age_h" -ge 24 ]; then
        stale_tag=$(printf ' %b⚠ %sд назад%b' "$YLW" "$((check_age_h / 24))" "$RST")
      fi
    fi

    box_line "$(printf '%b+%s%b  %b✗%s%b  %b~%s%b          %bcheck: %s%b%s' \
      "$GRN" "$merged" "$RST" "$RED" "$failed_am" "$RST" "$SLT" "$skipped" "$RST" \
      "$DIM" "$check_time" "$RST" "$stale_tag")"

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

  # ═══════════════════════════════════════════════════
  # ── A0 Scheduled Tasks ──
  # ═══════════════════════════════════════════════════
  section_header "📋" "A0 TASKS" "$CYN"

  if [ -n "$a0_json" ]; then
    # Live scheduler API (CSRF bypass via API key)
    local sched_json=""
    if [ -n "$A0_TOKEN" ]; then
      sched_json=$(curl -s -m "$API_TIMEOUT" -X POST "http://${A0_HOST}/scheduler_tasks_list" \
        -H "Content-Type: application/json" -H "X-API-KEY: $A0_TOKEN" \
        -d '{"timezone": "Europe/Moscow"}' 2>/dev/null)
    fi

    local tasks_ok=""
    tasks_ok=$(echo "$sched_json" | jq -r '.ok // false' 2>/dev/null)

    if [ "$tasks_ok" = "true" ]; then
      # Cache for offline fallback
      echo "$sched_json" | jq -c '.tasks' > "$HOME/.claude/MEMORY/STATE/a0-scheduler-cache.json" 2>/dev/null
      local tasks_line=""
      while IFS= read -r task_entry; do
        [ -z "$task_entry" ] && continue
        local tname tstate ttype
        tname=$(echo "$task_entry" | jq -r '.name // "?"' 2>/dev/null)
        tname=$(truncate "$tname" 16)
        tstate=$(echo "$task_entry" | jq -r '.state // "?"' 2>/dev/null)
        ttype=$(echo "$task_entry" | jq -r '.type // ""' 2>/dev/null)
        local state_color="$DIM"
        [ "$tstate" = "running" ] && state_color="$GRN"
        [ "$tstate" = "error" ] && state_color="$RED"
        [ -n "$tasks_line" ] && tasks_line+="  "
        tasks_line+=$(printf '%b%s%b %b%s%b' "$WHT" "$tname" "$RST" "$state_color" "$ttype" "$RST")
      done < <(echo "$sched_json" | jq -c '.tasks[]' 2>/dev/null | head -5)
      box_line "${tasks_line:-$(printf '%bзадач нет%b' "$DIM" "$RST")}"
    else
      # Fallback to cache
      local a0_tasks_cache="$HOME/.claude/MEMORY/STATE/a0-scheduler-cache.json"
      if [ -f "$a0_tasks_cache" ]; then
        local tasks_line=""
        while IFS= read -r task_entry; do
          [ -z "$task_entry" ] && continue
          local tname ttype
          tname=$(echo "$task_entry" | jq -r '.name // "?"' 2>/dev/null)
          tname=$(truncate "$tname" 16)
          ttype=$(echo "$task_entry" | jq -r '.type // ""' 2>/dev/null)
          [ -n "$tasks_line" ] && tasks_line+="  "
          tasks_line+=$(printf '%b%s%b %b%s%b' "$WHT" "$tname" "$RST" "$DIM" "$ttype" "$RST")
        done < <(jq -c '.[]' "$a0_tasks_cache" 2>/dev/null | head -5)
        box_line "$(printf '%b(cached)%b ' "$DIM" "$RST")${tasks_line}"
      else
        box_line "$(printf '%bscheduler недоступен%b' "$DIM" "$RST")"
      fi
    fi
  else
    box_line "$(printf '%bA0 offline%b' "$DIM" "$RST")"
  fi

  # ═══════════════════════════════════════════════════
  # ── Health Sparkline ──
  # ═══════════════════════════════════════════════════
  section_header "🏥" "HEALTH" "$GRN"

  local health_dir="$HOME/.claude/MEMORY/STATE/health-logs"
  local today_file
  today_file="$health_dir/health-$(date '+%Y-%m-%d').jsonl"
  local yester_file
  yester_file="$health_dir/health-$(date -d 'yesterday' '+%Y-%m-%d' 2>/dev/null || date -v-1d '+%Y-%m-%d' 2>/dev/null).jsonl"
  local health_entries=""
  [ -f "$yester_file" ] && health_entries+=$(cat "$yester_file" 2>/dev/null)
  [ -f "$yester_file" ] && [ -f "$today_file" ] && health_entries+=$'\n'
  [ -f "$today_file" ] && health_entries+=$(cat "$today_file" 2>/dev/null)

  if [ -n "$health_entries" ]; then
    local sparkline="" last_time="" all_ok=true
    # Parse multi-line pretty JSON: slurp into array, take last 8
    while IFS= read -r hentry; do
      [ -z "$hentry" ] && continue
      local h_ok h_ts
      h_ok=$(echo "$hentry" | jq -r '.allHealthy // false' 2>/dev/null)
      h_ts=$(echo "$hentry" | jq -r '.timestamp // ""' 2>/dev/null)
      if [ "$h_ok" = "true" ]; then
        sparkline+="${GRN}✅${RST}"
      else
        sparkline+="${RED}❌${RST}"
        all_ok=false
      fi
      [ -n "$h_ts" ] && last_time=$(echo "$h_ts" | sed 's/T/ /' | cut -c12-16)
    done < <(echo "$health_entries" | jq -c '.' 2>/dev/null | tail -8)

    local h_status
    if [ "$all_ok" = true ]; then
      h_status=$(printf '%ball OK%b' "$GRN" "$RST")
    else
      h_status=$(printf '%bс ошибками%b' "$YLW" "$RST")
    fi
    box_line "$(printf '%s  %blast: %s%b %s' "$sparkline" "$DIM" "$last_time" "$RST" "$h_status")"
  else
    box_line "$(printf '%bнет данных%b' "$DIM" "$RST")"
  fi

  # ═══════════════════════════════════════════════════
  # ── Cron Activity ──
  # ═══════════════════════════════════════════════════
  section_header "⏱" "CRON" "$SLT"

  local cron_line=""
  # Health cron: last modified health file
  local last_health_file
  last_health_file=$(ls -t "$health_dir"/health-*.jsonl 2>/dev/null | head -1)
  if [ -n "$last_health_file" ]; then
    local h_mtime
    h_mtime=$(date -r "$last_health_file" '+%H:%M' 2>/dev/null || stat -c '%Y' "$last_health_file" 2>/dev/null | xargs -I{} date -d @{} '+%H:%M' 2>/dev/null || echo "?")
    cron_line+=$(printf '%bhealth:%b %b%s%b %b✅%b' "$SLT" "$RST" "$WHT" "$h_mtime" "$RST" "$GRN" "$RST")
  else
    cron_line+=$(printf '%bhealth:%b %b—%b' "$SLT" "$RST" "$DIM" "$RST")
  fi

  # AutoMerge cron
  cron_line+=$(printf '  %b│%b  ' "$SEP" "$RST")
  if [ -f "$JAM_STATE" ]; then
    local am_last am_time am_merged_count
    am_last=$(jq -r '.lastCheck // ""' "$JAM_STATE" 2>/dev/null)
    am_merged_count=$(jq -r '.stats.totalMerged // 0' "$JAM_STATE" 2>/dev/null)
    if [ -n "$am_last" ] && [ "$am_last" != "null" ]; then
      am_time=$(echo "$am_last" | sed 's/T/ /' | cut -c12-16)
      cron_line+=$(printf '%bautomerge:%b %b%s%b' "$SLT" "$RST" "$WHT" "$am_time" "$RST")
      [ "$am_merged_count" -gt 0 ] 2>/dev/null && cron_line+=$(printf ' %b+%sPR%b' "$GRN" "$am_merged_count" "$RST")
    else
      cron_line+=$(printf '%bautomerge:%b %b—%b' "$SLT" "$RST" "$DIM" "$RST")
    fi
  else
    cron_line+=$(printf '%bautomerge:%b %b—%b' "$SLT" "$RST" "$DIM" "$RST")
  fi
  box_line "$cron_line"

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
