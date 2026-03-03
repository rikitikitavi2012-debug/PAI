#!/bin/bash
# Brigade Watch — AI Brigade Dashboard for Kitty
# Polls: Agent Zero health, Jules sessions, JulesAutoMerge status
# Refresh: every 30 seconds | Exit: Ctrl+C | r = refresh now

export PATH="$HOME/.bun/bin:$PATH"
# VPN proxy required for Jules API and GitHub CLI
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"

A0_TOOL="$HOME/.claude/PAI/Tools/AgentZero.ts"
A0_HOST="72.56.86.51:50002"
A0_HEALTH_URL="http://${A0_HOST}/health"
JULES_TOOL="$HOME/.claude/skills/Utilities/Jules/Tools/JulesAPI.ts"
JAM_TOOL="$HOME/.claude/PAI/Tools/JulesAutoMerge.ts"
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
SKY='\e[38;2;56;189;248m'     # sky — labels
SLT='\e[38;2;148;163;184m'    # slate — dim text
SEP='\e[38;2;71;85;105m'      # separator lines
BLU='\e[38;2;59;130;246m'     # blue — accents
VIO='\e[38;2;167;139;250m'    # violet — headers
WHT='\e[38;2;203;213;225m'    # white — values

separator() {
  printf "${SEP}"
  printf '─%.0s' {1..48}
  printf "${RST}\n"
}

section_header() {
  local icon="$1" title="$2" color="$3"
  printf "\n${color}${BLD}${icon} ${title}${RST}\n"
  separator
}

poll() {
  clear
  local now
  now=$(date '+%H:%M:%S')

  # ── Header ──
  printf "${SEP}┌──────────────────────────────────────────────────┐${RST}\n"
  printf "${SEP}│${RST}  ${VIO}${BLD}🤖 AI BRIGADE${RST}  ${SLT}│${RST}  ${WHT}${now}${RST}  ${SLT}│${RST}  ${DIM}↻ ${INTERVAL}с${RST}          ${SEP}│${RST}\n"
  printf "${SEP}└──────────────────────────────────────────────────┘${RST}\n"

  # ═══════════════════════════════════════════════════
  # ── Agent Zero ──
  # ═══════════════════════════════════════════════════
  section_header "🧠" "AGENT ZERO" "$CYN"
  printf "  ${SLT}Host:${RST} ${DIM}${A0_HOST}${RST}\n"

  local a0_start a0_end a0_latency a0_json a0_status
  a0_start=$(date +%s%N)
  a0_json=$(curl -s --max-time "$API_TIMEOUT" "$A0_HEALTH_URL" 2>/dev/null)
  a0_end=$(date +%s%N)

  if [ -n "$a0_json" ]; then
    a0_latency=$(( (a0_end - a0_start) / 1000000 ))
    local a0_error
    a0_error=$(echo "$a0_json" | jq -r '.error // empty' 2>/dev/null)

    # Status with latency
    if [ "$a0_latency" -lt 1000 ]; then
      printf "  ${GRN}✅ Online${RST}  ${SLT}${a0_latency}ms${RST}\n"
    else
      printf "  ${YLW}⚠ Slow${RST}  ${YLW}${a0_latency}ms${RST}\n"
    fi

    # Git info or error from A0
    if [ -n "$a0_error" ] && [ "$a0_error" != "null" ]; then
      local short_err
      short_err=$(echo "$a0_error" | head -c 60)
      printf "  ${DIM}⚙ ${short_err}${RST}\n"
    fi

    # Git SHA if available
    local a0_sha
    a0_sha=$(echo "$a0_json" | jq -r '.gitinfo // empty' 2>/dev/null)
    if [ -n "$a0_sha" ] && [ "$a0_sha" != "null" ]; then
      printf "  ${SLT}SHA:${RST} ${DIM}${a0_sha:0:8}${RST}\n"
    fi

    # Container: Docker containers on the VPS
    printf "  ${SLT}Containers:${RST} ${WHT}3${RST} ${DIM}(50001-50003)${RST}\n"
    printf "  ${SLT}Primary:${RST} ${GRN}50002${RST} ${DIM}brain${RST}\n"
  else
    printf "  ${RED}❌ Недоступен${RST}\n"
    printf "  ${DIM}Проверь: ssh agentzero 'docker ps'${RST}\n"
  fi

  # ═══════════════════════════════════════════════════
  # ── Jules Sessions ──
  # ═══════════════════════════════════════════════════
  section_header "📋" "JULES — Сессии" "$YLW"

  local jules_out jules_rc
  jules_out=$(cd "$HOME/.claude" && timeout "$API_TIMEOUT" bun "$JULES_TOOL" sessions 2>/dev/null)
  jules_rc=$?

  if [ -n "$jules_out" ]; then
    # Strip ANSI for counting
    local clean_out
    clean_out=$(echo "$jules_out" | sed 's/\x1b\[[0-9;]*m//g')

    # Count states
    local in_progress completed failed
    in_progress=$(echo "$clean_out" | grep -c "IN_PROGRESS")
    completed=$(echo "$clean_out" | grep -c "COMPLETED")
    failed=$(echo "$clean_out" | grep -c "FAILED")

    printf "  ${YLW}▸${RST} ${WHT}${in_progress}${RST} ${SLT}в работе${RST}"
    printf "  ${GRN}▸${RST} ${WHT}${completed}${RST} ${SLT}готово${RST}"
    if [ "$failed" -gt 0 ] 2>/dev/null; then
      printf "  ${RED}▸${RST} ${WHT}${failed}${RST} ${SLT}ошибки${RST}"
    fi
    printf "\n"

    # Show active sessions (IN_PROGRESS) with titles
    if [ "$in_progress" -gt 0 ] 2>/dev/null; then
      printf "\n  ${BLD}Активные:${RST}\n"
      echo "$clean_out" | grep "IN_PROGRESS" | while IFS= read -r line; do
        local title
        # Format: "* IN_PROGRESS    | Title here | sessions/123"
        title=$(echo "$line" | sed 's/^[^|]*|[[:space:]]*//' | sed 's/[[:space:]]*|.*//' | head -c 50)
        if [ -n "$title" ]; then
          printf "  ${YLW}⚡${RST} ${WHT}${title}${RST}\n"
        fi
      done
    fi
  else
    printf "  ${DIM}API недоступен или нет сессий${RST}\n"
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

    printf "  ${GRN}✓${RST} ${WHT}${merged}${RST} ${SLT}merged${RST}"
    printf "  ${RED}✗${RST} ${WHT}${failed_am}${RST} ${SLT}failed${RST}"
    printf "  ${DIM}~${RST} ${WHT}${skipped}${RST} ${SLT}skipped${RST}\n"
    printf "  ${SLT}Проверка:${RST} ${DIM}${check_time}${RST}\n"

    # Show last 5 processed PRs
    local recent
    recent=$(jq -r '.processedSessions[-5:][] | "\(.result) #\(.prNumber) \(.processedAt | split("T")[0])"' "$JAM_STATE" 2>/dev/null)
    if [ -n "$recent" ]; then
      printf "\n  ${SLT}Последние:${RST}\n"
      echo "$recent" | while IFS= read -r entry; do
        local result prnum pdate
        result=$(echo "$entry" | cut -d' ' -f1)
        prnum=$(echo "$entry" | cut -d' ' -f2)
        pdate=$(echo "$entry" | cut -d' ' -f3)
        case "$result" in
          merged)       printf "  ${GRN}+${RST} ${WHT}${prnum}${RST} ${SLT}${pdate}${RST}\n" ;;
          failed_tests) printf "  ${RED}✗${RST} ${WHT}${prnum}${RST} ${RED}tests${RST} ${SLT}${pdate}${RST}\n" ;;
          failed_merge) printf "  ${RED}✗${RST} ${WHT}${prnum}${RST} ${RED}merge${RST} ${SLT}${pdate}${RST}\n" ;;
          failed_review) printf "  ${YLW}!${RST} ${WHT}${prnum}${RST} ${YLW}review${RST} ${SLT}${pdate}${RST}\n" ;;
          skipped)      printf "  ${DIM}~ ${prnum} ${pdate}${RST}\n" ;;
        esac
      done
    fi
  else
    printf "  ${DIM}Нет данных (запусти: bun JulesAutoMerge.ts merge)${RST}\n"
  fi

  # Check for open PRs (fast — just gh pr list)
  printf "\n  ${SLT}Open PRs:${RST} "
  local open_prs
  open_prs=$(timeout 5 gh pr list --repo rikitikitavi2012-debug/PAI-personal --state open --json number,title 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$open_prs" ]; then
    local pr_count
    pr_count=$(echo "$open_prs" | jq 'length' 2>/dev/null || echo "?")
    if [ "$pr_count" -gt 0 ]; then
      printf "${YLW}${pr_count}${RST}\n"
      echo "$open_prs" | jq -r '.[] | "#\(.number) \(.title[:45])"' 2>/dev/null | while IFS= read -r pr; do
        printf "  ${BLU}→${RST} ${WHT}${pr}${RST}\n"
      done
    else
      printf "${GRN}0${RST} ${DIM}(чисто)${RST}\n"
    fi
  else
    printf "${DIM}?${RST}\n"
  fi

  # ── Footer ──
  printf "\n${SEP}"
  printf '━%.0s' {1..48}
  printf "${RST}\n"
  printf "${DIM} ↻ Обновление через ${INTERVAL}с │ Ctrl+C выход │ r = обновить${RST}\n"
}

# Initial poll
poll

# Main loop with interruptible sleep
while true; do
  read -t "$INTERVAL" -n 1 key 2>/dev/null
  if [[ "$key" == "r" || "$key" == "R" ]]; then
    printf "\n${DIM}Обновляю...${RST}\n"
  fi
  poll
done
