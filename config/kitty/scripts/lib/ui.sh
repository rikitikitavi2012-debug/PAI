#!/bin/bash
# PAI TUI Library — Shared UI Components for Kitty Dashboards
# Source: . "$HOME/.config/kitty/scripts/lib/ui.sh"
# Geometry: Pixel-perfect boxes at PAI_UI_WIDTH (default 96)

# ── Configuration ──
export PAI_UI_WIDTH=${PAI_UI_WIDTH:-96}
export LC_ALL=C.UTF-8

# ── Colors (PAI 24-bit RGB Palette — canonical values, DO NOT change) ──
RST='\e[0m'
BLD='\e[1m'
DIM='\e[2m'
ITL='\e[3m'
GRN='\e[38;2;74;222;128m'
RED='\e[38;2;251;113;133m'
YLW='\e[38;2;251;191;36m'
CYN='\e[38;2;103;232;249m'
SLT='\e[38;2;148;163;184m'    # secondary text (bright enough for readability)
SEP='\e[38;2;71;85;105m'      # separators and borders
VIO='\e[38;2;167;139;250m'
WHT='\e[38;2;203;213;225m'    # primary text
ORG='\e[38;2;251;146;60m'
BLU='\e[38;2;59;130;246m'

# ── Geometry Helpers ──

# Visible width: strip ANSI codes, use wc -L (handles Cyrillic/wide chars)
vwidth() {
  printf '%b' "$1" | sed $'s/\x1b\[[0-9;]*[a-zA-Z]//g' | wc -L
}

# Horizontal line of given width
hline() {
  local w="${1:-$PAI_UI_WIDTH}"
  printf '─%.0s' $(seq 1 "$w")
}

# ── Box Drawing ──

box_top() {
  printf '%b┌%s┐%b\n' "${SEP}" "$(hline $((PAI_UI_WIDTH - 2)))" "${RST}"
}

box_bot() {
  printf '%b└%s┘%b\n' "${SEP}" "$(hline $((PAI_UI_WIDTH - 2)))" "${RST}"
}

box_sep() {
  printf '%b├%s┤%b\n' "${SEP}" "$(hline $((PAI_UI_WIDTH - 2)))" "${RST}"
}

# Box line: │ content (padded to width) │
box_line() {
  local content="$1"
  local vw
  vw=$(vwidth "$content")
  local pad=$((PAI_UI_WIDTH - 4 - vw))
  [ "$pad" -lt 0 ] && pad=0
  printf '%b│%b %s%*s %b│%b\n' "${SEP}" "${RST}" "$content" "$pad" "" "${SEP}" "${RST}"
}

# ── Two-Column Layout ──

two_col() {
  local left="$1" right="$2"
  local half=$(( (PAI_UI_WIDTH - 4) / 2 ))
  local right_w=$((PAI_UI_WIDTH - 4 - half - 1))

  local vw_l vw_r
  vw_l=$(vwidth "$left")
  vw_r=$(vwidth "$right")

  local pad_l=$((half - vw_l - 1))
  local pad_r=$((right_w - vw_r - 1))
  [ "$pad_l" -lt 0 ] && pad_l=0
  [ "$pad_r" -lt 0 ] && pad_r=0

  printf '%b│%b %s%*s%b│%b %s%*s %b│%b\n' \
    "${SEP}" "${RST}" \
    "$left" "$pad_l" "" \
    "${SEP}" "${RST}" \
    "$right" "$pad_r" "" \
    "${SEP}" "${RST}"
}

two_col_top() {
  local half=$(( (PAI_UI_WIDTH - 4) / 2 ))
  local right_w=$((PAI_UI_WIDTH - 2 - half - 1))
  printf '%b├%s┬%s┤%b\n' "${SEP}" "$(hline "$half")" "$(hline "$right_w")" "${RST}"
}

two_col_mid() {
  local half=$(( (PAI_UI_WIDTH - 4) / 2 ))
  local right_w=$((PAI_UI_WIDTH - 2 - half - 1))
  printf '%b├%s┼%s┤%b\n' "${SEP}" "$(hline "$half")" "$(hline "$right_w")" "${RST}"
}

two_col_bot() {
  local half=$(( (PAI_UI_WIDTH - 4) / 2 ))
  local right_w=$((PAI_UI_WIDTH - 2 - half - 1))
  printf '%b├%s┴%s┤%b\n' "${SEP}" "$(hline "$half")" "$(hline "$right_w")" "${RST}"
}

# ── Components ──

progress_bar() {
  local pct=${1:-0} width=${2:-16}
  local filled=$(( pct * width / 100 ))
  local empty=$(( width - filled ))
  local pcolor="$DIM"
  [ "$pct" -gt 0 ] && pcolor="$YLW"
  [ "$pct" -ge 50 ] && pcolor="$GRN"
  printf '%b' "$pcolor"
  [ "$filled" -gt 0 ] && printf '█%.0s' $(seq 1 "$filled")
  printf '%b' "$SEP"
  [ "$empty" -gt 0 ] && printf '░%.0s' $(seq 1 "$empty")
  printf '%b' "$RST"
}

section_header() {
  local icon="$1" title="$2" color="$3"
  box_sep
  box_line "$(printf '%b%b%s %s%b' "$color" "$BLD" "$icon" "$title" "$RST")"
  box_sep
}

# Status badges (inverted background)
badge_active() { printf '\e[48;2;251;191;36m\e[38;2;15;23;42m%b ACTIVE %b' "$BLD" "$RST"; }
badge_done()   { printf '\e[48;2;74;222;128m\e[38;2;15;23;42m%b  DONE  %b' "$BLD" "$RST"; }
badge_fail()   { printf '\e[48;2;251;113;133m\e[38;2;255;255;255m%b FAILED %b' "$BLD" "$RST"; }

# Dimmed ID display
fmt_id() { printf '%b%s%b' "$DIM" "$1" "$RST"; }

# OSC 8 clickable link (Kitty supports this)
link() { printf '\e]8;;%s\e\\%s\e]8;;\e\\' "$1" "$2"; }

# ── Kitty Remote Control (requires allow_remote_control yes) ──

set_tab_state() {
  if [ -n "$KITTY_WINDOW_ID" ]; then
    local abg="$1" afg="$2"
    [ -n "$abg" ] && kitty @ set-tab-color "active_background=$abg" >/dev/null 2>&1
    [ -n "$afg" ] && kitty @ set-tab-color "active_foreground=$afg" >/dev/null 2>&1
  fi
}

tab_ok()    { set_tab_state "#4ade80" "#0f172a"; }
tab_warn()  { set_tab_state "#fbbf24" "#0f172a"; }
tab_crit()  { set_tab_state "#fb7185" "#ffffff"; }
tab_reset() { [ -n "$KITTY_WINDOW_ID" ] && kitty @ set-tab-color active_background= active_foreground= >/dev/null 2>&1; }
