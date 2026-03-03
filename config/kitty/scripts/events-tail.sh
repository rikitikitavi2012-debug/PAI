#!/bin/bash
# Events Live Feed — PAI system events (tail -f with jq formatting)
# Shows: local timestamp | colored event type | details (multiple fields)
# Converts UTC timestamps to local time, filters test noise

EVENTS="$HOME/.claude/MEMORY/STATE/events.jsonl"

# ── Colors ──
RST='\e[0m'
BLD='\e[1m'
DIM='\e[2m'
VIO='\e[38;2;167;139;250m'
RED='\e[38;2;251;113;133m'
SEP='\e[38;2;71;85;105m'
GRN='\e[38;2;74;222;128m'

# ── Timezone offset (hours from UTC, e.g. 3 for MSK) ──
TZ_OFFSET_H=$(date +%z | sed 's/^+//' | sed 's/00$//' | sed 's/^0//')
[ -z "$TZ_OFFSET_H" ] && TZ_OFFSET_H=0

printf "%b%b📡 PAI EVENTS%b  %b(live · UTC%+d)%b\n" "${BLD}" "${VIO}" "${RST}" "${DIM}" "${TZ_OFFSET_H}" "${RST}"
printf "%b" "${SEP}"
printf '━%.0s' {1..40}
printf "%b\n\n" "${RST}"

if [ ! -f "$EVENTS" ]; then
  printf "%b⚠ %s не найден%b\n" "${RED}" "${EVENTS}" "${RST}"
  printf "%bФайл появится после первого события PAI.%b\n" "${DIM}" "${RST}"
  for _ in $(seq 1 60); do [ -f "$EVENTS" ] && break; sleep 5; done
  [ ! -f "$EVENTS" ] && { printf "%bТаймаут ожидания.%b\n" "${RED}" "${RST}"; exit 1; }
  printf "%bФайл появился, начинаю мониторинг...%b\n\n" "${GRN}" "${RST}"
fi

# Show last 20 events, then follow — single jq process
# TZ_OFFSET_H passed as jq arg for UTC→local conversion
tail -n 20 -f "$EVENTS" | jq --unbuffered -r -R --argjson tz "$TZ_OFFSET_H" '
  fromjson? // null | select(.) |

  # ── Filter: skip worktree test noise (test-wc-* paths) ──
  select(
    ((.type // "") | startswith("worktree")) and
    ((.data.worktree_path // .worktree_path // "") | test("test-wc-"))
    | not
  ) |

  # ── Extract & convert timestamp UTC → local ──
  ((.timestamp // "" | split("T")[1] // "?" | split(".")[0]) // "??:??:??") as $utc_ts |
  (if $utc_ts == "??:??:??" then $utc_ts
   else
     ($utc_ts | split(":")) as $parts |
     (($parts[0] | tonumber) + $tz) as $raw_h |
     (if $raw_h >= 24 then $raw_h - 24
      elif $raw_h < 0 then $raw_h + 24
      else $raw_h end) as $h |
     (if $h < 10 then "0\($h)" else "\($h)" end) as $hh |
     "\($hh):\($parts[1]):\($parts[2])"
   end) as $ts |

  # Event type
  (.type // "unknown") as $typ |

  # ── Color code by event type category ──
  (if ($typ | startswith("agent."))       then "\u001b[38;2;103;232;249m"
   elif ($typ | startswith("voice."))     then "\u001b[38;2;167;139;250m"
   elif ($typ | startswith("rating."))    then "\u001b[38;2;251;191;36m"
   elif ($typ | startswith("work."))      then "\u001b[38;2;74;222;128m"
   elif ($typ | startswith("session."))   then "\u001b[38;2;56;189;248m"
   elif ($typ | startswith("prd."))       then "\u001b[38;2;59;130;246m"
   elif ($typ | startswith("inference.")) then "\u001b[38;2;232;121;249m"
   elif ($typ | startswith("a0."))        then "\u001b[38;2;103;232;249m\u001b[1m"
   elif ($typ | startswith("custom."))    then "\u001b[38;2;148;163;184m"
   elif ($typ | startswith("worktree"))   then "\u001b[2m"
   else "\u001b[38;2;203;213;225m"
   end) as $color |

  # ── Build detail — fields can be at root OR nested in .data ──
  (
    [
      (.source                       // .data.source       // empty | "src=\(.)"),
      (.data.hook     // .hook       // empty | "hook=\(.)"),
      (.phase         // .data.phase // empty | "φ=\(.)"),
      (.progress      // empty | "prog=\(.)"),
      (.slug          // .data.slug  // empty | "slug=\(.[:25])"),
      (.data.agent_type              // empty | "agent=\(.)"),
      (.data.agent_id                // empty | "id=\(.[:12])"),
      (.data.event    // .event      // empty | "ev=\(.)"),
      (.data.rating   // .rating     // empty | "★\(.)"),
      (.data.pr_number               // empty | "PR#\(.)"),
      (.data.worktree_path           // empty | split("/") | last | "wt=\(.)"),
      (.has_snapshot                  // empty | "snap=\(.)"),
      (.data.level                   // empty | "lvl=\(.)"),
      (.data.provider                // empty | "via=\(.)"),
      (.data.latency_s               // empty | "\(.)s"),
      (.data.context_id              // empty | "ctx=\(.[:12])"),
      (if .data.preview then
        (.data.preview[:40] | gsub("\n"; " ") | "\"\(.)\"")
       elif .data.last_message_preview then
        (.data.last_message_preview[:35] | gsub("\n"; " ") | "\"\(.)\"")
       else empty end)
    ] | join(" │ ")
  ) as $detail |

  # Short type name
  ($typ | split(".") | last) as $short |

  # ── Icon by category ──
  (if ($typ | startswith("agent.start"))    then "🚀"
   elif ($typ | startswith("agent.stop"))   then "🏁"
   elif ($typ | startswith("voice."))       then "🔊"
   elif ($typ | startswith("rating."))      then "⭐"
   elif ($typ | startswith("work."))        then "📦"
   elif ($typ | startswith("session."))     then "🔄"
   elif ($typ | startswith("prd."))         then "📋"
   elif ($typ | startswith("worktree"))     then "🌳"
   elif ($typ | startswith("inference."))   then "🔮"
   elif ($typ | startswith("a0."))          then "🧠"
   elif ($typ | startswith("custom."))      then "⚡"
   else "•" end) as $icon |

  "\u001b[38;2;100;116;139m\($ts)\u001b[0m \($icon) \($color)\($short)\u001b[0m \u001b[2m\($detail)\u001b[0m"
' 2>/dev/null
