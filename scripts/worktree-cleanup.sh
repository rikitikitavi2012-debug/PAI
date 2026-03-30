#!/bin/bash
# Cleanup stale agent worktrees (runs via cron every 3 days)
cd /home/ser/.claude || exit 1
git worktree prune 2>/dev/null

# Remove orphaned agent worktree directories
find /home/ser/.claude/.claude/worktrees -maxdepth 1 -name 'agent-*' -type d -mtime +1 -exec rm -rf {} + 2>/dev/null

echo "$(date -Iseconds) worktree-cleanup done" >> /home/ser/.claude/MEMORY/STATE/cron.log
