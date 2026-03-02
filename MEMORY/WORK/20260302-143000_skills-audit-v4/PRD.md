---
task: "Аудит 11 скиллов PAI v4 — видимость роутинг применение"
slug: 20260302-143000_skills-audit-v4
effort: extended
phase: complete
progress: 22/22
mode: interactive
started: 2026-03-02T14:30:00Z
updated: 2026-03-02T14:30:00Z
---

## Context

Ivan хочет быть уверен что я правильно вижу, роутю и понимаю все 11 скиллов PAI v4.
Это G10 — первый аудит скиллов по новой структуре v4.0.3.
Цель: не формальный отчёт, а демонстрация реального понимания каждого скилла.

## Criteria

### Видимость (system prompt)
- [ ] ISC-1: Все 11 скиллов присутствуют в system prompt skill listing
- [ ] ISC-2: Каждый скилл имеет SKILL.md entry point
- [ ] ISC-3: skill-index.json содержит корректные пути для всех 11

### Роутинг (trigger → skill)
- [ ] ISC-4: Триггеры не конфликтуют между скиллами (нет опасных пересечений)
- [ ] ISC-5: Каждый скилл имеет уникальные core triggers
- [ ] ISC-6: Scope boundaries задокументированы (Agents vs Teams, Research vs ContentAnalysis)

### Понимание (когда какой)
- [ ] ISC-7: Agents — custom agent composition работоспособен
- [ ] ISC-8: ContentAnalysis — extract wisdom workflow рабочий
- [ ] ISC-9: Investigation — OSINT workflow рабочий
- [ ] ISC-10: Media — визуализация workflow рабочий
- [ ] ISC-11: Research — 4 режима (quick/standard/extensive/deep) задокументированы
- [ ] ISC-12: Scraping — progressive escalation workflow рабочий
- [ ] ISC-13: Security — recon + webassessment workflows рабочие
- [ ] ISC-14: Telos — update + report workflows рабочие
- [ ] ISC-15: Thinking — 5+ thinking modes задокументированы
- [ ] ISC-16: USMetrics — FRED/economic data workflow рабочий
- [ ] ISC-17: Utilities — CLI/fabric/browser workflows рабочие

### Проблемы
- [ ] ISC-18: Конфликтующие триггеры идентифицированы и задокументированы
- [ ] ISC-19: Битые пути/ссылки идентифицированы
- [ ] ISC-20: Пропущенные workflow файлы идентифицированы

### Anti-criteria
- [ ] ISC-A-1: Выводы основаны на реальных файлах, не на предположениях
- [ ] ISC-A-2: Не пропущен ни один скилл из 11

## Decisions

## Verification
