---
name: Agent Claim System (future)
description: Claim system + deadlock detection для параллельных агентов — запланировано на межсезонье
type: project
---

Agent Claim System + Deadlock Detection — запланировано на будущее (межсезонье).

**Why:** Сейчас параллельные агенты работают на независимых задачах и конфликтов нет. Когда агентов станет 10+ и они начнут редактировать общие файлы — нужна координация.

**How to apply:** Реализовать когда появится реальный конфликт между агентами, не раньше. Оценка: 30 минут работы (claim.json + heartbeat + expiry).

**Компоненты:**
1. `claim.json` в PRD directory — агент бронирует ISC-N перед работой
2. Heartbeat — timestamp обновляется каждые 30с, expired после 60с
3. No cross-dependencies — агенты получают независимые наборы ISC

**Score impact:** Agent Coordination 8→10 (+2 очка → Algorithm 93→95/100)
