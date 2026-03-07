#!/bin/bash
# PAI Health Monitor — cron wrapper
# Runs HealthMonitor.ts every 6 hours, logs results
#
# Install: crontab -e → 0 */6 * * * ~/.claude/scripts/health-cron.sh
# Manual:  bash ~/.claude/scripts/health-cron.sh

set -euo pipefail

LOG_DIR="$HOME/.claude/MEMORY/STATE/health-logs"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)
LOG_FILE="$LOG_DIR/health-$(date +%Y-%m-%d).jsonl"

# Run health monitor, capture output
RESULT=$(bun "$HOME/.claude/PAI/Tools/HealthMonitor.ts" 2>/dev/null) || RESULT='{"error":"HealthMonitor crashed","timestamp":"'"$TIMESTAMP"'"}'

# Append to daily log (JSONL — one JSON object per line)
echo "$RESULT" | jq -c '.' >> "$LOG_FILE" 2>/dev/null || echo "$RESULT" >> "$LOG_FILE"

# Rotate: keep last 30 days
find "$LOG_DIR" -name "health-*.jsonl" -mtime +30 -delete 2>/dev/null || true

# Alert on failures (voice notification via VoiceServer)
if echo "$RESULT" | grep -q '"allHealthy":false'; then
  FAILURES=$(echo "$RESULT" | python3 -c "
import json, sys
r = json.load(sys.stdin)
print(', '.join(c['service'] for c in r.get('checks',[]) if c['status']=='down'))
" 2>/dev/null || echo "unknown services")

  curl -s -X POST http://localhost:8888/notify \
    -H "Content-Type: application/json" \
    -d "{\"message\": \"Health check: $FAILURES down\", \"voice_id\": \"TUQNWEvVPBLzMBSVDPUA\", \"voice_enabled\": true}" \
    >/dev/null 2>&1 || true

  # Auto-recover A0 if it's down
  if echo "$FAILURES" | grep -qi "agent"; then
    echo "[$TIMESTAMP] A0 down — attempting auto-recovery" >> "$LOG_FILE"
    timeout 120 bun "$HOME/.claude/PAI/Tools/HealthMonitor.ts" recover >> "$LOG_FILE" 2>&1 || true
  fi
fi
