---
task: PAI accounting system — live usage tracking, OpenCode brigade, API audit
slug: pai-accounting
effort: Advanced
phase: execute
progress: 18/20
mode: algorithm
started: 2026-03-05
updated: 2026-03-05
---

## Context
Ivan wants precise financial tracking for all PAI infrastructure. Real subscription data collected, ElevenLabs and Z.AI live tracking already working. Now: add OpenRouter balance, set up Anthropic admin key, integrate Timeweb API, install OpenCode as brigade member, audit remaining API keys.

## Criteria
- [x] ISC-1: cost-budget.json contains all real subscription amounts
- [x] ISC-2: ElevenLabs live usage displayed in Strategic dashboard (chars/limit)
- [x] ISC-3: Z.AI live quota displayed in Strategic dashboard (req/limit)
- [x] ISC-4: Subscription breakdown visible with per-service costs
- [x] ISC-5: API cost estimate scoped to non-subscription calls only (A0)
- [x] ISC-6: Strategic dashboard in Center tab (vsplit with Command Center)
- [x] ISC-7: Telemetry tab restored to 2-window (Events + Operational)
- [x] ISC-8: OpenRouter balance ($3.22 remaining) displayed in dashboard
- [x] ISC-9: Anthropic Admin API key instructions verified and documented
- [x] ISC-10: OpenCode Go installed and callable via `opencode run`
- [ ] ISC-11: OpenCode added to PAI Inference.ts or standalone Brigade tool
- [x] ISC-12: Timeweb API token setup instructions provided to Ivan
- [ ] ISC-13: Timeweb balance live display in dashboard (when token available)
- [x] ISC-14: OpenAI API key validated — balance/org status checked
- [x] ISC-15: Apify token tested — works on FREE plan
- [x] ISC-16: BrightData token permissions checked — needs Finance/Admin token
- [x] ISC-17: Replicate account billing status verified — active, no billing API
- [x] ISC-18: Exa usage tracking method documented — 1K free/mo, web dashboard
- [x] ISC-19: cost-budget.json updated with all API key statuses
- [x] ISC-20: bash -n passes on all modified .sh files

## Decisions
- OpenRouter: add live balance fetch (same pattern as ElevenLabs/Z.AI cache)
- OpenCode: install globally, add as Brigade member like Gemini CLI
- Timeweb: needs Ivan to create API token in panel
- Anthropic: needs Ivan to create Admin key in Console
- Pay-per-use APIs: document status in cost-budget.json, track from events where possible
