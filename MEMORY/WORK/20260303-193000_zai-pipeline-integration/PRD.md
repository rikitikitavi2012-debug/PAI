---
task: "Z.AI pipeline integration + CommunityWatcher + Jules security task"
slug: "20260303-193000_zai-pipeline-integration"
effort: extended
phase: complete
progress: 17/17
mode: algorithm
started: "2026-03-03T19:30:00"
updated: "2026-03-03T19:30:00"
---

## Context

PAI v4.0.3. Z.AI подписка оплачена, но нагрузка 5%. Четыре задачи:
1. Параллельный Z.AI review в JulesAutoMerge (рядом с A0)
2. Предложения по расширению Z.AI в pipeline
3. CommunityWatcher.ts в LoadContext hook (замена CommunityCheck.ts)
4. Новый Jules task на security fixes (fetch timeouts + top-level catches)

Z.AI review уже существует в JulesAutoMerge.ts (строки 258-289), но запускается последовательно. Нужна параллелизация через async refactoring.

## Criteria

- [x] ISC-1: A0 and Z.AI reviews run via Promise.all (parallel)
- [x] ISC-2: Z.AI uses direct inference() import, not CLI subprocess
- [x] ISC-3: Z.AI HIGH severity blocks merge (same as A0)
- [x] ISC-4: Both review results logged in events.jsonl appendEvent
- [x] ISC-5: Z.AI timeout remains 30s (ZAI_REVIEW_TIMEOUT)
- [x] ISC-6: Z.AI error is fail-open (unreachable → proceed)
- [x] ISC-7: Existing bun tests pass after all changes (204/204)
- [x] ISC-8: List of 3+ Z.AI expansion use cases presented to Ivan
- [x] ISC-9: Each use case has effort estimate and ROI reasoning
- [x] ISC-10: LoadContext references CommunityWatcher.ts not CommunityCheck.ts
- [x] ISC-11: CommunityWatcher --brief output injected at session start
- [x] ISC-12: Action items from community-report.json shown if present
- [x] ISC-13: Community check timeout stays 5s (non-blocking startup)
- [x] ISC-14: Jules task created with fetch timeout directive
- [x] ISC-15: Jules task includes top-level catch directive
- [x] ISC-16: Jules task excludes formatting changes explicitly
- [x] ISC-17: Jules task excludes PR #16 vocabulary-loader files

## Decisions

## Verification
