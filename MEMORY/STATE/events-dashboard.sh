#!/bin/bash
# Events Dashboard - one-liner wrapper
# Usage: ./events-dashboard.sh [path/to/events.jsonl]
FILE="${1:-/home/user/repos/PAI-personal/MEMORY/STATE/events.jsonl}"
if [ ! -f "$FILE" ]; then echo -e "\033[31m✗ Файл не найден: $FILE\033[0m"; else echo -e "\n\033[36m════════════════════════════════════════\n       📊 EVENTS DASHBOARD\n════════════════════════════════════════\033[0m\n"; echo -e "\033[33m📋 Total events:\033[0m $(wc -l < "$FILE")"; echo -e "\n\033[33m📈 Top 5 types:\033[0m"; jq -r '.type' "$FILE" | sort | uniq -c | sort -rn | head -5 | while read c t; do printf "  \033[32m%-15s\033[0m %s\n" "$t" "$c"; done; echo -e "\n\033[33m🕐 Last 5 events:\033[0m"; tail -5 "$FILE" | jq -r '"  [" + .timestamp + "] " + .type + ": " + .message' | while read line; do echo -e "\033[36m$line\033[0m"; done; echo -e "\n\033[32m✓ Dashboard complete\033[0m\n"; fi
