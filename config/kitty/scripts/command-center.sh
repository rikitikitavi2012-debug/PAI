#!/bin/bash
# PAI Command Center — Operational Pulse for Kitty (Tab 2: ⬢ Center)
# Scope: system health, AI brigade, sessions, PRs, hooks (NO goal/strategy duplication with Telos tab)
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
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

INTERVAL=30
TELOS_JSON="$HOME/.claude/MEMORY/STATE/telos-state.json"
TELOS_PARSER="$HOME/.claude/PAI/Tools/TelosParser.ts"
A0_HEALTH_URL="http://72.56.86.51:50002/health"
WORK_DIR="$HOME/.claude/MEMORY/WORK"
AUTOMERGE_JSON="$HOME/.claude/MEMORY/STATE/jules-automerge.json"
HOOKS_DIR="$HOME/.claude/hooks"
HOOKS_TESTS="$HOME/.claude/hooks/tests"

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

# ── Flicker-free refresh ──
FIRST_RENDER=true

# ═══════════════════════════════════════════════════
# ── Main poll function ──
# ═══════════════════════════════════════════════════
poll() {
  if [ "$FIRST_RENDER" = true ]; then
    printf '\033[2J\033[H'
    FIRST_RENDER=false
  else
    printf '\033[H\033[J'
  fi
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

  # Pulse indicator
  local pulse=" "
  [ $(( 10#$(date +%S) % 2 )) -eq 0 ] && pulse="●"

  # ═══════════════════════════════════════════════════
  # ── 1. Header ──
  # ═══════════════════════════════════════════════════
  box_top
  box_line "$(printf '%b%b⬢ PAI COMMAND CENTER%b                %b%s %s%b %b%s%b %b↻%sс%b' \
    "$VIO" "$BLD" "$RST" "$WHT" "$now_date" "$now_time" "$RST" "$VIO" "$pulse" "$RST" "$DIM" "$INTERVAL" "$RST")"

  # ═══════════════════════════════════════════════════
  # ── 2. Two-column: СИСТЕМА + AI БРИГАДА ──
  # ═══════════════════════════════════════════════════
  two_col_top
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
  spin_start "A0..."
  a0_json=$(curl -s --max-time 10 "$A0_HEALTH_URL" 2>/dev/null)
  spin_stop
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
  # Jules open PRs (cache for reuse in PR section)
  local jules_pr_json jules_prs="?"
  jules_pr_json=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --json number,title --limit 5 2>/dev/null)
  jules_prs=$(echo "$jules_pr_json" | jq 'length' 2>/dev/null || echo "?")

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

  two_col_bot
  box_line ""
  section_header "💼" "АКТИВНЫЕ СЕССИИ" "$BLU"

  # Parse recent WORK directories (last 5 with META.yaml)
  local session_count=0
  if [ -d "$WORK_DIR" ]; then
    while IFS= read -r meta_file; do
      [ "$session_count" -ge 5 ] && break
      local s_title s_status s_created s_dir s_age_str
      s_dir=$(dirname "$meta_file")
      s_title=$(grep '^title:' "$meta_file" 2>/dev/null | sed 's/^title: *//; s/^"//; s/"$//')
      s_status=$(grep '^status:' "$meta_file" 2>/dev/null | sed 's/^status: *//; s/^"//; s/"$//')
      s_created=$(grep '^created_at:' "$meta_file" 2>/dev/null | sed 's/^created_at: *//; s/^"//; s/"$//')
      [ -z "$s_title" ] && continue

      # Age calculation
      local s_epoch now_epoch s_ago
      now_epoch=$(date +%s)
      s_epoch=$(date -d "$s_created" +%s 2>/dev/null || echo "$now_epoch")
      s_ago=$(( (now_epoch - s_epoch) / 3600 ))
      if [ "$s_ago" -lt 1 ]; then
        s_age_str="<1ч"
      elif [ "$s_ago" -lt 24 ]; then
        s_age_str="${s_ago}ч"
      else
        s_age_str="$(( s_ago / 24 ))д"
      fi

      # Status icon
      local s_icon
      case "$s_status" in
        ACTIVE)    s_icon=$(printf '%b⚡%b' "$YLW" "$RST") ;;
        COMPLETED) s_icon=$(printf '%b✅%b' "$GRN" "$RST") ;;
        *)         s_icon=$(printf '%b○%b' "$SLT" "$RST") ;;
      esac

      # Truncate title
      local name_max=$((PAI_UI_WIDTH - 24))
      local short_title="${s_title:0:$name_max}"

      box_line "$(printf '%s %b%-*s%b %b%4s%b %b%s%b' "$s_icon" "$WHT" "$name_max" "$short_title" "$RST" "$SLT" "$s_age_str" "$RST" "$SLT" "$s_status" "$RST")"
      session_count=$((session_count + 1))
    done < <(find "$WORK_DIR" -maxdepth 2 -name "META.yaml" -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -8 | awk '{print $2}')
  fi

  if [ "$session_count" -eq 0 ]; then
    box_line "$(printf '%bНет активных сессий%b' "$SLT" "$RST")"
  fi
  box_line ""
  section_header "🔗" "PULL REQUESTS" "$ORG"

  # Fetch open PRs from both repos
  local has_prs=false

  # Private repo PRs (Jules) — reuse cached data from section 2
  if [ -n "$jules_pr_json" ] && [ "$jules_pr_json" != "[]" ]; then
    has_prs=true
    echo "$jules_pr_json" | jq -r '.[] | "#\(.number)|\(.title)"' 2>/dev/null | while IFS='|' read -r pr_num pr_title; do
      local pr_max=$((PAI_UI_WIDTH - 28))
      local short_pr="${pr_title:0:$pr_max}"
      box_line "$(printf '%b%-6s%b %b%-*s%b %bprivate%b' "$YLW" "$pr_num" "$RST" "$WHT" "$pr_max" "$short_pr" "$RST" "$SLT" "$RST")"
    done
  fi

  # Public repo PRs (upstream)
  local public_pr_json
  public_pr_json=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI --state open --json number,title --limit 5 2>/dev/null)
  if [ -n "$public_pr_json" ] && [ "$public_pr_json" != "[]" ]; then
    has_prs=true
    echo "$public_pr_json" | jq -r '.[] | "#\(.number)|\(.title)"' 2>/dev/null | while IFS='|' read -r pr_num pr_title; do
      local pr_max=$((PAI_UI_WIDTH - 28))
      local short_pr="${pr_title:0:$pr_max}"
      box_line "$(printf '%b%-6s%b %b%-*s%b %bpublic%b' "$CYN" "$pr_num" "$RST" "$WHT" "$pr_max" "$short_pr" "$RST" "$SLT" "$RST")"
    done
  fi

  if [ "$has_prs" = false ]; then
    box_line "$(printf '%bНет открытых PR%b' "$SLT" "$RST")"
  fi
  box_line ""

  # ═══════════════════════════════════════════════════
  # ── 5. Two-column: ХУКИ & ТЕСТЫ + АВТОМЕРЖ ──
  # ═══════════════════════════════════════════════════
  two_col_top
  two_col \
    "$(printf '%b%b ХУКИ & ТЕСТЫ%b' "$CYN" "$BLD" "$RST")" \
    "$(printf '%b%b АВТОМЕРЖ%b' "$VIO" "$BLD" "$RST")"
  two_col_mid

  # Left: hook health
  local hook_file_count test_file_count
  hook_file_count=$(find "$HOOKS_DIR" -maxdepth 1 -name "*.hook.ts" 2>/dev/null | wc -l)
  test_file_count=$(find "$HOOKS_TESTS" -maxdepth 1 -name "*.test.ts" 2>/dev/null | wc -l)

  # Right: AutoMerge pipeline stats (from JSON directly, not telos-state)
  local am_total am_merged_d am_failed_d am_skipped_d am_last
  if [ -f "$AUTOMERGE_JSON" ]; then
    am_total=$(jq '.processedSessions | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_merged_d=$(jq '[.processedSessions[] | select(.result == "merged")] | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_failed_d=$(jq '[.processedSessions[] | select(.result | startswith("failed"))] | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_skipped_d=$(jq '[.processedSessions[] | select(.result == "skipped")] | length' "$AUTOMERGE_JSON" 2>/dev/null || echo 0)
    am_last=$(jq -r '.lastCheck // empty' "$AUTOMERGE_JSON" 2>/dev/null | head -c 16 | sed 's/T/ /')
  else
    am_total=0; am_merged_d=0; am_failed_d=0; am_skipped_d=0; am_last="—"
  fi

  two_col \
    "$(printf '%bХуков%b   %b%b%s%b %bфайлов%b' "$SLT" "$RST" "$WHT" "$BLD" "$hook_file_count" "$RST" "$SLT" "$RST")" \
    "$(printf '%bВсего%b   %b%b%s%b %bсессий%b' "$SLT" "$RST" "$WHT" "$BLD" "$am_total" "$RST" "$SLT" "$RST")"

  two_col \
    "$(printf '%bТестов%b  %b%b%s%b %bсьютов%b' "$SLT" "$RST" "$WHT" "$BLD" "$test_file_count" "$RST" "$SLT" "$RST")" \
    "$(printf '%b+%s%b %b✗%s%b %b~%s%b' "$GRN" "$am_merged_d" "$RST" "$RED" "$am_failed_d" "$RST" "$SLT" "$am_skipped_d" "$RST")"

  two_col \
    "$(printf '%bEvents%b  %b24ч:%b%b%b%s%b  %b7д:%b%b%b%s%b' "$SLT" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$events_24h" "$RST" "$SLT" "$RST" "$WHT" "$BLD" "$events_7d" "$RST")" \
    "$(printf '%bПосл:%b %b%s%b' "$SLT" "$RST" "$WHT" "$am_last" "$RST")"

  two_col_bot

  # ── Dynamic tab color ──
  if [ "$vs_http" = "200" ] && [ -n "$a0_json" ]; then
    tab_ok
  elif [ "$vs_http" != "200" ] || [ -z "$a0_json" ]; then
    tab_warn
  fi

  # ── Footer ──
  box_sep
  box_line "$(printf '%b%s │ r = обновить │ q = выход%b' "$DIM" "$(date '+%H:%M')" "$RST")"
  box_bot
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
