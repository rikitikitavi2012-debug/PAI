#!/bin/bash
# JulesAutoMerge — cron wrapper
# Checks Jules PRs, runs tests, merges passing ones
#
# Install: crontab -e → 0 3,9,15,21 * * * ~/.claude/scripts/automerge-cron.sh
# Manual:  bash ~/.claude/scripts/automerge-cron.sh

set -euo pipefail

export PATH="$HOME/.bun/bin:$PATH"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:8118}"
export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:8118}"
# A0 direct — bypass proxy
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}72.56.86.51"
export no_proxy="${no_proxy:+$no_proxy,}72.56.86.51"

LOG_DIR="$HOME/.claude/MEMORY/STATE/health-logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)
LOG_FILE="$LOG_DIR/automerge-$(date +%Y-%m-%d).log"

echo "[$TIMESTAMP] AutoMerge cron start" >> "$LOG_FILE"

cd "$HOME/.claude"
RESULT=$(timeout 300 bun PAI/Tools/JulesAutoMerge.ts merge 2>&1) || RESULT="AutoMerge crashed or timed out"

echo "$RESULT" >> "$LOG_FILE"
echo "[$TIMESTAMP] AutoMerge cron end" >> "$LOG_FILE"

# Notify on merges or failures
MERGED=$(echo "$RESULT" | grep -c "MERGED" || true)
FAILED=$(echo "$RESULT" | grep -c "FAIL" || true)

if [ "$MERGED" -gt 0 ] || [ "$FAILED" -gt 0 ]; then
  MSG="AutoMerge: ${MERGED} merged, ${FAILED} failed"
  curl -s -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"$MSG\", \"voice_id\": \"ogi2DyUAKJb7CEdqqvlU\", \"voice_enabled\": true}" \
    >/dev/null 2>&1 || true
fi

# Rotate logs >30 days
find "$LOG_DIR" -name "automerge-*.log" -mtime +30 -delete 2>/dev/null || true
