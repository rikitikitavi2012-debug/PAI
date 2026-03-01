# Frame: System Domain

## Meta
- **Domain:** system
- **Confidence:** 75%
- **Observation Count:** 13
- **Last Crystallized:** 2026-03-01
- **Source:** Converted from system.json

---

## Core Principles

### Голосовые уведомления через ElevenLabs критичны для рабочего процесса Ivan [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

### ConfigChange hook event blocks mid-session settings.json mutations — add to SecurityValidator [CRYSTAL: 85%]
- **Confirmed:** 1 times
- **Since:** 2026-02-22

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

