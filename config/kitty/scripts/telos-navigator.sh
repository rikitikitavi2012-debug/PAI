#!/bin/bash
# TELOS Navigator — Interactive Detail Panel (Right Pane of TELOS Tab)
# Keyboard-driven explorer for TELOS data
# Modes: goals(g) projects(p) missions(m) challenges(c) strategies(s)
#         wisdom(w) wins(v) blockers(b) help(?)
# In list: 0-9 = select item for detail | Esc = back to list

export PATH="$HOME/.bun/bin:$PATH"
# shellcheck disable=SC1091
[ -f "$HOME/.config/PAI/.env" ] && source "$HOME/.config/PAI/.env"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"

STATE_FILE="$HOME/.claude/MEMORY/STATE/telos-state.json"

MODE="help"       # current view mode
SELECTED=""        # selected item index (empty = list view)
DETAIL_ID=""       # selected item ID (G0, P1, etc.)

# ── Alternate buffer + clean exit ──
alt_screen_enter
set_tab_title "NAV"
trap 'alt_screen_exit' EXIT INT TERM

# ── Render helpers ──

nav_header() {
  local mode_label="$1" mode_color="$2"
  printf '\033[2J\033[H'
  printf "\n  %b%bTELOS NAV%b %b%b %s %b%b\n" \
    "$VIO" "$BLD" "$RST" "$mode_color" "$BLD" "$mode_label" "$RST" "$RST"
  printf '%b%s%b\n' "$SEP" "$(hline 46)" "$RST"
}

nav_footer() {
  printf "\n%b%s%b\n" "$SEP" "$(hline 46)" "$RST"
  if [ -n "$SELECTED" ]; then
    printf " %bEsc=назад  q=выход%b\n" "$SLT" "$RST"
  else
    printf " %bg p m c s w v b ?  q=выход%b\n" "$SLT" "$RST"
  fi
}

# padded print: text + visual width padding (Cyrillic-safe)
pprint() {
  local text="$1" target_w="$2"
  local vw
  vw=$(printf '%s' "$text" | wc -L)
  local pad=$(( target_w - vw ))
  [ "$pad" -lt 0 ] && pad=0
  printf '%s%*s' "$text" "$pad" ""
}

# ── VIEW: Help ──
render_help() {
  nav_header "ПОМОЩЬ" "$VIO"
  # Dynamic counts from state file
  local n_goals n_projects n_missions n_challenges n_strategies n_wisdom n_wins n_blockers
  n_goals=$(jq '.goals | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_projects=$(jq '.projects | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_missions=$(jq '.missions | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_challenges=$(jq '.challenges | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_strategies=$(jq '.strategies | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_wisdom=$(jq '.learning.wisdomQuotes | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_wins=$(jq '.status.recentWins | length' "$STATE_FILE" 2>/dev/null || echo "?")
  n_blockers=$(jq '.status.blockers | length' "$STATE_FILE" 2>/dev/null || echo "?")
  printf "  %bКлавиши навигации:%b\n\n" "$WHT" "$RST"
  printf "  %bg%b  Цели (%s)%b           %bGoals%b\n"       "$CYN" "$RST" "$n_goals" "$RST" "$DIM" "$RST"
  printf "  %bp%b  Проекты (%s)%b         %bProjects%b\n"    "$CYN" "$RST" "$n_projects" "$RST" "$DIM" "$RST"
  printf "  %bm%b  Миссии (%s)%b          %bMissions%b\n"    "$CYN" "$RST" "$n_missions" "$RST" "$DIM" "$RST"
  printf "  %bc%b  Вызовы (%s)%b          %bChallenges%b\n"  "$CYN" "$RST" "$n_challenges" "$RST" "$DIM" "$RST"
  printf "  %bs%b  Стратегии (%s)%b       %bStrategies%b\n"  "$CYN" "$RST" "$n_strategies" "$RST" "$DIM" "$RST"
  printf "  %bw%b  Мудрость (%s)%b        %bWisdom%b\n"      "$CYN" "$RST" "$n_wisdom" "$RST" "$DIM" "$RST"
  printf "  %bv%b  Победы (%s)%b          %bWins%b\n"        "$CYN" "$RST" "$n_wins" "$RST" "$DIM" "$RST"
  printf "  %bb%b  Блокеры (%s)%b         %bBlockers%b\n"    "$CYN" "$RST" "$n_blockers" "$RST" "$DIM" "$RST"
  printf "\n  %bВ списке:%b\n" "$WHT" "$RST"
  printf "  %b0-9%b Открыть деталь\n"    "$YLW" "$RST"
  printf "  %bEsc%b Назад к списку\n"    "$YLW" "$RST"
  printf "  %br%b   Обновить\n"          "$YLW" "$RST"
  printf "  %bq%b   Выход\n"             "$YLW" "$RST"
  nav_footer
}

# ── VIEW: Goals list ──
render_goals_list() {
  nav_header "ЦЕЛИ" "$GRN"
  local idx=0
  while IFS=$'\t' read -r g_id g_status g_progress g_checked g_total; do
    local pcolor="$SLT"
    [ "$g_progress" -gt 0 ]  && pcolor="$YLW"
    [ "$g_progress" -ge 25 ] && pcolor='\e[38;2;134;239;172m'
    [ "$g_progress" -ge 50 ] && pcolor="$GRN"
    local bar
    bar=$(progress_bar "$g_progress" 8)

    local s_short
    case "$g_id" in
      G0)  s_short="Цифр.Прораб" ;; G1)  s_short="Timber Frame" ;;
      G2)  s_short="Orchestrator" ;; G3)  s_short="Фин.незав." ;;
      G4)  s_short="Шале" ;;         G5)  s_short="Квартира" ;;
      G6)  s_short="A0T" ;;          G7)  s_short="Земля" ;;
      G8)  s_short="Акции" ;;        G9)  s_short="Инфра" ;;
      G10) s_short="Аудит" ;;        G11) s_short="PAI comm" ;;
      G12) s_short="RU Metrics" ;;   G13) s_short="PAI Workspace" ;;
      *)   s_short="$g_id" ;;
    esac

    local s_vw
    s_vw=$(printf '%s' "$s_short" | wc -L)
    local s_pad=$(( 13 - s_vw ))
    [ "$s_pad" -lt 0 ] && s_pad=0

    # Status indicator
    local st_ch="-"
    case "$g_status" in
      *"Активна"*|*"активная"*|*"непрерывная"*) st_ch="+" ;;
      *"К действию"*|*"Планирование"*) st_ch="~" ;;
      *"Заморожено"*) st_ch="*" ;;
      *"Идея"*) st_ch="?" ;;
    esac

    printf "  %b%s%b %b%-3s%b %s%*s %b%s%b %b%3d%%%b %b%s/%s%b\n" \
      "$YLW" "$idx" "$RST" "$CYN" "$g_id" "$RST" \
      "$s_short" "$s_pad" "" \
      "$pcolor" "$bar" "$RST" "$pcolor" "$g_progress" "$RST" \
      "$SLT" "$g_checked" "$g_total" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.goals[] | [.id, .status, (.progress // 0 | tostring), (.checked // 0 | tostring), (.total // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)
  nav_footer
}

# ── VIEW: Goal detail ──
render_goal_detail() {
  local gid="$1"
  nav_header "ЦЕЛЬ: $gid" "$GRN"

  local g_data
  g_data=$(jq -r --arg id "$gid" '.goals[] | select(.id == $id) | [
    .name, .status, (.progress // 0 | tostring),
    (.checked // 0 | tostring), (.total // 0 | tostring),
    ((.missions // []) | join(",")),
    ((.blockers // []) | join("; "))
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  if [ -z "$g_data" ]; then
    printf "  %bНе найдено%b\n" "$RED" "$RST"
    nav_footer; return
  fi

  local g_name g_status g_progress g_checked g_total g_missions g_blockers
  IFS=$'\t' read -r g_name g_status g_progress g_checked g_total g_missions g_blockers <<< "$g_data"

  local bar
  bar=$(progress_bar "$g_progress" 20)

  printf "  %b%s%b\n" "$WHT" "$g_name" "$RST"
  printf "  %bСтатус:%b %s\n" "$SLT" "$RST" "$g_status"
  printf "  %b%s%b %b%d%%%b  (%s/%s)\n\n" "$GRN" "$bar" "$RST" "$WHT" "$g_progress" "$RST" "$g_checked" "$g_total"

  if [ -n "$g_missions" ]; then
    printf "  %bМиссии:%b %b%s%b\n" "$SLT" "$RST" "$VIO" "$g_missions" "$RST"
  fi

  if [ -n "$g_blockers" ] && [ "$g_blockers" != "null" ]; then
    printf "  %bБлокеры:%b %b%s%b\n" "$RED" "$RST" "$RED" "$g_blockers" "$RST"
  fi

  # Linked projects
  printf "\n  %bСвязанные проекты:%b\n" "$SLT" "$RST"
  while IFS=$'\t' read -r p_id p_name p_progress p_checked p_total; do
    local p_bar
    p_bar=$(progress_bar "$p_progress" 10)
    local p_short="${p_name:0:25}"
    local p_vw
    p_vw=$(printf '%s' "$p_short" | wc -L)
    local p_pad=$(( 25 - p_vw ))
    [ "$p_pad" -lt 0 ] && p_pad=0
    printf "  %b%-3s%b %s%*s %b%s%b %d%%\n" \
      "$CYN" "$p_id" "$RST" "$p_short" "$p_pad" "" \
      "$GRN" "$p_bar" "$RST" "$p_progress"
  done < <(jq -r '.projects[] | [.id, .name, (.progress // 0 | tostring), (.checked // 0 | tostring), (.total // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)

  # Linked strategies
  printf "\n  %bСтратегии:%b\n" "$SLT" "$RST"
  while IFS=$'\t' read -r s_id s_name s_eff; do
    local eff_ch="?"
    [ "$s_eff" = "working" ] && eff_ch="+"
    [ "$s_eff" = "partial" ] && eff_ch="~"
    local s_short="${s_name:0:30}"
    printf "  %b%s%b %b%-3s%b %s\n" \
      "$GRN" "$eff_ch" "$RST" "$CYN" "$s_id" "$RST" "$s_short"
  done < <(jq -r --arg gid "$gid" '.strategies[] | select(.addresses[] == $gid) | [.id, .name, (.effectiveness // "unknown")] | @tsv' "$STATE_FILE" 2>/dev/null)

  nav_footer
}

# ── VIEW: Projects list ──
render_projects_list() {
  nav_header "ПРОЕКТЫ" "$BLU"
  local idx=0
  while IFS=$'\t' read -r p_id p_name p_status p_progress p_checked p_total; do
    local bar
    bar=$(progress_bar "$p_progress" 10)
    local p_short="${p_name:0:22}"
    local p_vw
    p_vw=$(printf '%s' "$p_short" | wc -L)
    local p_pad=$(( 22 - p_vw ))
    [ "$p_pad" -lt 0 ] && p_pad=0
    printf "  %b%s%b %b%-3s%b %s%*s %b%s%b %b%3d%%%b\n" \
      "$YLW" "$idx" "$RST" "$CYN" "$p_id" "$RST" \
      "$p_short" "$p_pad" "" \
      "$GRN" "$bar" "$RST" "$WHT" "$p_progress" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.projects[] | [.id, .name, (.status // ""), (.progress // 0 | tostring), (.checked // 0 | tostring), (.total // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)
  nav_footer
}

# ── VIEW: Project detail ──
render_project_detail() {
  local pid="$1"
  nav_header "ПРОЕКТ: $pid" "$BLU"

  local p_data
  p_data=$(jq -r --arg id "$pid" '.projects[] | select(.id == $id) | [
    .name, .status, (.progress // 0 | tostring),
    (.checked // 0 | tostring), (.total // 0 | tostring)
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  if [ -z "$p_data" ]; then
    printf "  %bНе найдено%b\n" "$RED" "$RST"
    nav_footer; return
  fi

  local p_name p_status p_progress p_checked p_total
  IFS=$'\t' read -r p_name p_status p_progress p_checked p_total <<< "$p_data"

  local bar
  bar=$(progress_bar "$p_progress" 20)

  printf "  %b%s%b\n" "$WHT" "$p_name" "$RST"
  printf "  %bСтатус:%b %s\n" "$SLT" "$RST" "$p_status"
  printf "  %b%s%b %b%d%%%b  (%s/%s)\n" "$GRN" "$bar" "$RST" "$WHT" "$p_progress" "$RST" "$p_checked" "$p_total"
  nav_footer
}

# ── VIEW: Missions ──
render_missions_list() {
  nav_header "МИССИИ" "$VIO"
  local idx=0
  while IFS=$'\t' read -r m_id m_name m_status m_progress m_goals; do
    local bar
    bar=$(progress_bar "$m_progress" 10)
    local m_short="${m_name:0:18}"
    local m_vw
    m_vw=$(printf '%s' "$m_short" | wc -L)
    local m_pad=$(( 18 - m_vw ))
    [ "$m_pad" -lt 0 ] && m_pad=0
    printf "  %b%s%b %b%-3s%b %s%*s %b%s%b %b%3d%%%b\n" \
      "$YLW" "$idx" "$RST" "$CYN" "$m_id" "$RST" \
      "$m_short" "$m_pad" "" \
      "$VIO" "$bar" "$RST" "$WHT" "$m_progress" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.missions[] | [.id, .name, (.status // ""), (.progress // 0 | tostring), ((.linkedGoals // []) | join(","))] | @tsv' "$STATE_FILE" 2>/dev/null)
  nav_footer
}

# ── VIEW: Mission detail ──
render_mission_detail() {
  local mid="$1"
  nav_header "МИССИЯ: $mid" "$VIO"

  local m_data
  m_data=$(jq -r --arg id "$mid" '.missions[] | select(.id == $id) | [
    .name, .description, .status, (.progress // 0 | tostring),
    ((.linkedGoals // []) | join(","))
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  if [ -z "$m_data" ]; then
    printf "  %bНе найдено%b\n" "$RED" "$RST"
    nav_footer; return
  fi

  local m_name m_desc m_status m_progress m_goals
  IFS=$'\t' read -r m_name m_desc m_status m_progress m_goals <<< "$m_data"

  local bar
  bar=$(progress_bar "$m_progress" 20)

  printf "  %b%s%b\n" "$WHT" "$m_name" "$RST"
  printf "  %b%s%b\n" "$SLT" "$m_desc" "$RST"
  printf "  %bСтатус:%b %s\n" "$SLT" "$RST" "$m_status"
  printf "  %b%s%b %b%d%%%b\n" "$VIO" "$bar" "$RST" "$WHT" "$m_progress" "$RST"

  if [ -n "$m_goals" ]; then
    printf "\n  %bСвязанные цели:%b\n" "$SLT" "$RST"
    IFS=',' read -ra goal_ids <<< "$m_goals"
    for gid in "${goal_ids[@]}"; do
      local g_line
      g_line=$(jq -r --arg id "$gid" '.goals[] | select(.id == $id) | [.id, .name, (.progress // 0 | tostring)] | @tsv' "$STATE_FILE" 2>/dev/null)
      if [ -n "$g_line" ]; then
        local gi gn gp
        IFS=$'\t' read -r gi gn gp <<< "$g_line"
        local gbar
        gbar=$(progress_bar "$gp" 8)
        printf "  %b%-3s%b %s %b%s%b %d%%\n" "$CYN" "$gi" "$RST" "${gn:0:20}" "$GRN" "$gbar" "$RST" "$gp"
      fi
    done
  fi
  nav_footer
}

# ── VIEW: Challenges ──
render_challenges_list() {
  nav_header "ВЫЗОВЫ" "$RED"
  local idx=0
  while IFS=$'\t' read -r c_id c_name c_severity c_strats; do
    local sev_c="$SLT"
    [ "$c_severity" = "high" ] && sev_c="$RED"
    [ "$c_severity" = "medium" ] && sev_c="$YLW"
    [ "$c_severity" = "low" ] && sev_c="$GRN"
    local c_short="${c_name:0:28}"
    local c_vw
    c_vw=$(printf '%s' "$c_short" | wc -L)
    local c_pad=$(( 28 - c_vw ))
    [ "$c_pad" -lt 0 ] && c_pad=0
    printf "  %b%s%b %b%-3s%b %b%s%b%*s %b%s%b\n" \
      "$YLW" "$idx" "$RST" "$CYN" "$c_id" "$RST" \
      "$sev_c" "$c_short" "$RST" "$c_pad" "" "$SLT" "$c_strats" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.challenges[]? | [.id, .name, (.severity // "medium"), ((.linkedStrategies // []) | join(","))] | @tsv' "$STATE_FILE" 2>/dev/null)
  nav_footer
}

# ── VIEW: Challenge detail ──
render_challenge_detail() {
  local cid="$1"
  nav_header "ВЫЗОВ: $cid" "$RED"

  local c_data
  c_data=$(jq -r --arg id "$cid" '.challenges[] | select(.id == $id) | [
    .name, .status, (.severity // "medium"),
    ((.linkedStrategies // []) | join(","))
  ] | @tsv' "$STATE_FILE" 2>/dev/null)

  if [ -z "$c_data" ]; then
    printf "  %bНе найдено%b\n" "$RED" "$RST"
    nav_footer; return
  fi

  local c_name c_status c_severity c_strats
  IFS=$'\t' read -r c_name c_status c_severity c_strats <<< "$c_data"

  local sev_label="MEDIUM"
  [ "$c_severity" = "high" ] && sev_label="HIGH"
  [ "$c_severity" = "low" ] && sev_label="LOW"

  printf "  %b%s%b\n" "$WHT" "$c_name" "$RST"
  printf "  %bСерьёзность:%b %b%s%b\n" "$SLT" "$RST" "$RED" "$sev_label" "$RST"
  printf "  %bСтатус:%b %s\n" "$SLT" "$RST" "${c_status:0:40}"

  if [ -n "$c_strats" ]; then
    printf "\n  %bСтратегии:%b\n" "$SLT" "$RST"
    IFS=',' read -ra strat_ids <<< "$c_strats"
    for sid in "${strat_ids[@]}"; do
      local s_line
      s_line=$(jq -r --arg id "$sid" '.strategies[] | select(.id == $id) | [.id, .name, (.effectiveness // "unknown")] | @tsv' "$STATE_FILE" 2>/dev/null)
      if [ -n "$s_line" ]; then
        local si sn se
        IFS=$'\t' read -r si sn se <<< "$s_line"
        local eff_c="$SLT"
        [ "$se" = "working" ] && eff_c="$GRN"
        [ "$se" = "partial" ] && eff_c="$YLW"
        printf "  %b%-3s%b %s %b[%s]%b\n" "$CYN" "$si" "$RST" "${sn:0:28}" "$eff_c" "$se" "$RST"
      fi
    done
  fi
  nav_footer
}

# ── VIEW: Strategies ──
render_strategies_list() {
  nav_header "СТРАТЕГИИ" "$YLW"
  local idx=0
  while IFS=$'\t' read -r s_id s_name s_eff s_status; do
    local eff_c="$SLT"
    [ "$s_eff" = "working" ] && eff_c="$GRN"
    [ "$s_eff" = "partial" ] && eff_c="$YLW"
    local s_short="${s_name:0:28}"
    local s_vw
    s_vw=$(printf '%s' "$s_short" | wc -L)
    local s_pad=$(( 28 - s_vw ))
    [ "$s_pad" -lt 0 ] && s_pad=0
    printf "  %b%s%b %b%-3s%b %s%*s %b[%s]%b\n" \
      "$YLW" "$idx" "$RST" "$CYN" "$s_id" "$RST" \
      "$s_short" "$s_pad" "" "$eff_c" "$s_eff" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.strategies[] | [.id, .name, (.effectiveness // "unknown"), (.status // "")] | @tsv' "$STATE_FILE" 2>/dev/null)
  nav_footer
}

# ── VIEW: Wisdom ──
render_wisdom_list() {
  nav_header "МУДРОСТЬ" "$VIO"
  local idx=0
  while IFS=$'\t' read -r w_id w_text; do
    [ "$idx" -ge 20 ] && break
    local w_short="${w_text:0:38}"
    printf "  %b%2d%b %b%-4s%b %b\"%s\"%b\n" \
      "$YLW" "$idx" "$RST" "$CYN" "$w_id" "$RST" "$DIM" "$w_short" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.learning.wisdomQuotes[]? | [(.id // ""), (.text // "")] | @tsv' "$STATE_FILE" 2>/dev/null)
  [ "$idx" -ge 20 ] && printf "  %b... ещё%b\n" "$SLT" "$RST"
  nav_footer
}

# ── VIEW: Wins ──
render_wins_list() {
  nav_header "ПОБЕДЫ" "$GRN"
  local idx=0
  while IFS=$'\t' read -r w_date w_text; do
    [ "$idx" -ge 15 ] && break
    local w_short="${w_text:0:34}"
    printf "  %b%s%b %b%s%b\n" \
      "$SLT" "${w_date:5:5}" "$RST" "$WHT" "$w_short" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.status.recentWins[]? | [(.date // ""), .win] | @tsv' "$STATE_FILE" 2>/dev/null | tac)
  nav_footer
}

# ── VIEW: Blockers ──
render_blockers_list() {
  nav_header "БЛОКЕРЫ" "$RED"
  local idx=0
  while IFS= read -r blocker; do
    printf "  %b!%b %b%s%b\n" "$RED" "$RST" "$WHT" "${blocker:0:40}" "$RST"
    idx=$((idx + 1))
  done < <(jq -r '.status.blockers[]?' "$STATE_FILE" 2>/dev/null)
  [ "$idx" -eq 0 ] && printf "  %bНет блокеров%b\n" "$GRN" "$RST"
  nav_footer
}

# ── Get ID by index in current mode ──
get_id_by_index() {
  local mode="$1" index="$2"
  case "$mode" in
    goals)      jq -r --argjson i "$index" '.goals[$i].id // empty' "$STATE_FILE" 2>/dev/null ;;
    projects)   jq -r --argjson i "$index" '.projects[$i].id // empty' "$STATE_FILE" 2>/dev/null ;;
    missions)   jq -r --argjson i "$index" '.missions[$i].id // empty' "$STATE_FILE" 2>/dev/null ;;
    challenges) jq -r --argjson i "$index" '.challenges[$i].id // empty' "$STATE_FILE" 2>/dev/null ;;
    strategies) jq -r --argjson i "$index" '.strategies[$i].id // empty' "$STATE_FILE" 2>/dev/null ;;
  esac
}

# ── Main render dispatcher ──
render() {
  if [ ! -f "$STATE_FILE" ] || ! timeout 3 jq empty "$STATE_FILE" 2>/dev/null; then
    printf '\033[2J\033[H'
    printf "\n  %bTELOS NAV — Загрузка...%b\n" "$VIO$BLD" "$RST"
    return
  fi

  if [ -n "$SELECTED" ] && [ -n "$DETAIL_ID" ]; then
    case "$MODE" in
      goals)      render_goal_detail "$DETAIL_ID" ;;
      projects)   render_project_detail "$DETAIL_ID" ;;
      missions)   render_mission_detail "$DETAIL_ID" ;;
      challenges) render_challenge_detail "$DETAIL_ID" ;;
      *)          SELECTED=""; render ;;
    esac
    return
  fi

  case "$MODE" in
    goals)      render_goals_list ;;
    projects)   render_projects_list ;;
    missions)   render_missions_list ;;
    challenges) render_challenges_list ;;
    strategies) render_strategies_list ;;
    wisdom)     render_wisdom_list ;;
    wins)       render_wins_list ;;
    blockers)   render_blockers_list ;;
    help|*)     render_help ;;
  esac
}

# ── Initial render ──
render

# ── Main input loop ──
while true; do
  read -rsn1 key

  # Handle escape sequences (arrows, Esc)
  if [ "$key" = $'\x1b' ]; then
    read -rsn1 -t0.1 key2
    if [ -z "$key2" ]; then
      # Pure Esc — go back
      if [ -n "$SELECTED" ]; then
        SELECTED=""
        DETAIL_ID=""
      else
        MODE="help"
      fi
      render
      continue
    fi
    # Arrow keys or other escape sequences — ignore
    read -rsn1 -t0.1 _
    continue
  fi

  case "$key" in
    g) MODE="goals";      SELECTED=""; DETAIL_ID=""; render ;;
    p) MODE="projects";   SELECTED=""; DETAIL_ID=""; render ;;
    m) MODE="missions";   SELECTED=""; DETAIL_ID=""; render ;;
    c) MODE="challenges"; SELECTED=""; DETAIL_ID=""; render ;;
    s) MODE="strategies"; SELECTED=""; DETAIL_ID=""; render ;;
    w) MODE="wisdom";     SELECTED=""; DETAIL_ID=""; render ;;
    v) MODE="wins";       SELECTED=""; DETAIL_ID=""; render ;;
    b) MODE="blockers";   SELECTED=""; DETAIL_ID=""; render ;;
    '?') MODE="help"; SELECTED=""; DETAIL_ID=""; render ;;
    r|R) render ;;
    q|Q) exit 0 ;;
    [0-9])
      if [ -z "$SELECTED" ] && [ "$MODE" != "help" ] && [ "$MODE" != "wisdom" ] && [ "$MODE" != "wins" ] && [ "$MODE" != "blockers" ] && [ "$MODE" != "strategies" ]; then
        local item_id
        item_id=$(get_id_by_index "$MODE" "$key")
        if [ -n "$item_id" ]; then
          SELECTED="$key"
          DETAIL_ID="$item_id"
          render
        fi
      fi
      ;;
  esac
done
