# Frame: System Domain

## Meta
- **Domain:** system
- **Confidence:** 75%
- **Observation Count:** 20
- **Last Crystallized:** 2026-03-16
- **Source:** Converted from system.json

---

## Core Principles

### Голосовые уведомления через ElevenLabs критичны для рабочего процесса Ivan [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

### ConfigChange hook event blocks mid-session settings.json mutations — add to SecurityValidator [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

### Stdin sharing: 2+ хука в одном hooks[] массиве делят stdin — один хук = один entry [CRYSTAL: 90%]
- **Confirmed:** 2 times (UserPromptSubmit 5 hooks, SessionEnd 5 hooks)
- **Since:** 2026-03-16

### Transcript race: Stop hooks fire before transcript fully flushed — use last_assistant_message from stdin or delay 300ms+ [CRYSTAL: 85%]
- **Confirmed:** 1 time (VoiceCompletion silent after long responses)
- **Since:** 2026-03-16

### THEHOOKSYSTEM.md drifts 2x faster than code — automate doc sync or audit quarterly [CRYSTAL: 80%]
- **Confirmed:** 1 time (documented 20 hooks, actual 50 instances)
- **Since:** 2026-03-16

### Voice localization = all layers: SKILL.md + Workflows + Tools + Agents + Hooks + Templates [CRYSTAL: 90%]
- **Confirmed:** 1 time (found English voice in 5 layers after "complete" localization)
- **Since:** 2026-03-16

---

## Contextual Rules

- Ivan работает в WSL2 Ubuntu на Windows 11 с Windows Terminal (WT_SESSION всегда есть) (learned 2026-02-22)
- When fixing subsystem bugs, Ivan audits ALL related agents/contexts for same pattern—not just the flagged file (learned 2026-02-27)
- Ivan needs detailed mechanical explanations of system changes before executing — abstract plans insufficient without 'how does this actually work' clarity (learned 2026-02-28)

---

## Predictive Model

| Request Pattern | Predicted Want | Confidence |
|----------------|---------------|------------|
| When running multi-iteration loops, Ivan structures PRDs with per-iteration effort levels (Fast/Normal/Deep) — will likely ask to adjust pace mid-loop based on results | To be refined | 60% |

---

## Anti-Patterns (from observations)

### Перед изменением системных хуков проверять переменные окружения на всех платформах
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-22

### Всегда использовать -i флаг в grep для human-readable текста
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-22

### При создании новых инструментов — сначала проверить наличие в PAI/Tools/, не создавать дубли
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-22

### algorithm-reflections должны читаться безусловно в WISDOM INJECTION, не только в CONTEXT RECOVERY
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-22

### claude --print subprocess takes 9-90+s unpredictably — fragile for background inference, direct API preferred
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-25

### Privoxy HTTP proxy breaks Axios requests in Node.js MCP servers — override proxy env vars for MCP processes
- **Severity:** High
- **Frequency:** Confirmed 1 times
- **Since:** 2026-03-12

### Agent integration pattern: symlinks for Gemini/OpenCode, system prompt + memory for A0, CLAUDE.md for Navi — each agent has its own PAI context channel
- **Severity:** Low
- **Frequency:** Confirmed 1 times
- **Since:** 2026-03-12

### Placeholder strings like  in agent configs silently pass through to production — need validation layer before deployment
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26

### Agent system discrepancy: 5 researcher agents claim specialized APIs (Perplexity/Grok/Gemini) but actually use Claude WebSearch — Ivan notices and flags as accuracy issue
- **Severity:** Medium
- **Frequency:** Confirmed 1 times
- **Since:** 2026-02-26


---

## Cross-Frame Connections

*To be discovered through cross-frame synthesis.*

---

## Evolution Log
- 2026-03-01: Frame created from system.json (13 observations)


- 2026-03-16: [anti-pattern] Configuration error after Navi's changes broke bridge setup