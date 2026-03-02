---
task: "Consolidate event hooks, create EventStats tool, fix BuildCLAUDE"
slug: "20260302-220000_hook-consolidation-eventstats"
effort: advanced
phase: complete
progress: 28/28
mode: interactive
started: "2026-03-02T22:00:00+03:00"
updated: "2026-03-02T22:00:00+03:00"
---

## Context

Три трека для снижения maintenance surface и повышения полезности events.jsonl:

1. **Hook consolidation**: 3 pure event-logger хука (SubagentStart, SubagentStop, TaskCompleted) → 1 EventLogger.hook.ts с роутингом по hook_event_name. Чистое сокращение: 32 → 30 хуков.
2. **EventStats tool**: events.jsonl содержит 196+ событий без потребителя. CLI инструмент для анализа — type distribution, daily counts, top sources, recent events.
3. **Cleanup**: BuildCLAUDE.ts inconsistency (bun prefix vs shebang), 2 stale ACTIVE work dirs.

### Risks
- EventLogger routing по hook_event_name — если Claude Code не передаёт это поле для всех events, routing сломается. Mitigation: fallback на source detection.
- Удаление 3 хук-файлов — деструктивное действие, но файлы только что созданы (этой сессией), потери нет.

## Criteria

### Track 1: Hook Consolidation
- [x] ISC-1: EventLogger.hook.ts created with shebang and readStdin
- [x] ISC-2: EventLogger.hook.ts has chmod +x
- [x] ISC-3: EventLogger routes SubagentStart → agent.start event
- [x] ISC-4: EventLogger routes SubagentStop → agent.stop event
- [x] ISC-5: EventLogger routes TaskCompleted → task.completed event
- [x] ISC-6: EventLogger extracts relevant fields per event type
- [x] ISC-7: settings.json SubagentStart points to EventLogger.hook.ts
- [x] ISC-8: settings.json SubagentStop points to EventLogger.hook.ts
- [x] ISC-9: settings.json TaskCompleted points to EventLogger.hook.ts
- [x] ISC-10: SubagentStart.hook.ts removed
- [x] ISC-11: SubagentStop.hook.ts removed
- [x] ISC-12: TaskCompleted.hook.ts removed
- [x] ISC-13: EventLogger compiles with bun build

### Track 2: EventStats Tool
- [x] ISC-14: PAI/Tools/EventStats.ts created
- [x] ISC-15: EventStats reads and parses events.jsonl
- [x] ISC-16: EventStats shows event type distribution with counts
- [x] ISC-17: EventStats shows events per day (last 7 days)
- [x] ISC-18: EventStats shows top event sources
- [x] ISC-19: EventStats shows N most recent events
- [x] ISC-20: EventStats has --help with usage examples
- [x] ISC-21: EventStats runs via `bun PAI/Tools/EventStats.ts`

### Track 3: Cleanup
- [x] ISC-22: BuildCLAUDE.ts has chmod +x
- [x] ISC-23: settings.json uses shebang path (no bun prefix) for BuildCLAUDE
- [x] ISC-24: 20260302-204033_task META.yaml status COMPLETED
- [x] ISC-25: 20260302-204529_task META.yaml status COMPLETED

### Anti-Criteria
- [x] ISC-A-1: No existing hook functionality lost (9 real-work hooks verified present)
- [x] ISC-A-2: 76 existing tests still pass (0 fail, 184 expect() calls)
- [x] ISC-A-3: events.jsonl append format unchanged (type/source/timestamp structure)

## Decisions

- 2026-03-02 22:10: Only 3 of 12 appendEvent hooks are pure loggers — rest do real work. Consolidation scope is 3→1, not 12→1.
- 2026-03-02 22:10: EventLogger uses routing table (HANDLERS map) for extensibility — future event types add one function + one table entry.
- 2026-03-02 22:10: Unknown events logged as custom.unknown — fail-open observability, never silent drop.

## Verification

- ISC-1-6: EventLogger.hook.ts: shebang ✓, chmod +x ✓, 3 routes smoke-tested with events appearing in events.jsonl
- ISC-7-9: settings.json has 3 entries pointing to EventLogger.hook.ts (SubagentStart, SubagentStop, TaskCompleted)
- ISC-10-12: Old hooks confirmed deleted (ls returns "No such file")
- ISC-13: bun build succeeds (12.99 KB bundle)
- ISC-14-21: EventStats.ts: all 5 subcommands verified (overview, types, daily, sources, recent, --help)
- ISC-22-23: BuildCLAUDE.ts is -rwxr-xr-x, settings.json uses `${PAI_DIR}/hooks/handlers/BuildCLAUDE.ts` (no bun prefix)
- ISC-24-25: Both task META.yaml files show status: "COMPLETED"
- ISC-A-1: All 9 real-work hooks present on disk
- ISC-A-2: 76 pass, 0 fail across 12 test files
- ISC-A-3: events.jsonl format has type/source/timestamp structure intact
