#!/bin/bash
# Events Live Feed — PAI system events (tail -f with jq formatting)
# Shows: local timestamp | colored event type | details (multiple fields)
# Converts UTC timestamps to local time, filters test noise

EVENTS="$HOME/.claude/MEMORY/STATE/events.jsonl"

# ── Timezone offset (hours from UTC, e.g. 3 for MSK, -5 for EST) ──
_tz_raw=$(date +%z)
_tz_sign=1
[[ "$_tz_raw" == -* ]] && _tz_sign=-1
_tz_abs=${_tz_raw#[+-]}
_tz_h=$(( 10#${_tz_abs:0:2} ))
TZ_OFFSET_H=$(( _tz_sign * _tz_h ))
unset _tz_raw _tz_sign _tz_abs _tz_h

# ── UI + shared jq formatter ──
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/ui.sh"
# shellcheck disable=SC1091
. "$HOME/.config/kitty/scripts/lib/events-format.sh"

box_top
box_line "$(printf "%b%b📡 PAI EVENTS%b  %b(live · UTC%+d)%b" "${VIO}" "${BLD}" "${RST}" "${DIM}" "${TZ_OFFSET_H}" "${RST}")"
box_bot
printf "\n"

if [ ! -f "$EVENTS" ]; then
  printf "%b⚠ %s не найден%b\n" "${RED}" "${EVENTS}" "${RST}"
  printf "%bФайл появится после первого события PAI.%b\n" "${DIM}" "${RST}"
  for _ in $(seq 1 60); do [ -f "$EVENTS" ] && break; sleep 5; done
  [ ! -f "$EVENTS" ] && { printf "%bТаймаут ожидания.%b\n" "${RED}" "${RST}"; exit 1; }
  printf "%bФайл появился, начинаю мониторинг...%b\n\n" "${GRN}" "${RST}"
fi

# Show last 20 events, then follow — single jq process
# TZ_OFFSET_H passed as jq arg for UTC→local conversion
tail -n 20 -f "$EVENTS" | jq --unbuffered -r -R \
  --argjson tz "$TZ_OFFSET_H" --arg filt "all" \
  "$JQ_EVENT_FORMAT" 2>/dev/null
