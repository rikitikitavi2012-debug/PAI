#!/bin/bash
# PAI Infra Reference — Infrastructure command cheat sheet for Kitty tab
# Interactive reference card with quick-action shortcuts
# Keys: 1-5 = execute command | r = refresh | q = exit

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

A0_TOOL="$HOME/.claude/PAI/Tools/AgentZero.ts"
HEALTH_TOOL="$HOME/.claude/PAI/Tools/HealthMonitor.ts"

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "Infra"
trap 'alt_screen_exit' EXIT INT TERM

# ═══════════════════════════════════════════════════
# ── Draw reference card ──
# ═══════════════════════════════════════════════════
draw() {
  printf '\033[2J\033[H'

  box_top
  box_line "$(printf '%b%b INFRA REFERENCE%b    %b%s%b' "$CYN" "$BLD" "$RST" "$DIM" "$(date '+%H:%M  %d.%m.%Y')" "$RST")"

  # ── VPS (Agent Zero) ──
  section_header ">" "VPS / Agent Zero" "$VIO"
  box_line "$(printf '%bssh agentzero%b                            %b-- %b' "$GRN" "$RST" "$DIM" "$RST")$(printf '%b%b' "${DIM}connect to VPS${RST}")"
  box_line "$(printf '%bssh agentzero "sudo docker ps"%b            %b-- containers%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bssh agentzero "sudo docker logs .. --tail 50"%b %b-- A0 logs%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bssh agentzero "sudo docker logs .. -f"%b      %b-- logs live%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bssh agentzero "sudo docker restart .."%b      %b-- restart A0%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bssh agentzero "sudo docker stats --no-stream"%b %b-- resources%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bssh agentzero "df -h && free -h"%b            %b-- disk & RAM%b' "$GRN" "$RST" "$DIM" "$RST")"

  # ── Agent Zero API ──
  section_header ">" "Agent Zero API" "$CYN"
  box_line "$(printf '%bbun AgentZero.ts health%b                   %b-- A0 status%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun AgentZero.ts message "text"%b            %b-- sync msg%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun AgentZero.ts async "task"%b              %b-- fire-forget%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun AgentZero.ts log <ctx_id>%b             %b-- dialog log%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun AgentZero.ts terminate <ctx_id>%b       %b-- end dialog%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun AgentZero.ts scheduler list%b           %b-- cron tasks%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun AgentZero.ts scheduler results%b        %b-- task results%b' "$GRN" "$RST" "$DIM" "$RST")"

  # ── Local Services ──
  section_header ">" "Local Services" "$GRN"
  box_line "$(printf '%bcurl localhost:8888/health%b                %b-- VoiceServer%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun HealthMonitor.ts%b                      %b-- all 5 services%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun JulesAutoMerge.ts status%b              %b-- automerge status%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bbun JulesAutoMerge.ts merge%b               %b-- run automerge%b' "$GRN" "$RST" "$DIM" "$RST")"

  # ── Cron / Logs ──
  section_header ">" "Cron & Logs" "$YLW"
  box_line "$(printf '%bcrontab -l%b                                %b-- scheduled jobs%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bhealth-$(date +%%Y-%%m-%%d).jsonl%b              %b-- health logs today%b' "$GRN" "$RST" "$DIM" "$RST")"
  box_line "$(printf '%bjules-automerge.json | jq%b                 %b-- automerge state%b' "$GRN" "$RST" "$DIM" "$RST")"

  # ── Quick Actions ──
  box_sep
  box_line ""
  box_line "$(printf '%b%bQUICK ACTIONS:%b' "$BLD" "$CYN" "$RST")"
  box_line "$(printf '  %b[1]%b SSH to VPS   %b[2]%b Docker PS   %b[3]%b A0 Logs (tail 50)' "$VIO" "$RST" "$VIO" "$RST" "$VIO" "$RST")"
  box_line "$(printf '  %b[4]%b A0 Health    %b[5]%b HealthMonitor (all services)' "$VIO" "$RST" "$VIO" "$RST")"
  box_line "$(printf '  %b[r]%b Refresh      %b[q]%b Exit' "$DIM" "$RST" "$DIM" "$RST")"
  box_line ""
  box_bot
}

# ═══════════════════════════════════════════════════
# ── Execute command and return to reference ──
# ═══════════════════════════════════════════════════
run_cmd() {
  alt_screen_exit
  printf '\033[2J\033[H'
  printf '%b%b> %s%b\n\n' "$VIO" "$BLD" "$1" "$RST"
  eval "$2"
  printf '\n%b--- Press any key to return ---%b' "$DIM" "$RST"
  read -rsn1
  alt_screen_enter
}

# ═══════════════════════════════════════════════════
# ── Main loop ──
# ═══════════════════════════════════════════════════
draw

while true; do
  read -rsn1 -t 60 key
  case "$key" in
    1) run_cmd "SSH to VPS" "ssh agentzero" ;;
    2) run_cmd "Docker PS" "ssh agentzero 'sudo docker ps'" ;;
    3) run_cmd "A0 Logs (tail 50)" "ssh agentzero 'sudo docker logs agent-zero-new --tail 50'" ;;
    4) run_cmd "A0 Health" "bun '$A0_TOOL' health" ;;
    5) run_cmd "HealthMonitor" "bun '$HEALTH_TOOL'" ;;
    r|R) ;;
    q|Q) break ;;
    *) continue ;;
  esac
  draw
done
