#!/bin/bash
# Brigade Watch — AI Brigade Dashboard for Kitty
# Polls: Agent Zero health, Jules sessions, JulesAutoMerge status
# Refresh: every 30 seconds | Exit: Ctrl+C | r = refresh now

export PATH="$HOME/.bun/bin:$PATH"
# VPN proxy required for Jules API and GitHub CLI
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"

A0_HOST="72.56.86.51:50002"
A0_HEALTH_URL="http://${A0_HOST}/health"
JULES_TOOL="$HOME/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts"
JAM_STATE="$HOME/.claude/MEMORY/STATE/jules-automerge.json"

INTERVAL=30
API_TIMEOUT=10

# ── Colors (24-bit RGB matching PAI palette) ──
RST='\e[0m'
BLD='\e[1m'
DIM='\e[2m'
# Semantic
GRN='\e[38;2;74;222;128m'    # emerald — success
RED='\e[38;2;251;113;133m'    # rose — error
YLW='\e[38;2;251;191;36m'     # amber — warning/in-progress
CYN='\e[38;2;103;232;249m'    # cyan — info
SLT='\e[38;2;148;163;184m'    # slate — dim text
SEP='\e[38;2;71;85;105m'      # separator lines
BLU='\e[38;2;59;130;246m'     # blue — accents
VIO='\e[38;2;167;139;250m'    # violet — headers
WHT='\e[38;2;203;213;225m'    # white — values

separator() {
  printf "%b" "${SEP}"
  printf '─%.0s' {1..48}
  printf "%b\n" "${RST}"
}

section_header() {
  local icon="$1" title="$2" color="$3"
  printf "\n%b%b%s %s%b\n" "${color}" "${BLD}" "${icon}" "${title}" "${RST}"
  separator
}

poll() {
  clear
  local now
  now=$(date '+%H:%M:%S')

  # ── Header ──
  printf "%b┌──────────────────────────────────────────────────┐%b\n" "${SEP}" "${RST}"
  printf "%b│%b  %b%b🤖 AI BRIGADE%b  %b│%b  %b%s%b  %b│%b  %b↻ %sс%b          %b│%b\n" "${SEP}" "${RST}" "${VIO}" "${BLD}" "${RST}" "${SLT}" "${RST}" "${WHT}" "${now}" "${RST}" "${SLT}" "${RST}" "${DIM}" "${INTERVAL}" "${RST}" "${SEP}" "${RST}"
  printf "%b└──────────────────────────────────────────────────┘%b\n" "${SEP}" "${RST}"

  # ═══════════════════════════════════════════════════
  # ── Agent Zero ──
  # ═══════════════════════════════════════════════════
  section_header "🧠" "AGENT ZERO" "$CYN"
  printf "  %bHost:%b %b%s%b\n" "${SLT}" "${RST}" "${DIM}" "${A0_HOST}" "${RST}"

  local a0_start a0_end a0_latency a0_json
  a0_start=$(date +%s%N)
  a0_json=$(curl -s --max-time "$API_TIMEOUT" "$A0_HEALTH_URL" 2>/dev/null)
  a0_end=$(date +%s%N)

  if [ -n "$a0_json" ]; then
    a0_latency=$(( (a0_end - a0_start) / 1000000 ))
    local a0_error
    a0_error=$(echo "$a0_json" | jq -r '.error // empty' 2>/dev/null)

    # Status with latency
    if [ "$a0_latency" -lt 1000 ]; then
      printf "  %b✅ Online%b  %b%sms%b\n" "${GRN}" "${RST}" "${SLT}" "${a0_latency}" "${RST}"
    else
      printf "  %b⚠ Slow%b  %b%sms%b\n" "${YLW}" "${RST}" "${YLW}" "${a0_latency}" "${RST}"
    fi

    # Git info or error from A0
    if [ -n "$a0_error" ] && [ "$a0_error" != "null" ]; then
      local short_err
      short_err=$(echo "$a0_error" | head -c 60)
      printf "  %b⚙ %s%b\n" "${DIM}" "${short_err}" "${RST}"
    fi

    # Git SHA if available
    local a0_sha
    a0_sha=$(echo "$a0_json" | jq -r '.gitinfo // empty' 2>/dev/null)
    if [ -n "$a0_sha" ] && [ "$a0_sha" != "null" ]; then
      printf "  %bSHA:%b %b%s%b\n" "${SLT}" "${RST}" "${DIM}" "${a0_sha:0:8}" "${RST}"
    fi

    # Container: Docker containers on the VPS
    printf "  %bContainers:%b %b3%b %b(50001-50003)%b\n" "${SLT}" "${RST}" "${WHT}" "${RST}" "${DIM}" "${RST}"
    printf "  %bPrimary:%b %b50002%b %bbrain%b\n" "${SLT}" "${RST}" "${GRN}" "${RST}" "${DIM}" "${RST}"
  else
    printf "  %b❌ Недоступен%b\n" "${RED}" "${RST}"
    printf "  %bПроверь: ssh agentzero 'docker ps'%b\n" "${DIM}" "${RST}"
  fi

  # ═══════════════════════════════════════════════════
  # ── Jules Sessions ──
  # ═══════════════════════════════════════════════════
  section_header "📋" "JULES — Сессии" "$YLW"

  local jules_out
  jules_out=$(cd "$HOME/.claude" && timeout "$API_TIMEOUT" bun "$JULES_TOOL" sessions 2>/dev/null)

  if [ -n "$jules_out" ]; then
    # Strip ANSI for counting
    local clean_out
    # shellcheck disable=SC2001
    clean_out=$(echo "$jules_out" | sed 's/\x1b\[[0-9;]*m//g')

    # Count states
    local in_progress completed failed
    in_progress=$(echo "$clean_out" | grep -c "IN_PROGRESS")
    completed=$(echo "$clean_out" | grep -c "COMPLETED")
    failed=$(echo "$clean_out" | grep -c "FAILED")

    printf "  %b▸%b %b%s%b %bв работе%b" "${YLW}" "${RST}" "${WHT}" "${in_progress}" "${RST}" "${SLT}" "${RST}"
    printf "  %b▸%b %b%s%b %bготово%b" "${GRN}" "${RST}" "${WHT}" "${completed}" "${RST}" "${SLT}" "${RST}"
    if [ "$failed" -gt 0 ] 2>/dev/null; then
      printf "  %b▸%b %b%s%b %bошибки%b" "${RED}" "${RST}" "${WHT}" "${failed}" "${RST}" "${SLT}" "${RST}"
    fi
    printf "\n"

    # Show active sessions (IN_PROGRESS) with titles
    if [ "$in_progress" -gt 0 ] 2>/dev/null; then
      printf "\n  %bАктивные:%b\n" "${BLD}" "${RST}"
      echo "$clean_out" | grep "IN_PROGRESS" | while IFS= read -r line; do
        local title
        # Format: "* IN_PROGRESS    | Title here | sessions/123"
        title=$(echo "$line" | sed 's/^[^|]*|[[:space:]]*//' | sed 's/[[:space:]]*|.*//' | head -c 50)
        if [ -n "$title" ]; then
          printf "  %b⚡%b %b%s%b\n" "${YLW}" "${RST}" "${WHT}" "${title}" "${RST}"
        fi
      done
    fi
  else
    printf "  %bAPI недоступен или нет сессий%b\n" "${DIM}" "${RST}"
  fi

  # ═══════════════════════════════════════════════════
  # ── AutoMerge Pipeline ──
  # ═══════════════════════════════════════════════════
  section_header "🔀" "AUTOMERGE — Pipeline" "$GRN"

  # Read stats directly from state file (instant, no API call)
  if [ -f "$JAM_STATE" ]; then
    local merged failed_am skipped last_check
    merged=$(jq -r '.stats.totalMerged // 0' "$JAM_STATE" 2>/dev/null)
    failed_am=$(jq -r '.stats.totalFailed // 0' "$JAM_STATE" 2>/dev/null)
    skipped=$(jq -r '.stats.totalSkipped // 0' "$JAM_STATE" 2>/dev/null)
    last_check=$(jq -r '.lastCheck // "never"' "$JAM_STATE" 2>/dev/null)

    # Format last check time
    local check_time="—"
    if [ "$last_check" != "never" ] && [ "$last_check" != "null" ]; then
      check_time=$(echo "$last_check" | sed 's/T/ /' | cut -c1-19)
    fi

    printf "  %b✓%b %b%s%b %bmerged%b" "${GRN}" "${RST}" "${WHT}" "${merged}" "${RST}" "${SLT}" "${RST}"
    printf "  %b✗%b %b%s%b %bfailed%b" "${RED}" "${RST}" "${WHT}" "${failed_am}" "${RST}" "${SLT}" "${RST}"
    printf "  %b~%b %b%s%b %bskipped%b\n" "${DIM}" "${RST}" "${WHT}" "${skipped}" "${RST}" "${SLT}" "${RST}"
    printf "  %bПроверка:%b %b%s%b\n" "${SLT}" "${RST}" "${DIM}" "${check_time}" "${RST}"

    # Show last 5 processed PRs
    local recent
    recent=$(jq -r '.processedSessions[-5:][] | "\(.result) #\(.prNumber) \(.processedAt | split("T")[0])"' "$JAM_STATE" 2>/dev/null)
    if [ -n "$recent" ]; then
      printf "\n  %bПоследние:%b\n" "${SLT}" "${RST}"
      echo "$recent" | while IFS= read -r entry; do
        local result prnum pdate
        result=$(echo "$entry" | cut -d' ' -f1)
        prnum=$(echo "$entry" | cut -d' ' -f2)
        pdate=$(echo "$entry" | cut -d' ' -f3)
        case "$result" in
          merged)       printf "  %b+%b %b%s%b %b%s%b\n" "${GRN}" "${RST}" "${WHT}" "${prnum}" "${RST}" "${SLT}" "${pdate}" "${RST}" ;;
          failed_tests) printf "  %b✗%b %b%s%b %btests%b %b%s%b\n" "${RED}" "${RST}" "${WHT}" "${prnum}" "${RST}" "${RED}" "${RST}" "${SLT}" "${pdate}" "${RST}" ;;
          failed_merge) printf "  %b✗%b %b%s%b %bmerge%b %b%s%b\n" "${RED}" "${RST}" "${WHT}" "${prnum}" "${RST}" "${RED}" "${RST}" "${SLT}" "${pdate}" "${RST}" ;;
          failed_review) printf "  %b!%b %b%s%b %breview%b %b%s%b\n" "${YLW}" "${RST}" "${WHT}" "${prnum}" "${RST}" "${YLW}" "${RST}" "${SLT}" "${pdate}" "${RST}" ;;
          skipped)      printf "  %b~ %s %s%b\n" "${DIM}" "${prnum}" "${pdate}" "${RST}" ;;
        esac
      done
    fi
  else
    printf "  %bНет данных (запусти: bun JulesAutoMerge.ts merge)%b\n" "${DIM}" "${RST}"
  fi

  # Check for open PRs (fast — just gh pr list)
  printf "\n  %bOpen PRs:%b " "${SLT}" "${RST}"
  local open_prs
  if open_prs=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --json number,title 2>/dev/null) && [ -n "$open_prs" ]; then
    local pr_count
    pr_count=$(echo "$open_prs" | jq 'length' 2>/dev/null || echo "?")
    if [ "$pr_count" -gt 0 ]; then
      printf "%b%s%b\n" "${YLW}" "${pr_count}" "${RST}"
      echo "$open_prs" | jq -r '.[] | "#\(.number) \(.title[:45])"' 2>/dev/null | while IFS= read -r pr; do
        printf "  %b→%b %b%s%b\n" "${BLU}" "${RST}" "${WHT}" "${pr}" "${RST}"
      done
    else
      printf "%b0%b %b(чисто)%b\n" "${GRN}" "${RST}" "${DIM}" "${RST}"
    fi
  else
    printf "%b?%b\n" "${DIM}" "${RST}"
  fi

  # ── Footer ──
  printf "\n%b" "${SEP}"
  printf '━%.0s' {1..48}
  printf "%b\n" "${RST}"
  printf "%b ↻ Обновление через %sс │ Ctrl+C выход │ r = обновить%b\n" "${DIM}" "${INTERVAL}" "${RST}"
}

# Initial poll
poll

# Main loop with interruptible sleep
while true; do
  read -r -t "$INTERVAL" -n 1 key 2>/dev/null
  if [[ "$key" == "r" || "$key" == "R" ]]; then
    printf "\n%bОбновляю...%b\n" "${DIM}" "${RST}"
  fi
  poll
done
