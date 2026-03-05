#!/bin/bash
# lib/events-format.sh — Shared jq event formatter for PAI events.jsonl
# Used by: telemetry-dashboard.sh, events-tail.sh
# Provides: JQ_EVENT_FORMAT variable (jq filter string)
# Requires: $tz (timezone offset) and $filt (filter name) as jq args

# shellcheck disable=SC2016
JQ_EVENT_FORMAT='
  fromjson? // null | select(.) |

  # Filter: skip worktree test noise
  select(
    ((.type // "") | startswith("worktree")) and
    ((.data.worktree_path // .worktree_path // "") | test("test-wc-"))
    | not
  ) |

  # Apply user filter (no-op if $filt == "all")
  (if $filt == "fail" then select(.type | endswith("fail"))
   elif $filt == "inference" then select(.type | startswith("inference."))
   elif $filt == "voice" then select(.type | startswith("voice."))
   elif $filt == "hooks" then select(.type | startswith("agent.") or startswith("task."))
   else . end) |

  # Timestamp UTC → local
  ((.timestamp // "" | split("T")[1] // "?" | split(".")[0]) // "??:??:??") as $utc_ts |
  (if $utc_ts == "??:??:??" then $utc_ts
   else
     ($utc_ts | split(":")) as $parts |
     (($parts[0] | tonumber) + $tz) as $raw_h |
     (if $raw_h >= 24 then $raw_h - 24
      elif $raw_h < 0 then $raw_h + 24
      else $raw_h end) as $h |
     "\(if $h < 10 then "0\($h)" else "\($h)" end):\($parts[1]):\($parts[2])"
   end) as $ts |

  # Relative time for recent events (0–60s old)
  (.timestamp // null | if . then
    (gsub("[.].*$"; "") + "Z" | gsub("Z$"; "") | try strptime("%Y-%m-%dT%H:%M:%S") | mktime) as $evt_epoch |
    (now - $evt_epoch) as $age |
    (if $age >= 0 and $age < 10 then "сейчас"
     elif $age >= 10 and $age < 60 then "\($age | floor)с"
     else null end)
   else null end) as $rel |

  (.type // "unknown") as $typ |

  # Color by category
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

  # Detail fields (check root and .data)
  (
    [
      (.source // .data.source // empty | "src=\(.)"),
      (.data.hook // .hook // empty | "hook=\(.)"),
      (.phase // .data.phase // empty | "φ=\(.)"),
      (.progress // empty | "prog=\(.)"),
      (.slug // .data.slug // empty | "slug=\(.[:20])"),
      (.data.agent_type // empty | "agent=\(.)"),
      (.data.agent_id // empty | "id=\(.[:8])"),
      (.data.level // empty | "lvl=\(.)"),
      (.data.provider // empty | "via=\(.)"),
      (.data.latency_s // empty | "\(.)s"),
      (.data.rating // .rating // empty | "★\(.)"),
      (.data.pr_number // empty | "PR#\(.)"),
      (.data.event // .event // empty | "ev=\(.)"),
      (.data.context_id // empty | "ctx=\(.[:8])"),
      (if .data.preview then
        (.data.preview[:30] | gsub("\n"; " ") | "\"\(.)\"")
       elif .data.last_message_preview then
        (.data.last_message_preview[:30] | gsub("\n"; " ") | "\"\(.)\"")
       else empty end)
    ] | join(" │ ")
  ) as $detail_raw |
  ($detail_raw | if length > 80 then .[:77] + "..." else . end) as $detail |

  ($typ | split(".") | last) as $short |

  # Icon by category
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

  (if $rel then "\u001b[38;2;100;116;139m\($ts)\u001b[0m \u001b[38;2;74;222;128m(\($rel))\u001b[0m"
   else "\u001b[38;2;100;116;139m\($ts)\u001b[0m" end) as $ts_display |
  "\($ts_display) \($icon) \($color)\($short)\u001b[0m \u001b[2m\($detail)\u001b[0m"
'
