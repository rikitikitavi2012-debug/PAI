# Explore Agent Expertise

> Auto-generated expertise from 0 patterns across sessions

## Domain Knowledge

- Use Glob for file pattern matching before Grep — faster for existence checks
- Use Grep with glob parameter instead of find + grep — single tool call
- Check file size before reading — files >500 lines may need offset/limit
- Parallel glob/grep calls for independent searches — reduces latency

## Insights

- Glob returns files sorted by mtime — most recently modified first
- Grep with head_limit prevents context explosion on large codebases
- Read with offset/limit for large files — prevents token overflow

## Failure Patterns

- Grep without glob can return massive results — always use head_limit
- Reading binary files causes encoding errors — check extension first
- Glob on node_modules/.git blows up — always exclude these dirs

## Tool Preferences

- Prefer: Glob for file discovery, Grep for content search
- Avoid: Bash find/ls when Glob/Grep can do the job
- Pattern: Glob → Grep → Read sequence for targeted exploration

---
*Updated: 2026-04-02T14:50:00.000Z*
*Patterns: 10*
