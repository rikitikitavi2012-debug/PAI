---
task: Восстановить USER контент из v3 бэкапа в v4 структуру
slug: 20260301-153000_user-context-migration
effort: standard
phase: complete
progress: 12/12
mode: algorithm
started: 2026-03-01T15:30:00+03:00
updated: 2026-03-01T15:30:00+03:00
---

## Context

При миграции v3 → v4 весь персональный контент в `PAI/USER/` потерялся. Причина: в v3
путь был `skills/PAI/USER/`, в v4 стал `PAI/USER/`. Install.sh создал пустые README-заглушки
но не мигрировал файлы. Бэкап цел: `/home/ser/.claude-v3-backup-20260228/skills/PAI/USER/`.

### Влияние на работу

CONTEXT_ROUTING.md ссылается на 15+ файлов в PAI/USER/ — все отсутствуют. Это означает:
- Navi не знает кто такой Ivan (ABOUTME, BASICINFO, RESUME)
- Navi не знает цели и миссию (TELOS — 21 файл, 2200+ строк)
- Navi не знает бизнес-контекст (DOMAINS/construction — 48 файлов, 7700+ строк)
- Navi не знает персональные правила (полный AISTEERINGRULES — 150 строк vs 8 сейчас)
- Navi не знает DA identity (DAIDENTITY.md)

Система работала "вслепую" — без персонального контекста, только на системных инструкциях.

### Загрузка контекста в v4

В v4 контекст загружается двумя путями:
1. `loadAtStartup` в settings.json — файлы грузятся при старте сессии (AISTEERINGRULES, PROJECTS)
2. `CONTEXT_ROUTING.md` — on-demand загрузка когда задача требует контекст

TELOS, ABOUTME, DOMAINS — НЕ грузятся автоматически. Они загружаются через CONTEXT_ROUTING
когда нужны. Но если файлов нет — загружать нечего.

### Risks

- AISTEERINGRULES: в бэкапе 150 строк, мы уже создали 8-строчный файл с языковой директивой.
  Нужно мержить — взять v3 контент + добавить нашу языковую директиву.
- Некоторые файлы из v3 могут быть устаревшими (TECHSTACKPREFERENCES → уже в settings.json.techStack)
- RESPONSEFORMAT → уже в CLAUDE.md modes
- DOMAINS/construction — большой объём, копировать как есть

## Plan

### Группа 1 — Прямой перенос (cp, путь тот же в v4)

| Файл | Строк | Действие |
|------|-------|----------|
| ABOUTME.md | 129 | cp |
| CONTACTS.md | 59 | cp |
| RESUME.md | 82 | cp |
| OPINIONS.md | 59 | cp |
| DEFINITIONS.md | 45 | cp |
| CORECONTENT.md | 105 | cp |
| PRODUCTIVITY.md | 133 | cp |
| DAIDENTITY.md | 70 | cp |
| TELOS/ (21 файл) | 2200+ | cp -r |

### Группа 2 — Мерж

| Файл | Действие |
|------|----------|
| AISTEERINGRULES.md | v3 контент (150 строк) + наша языковая директива |

### Группа 3 — Решение нужно

| Файл | Вопрос |
|------|--------|
| TECHSTACKPREFERENCES.md | Дубль settings.json.techStack? |
| ARCHITECTURE.md | Перенести как есть? |
| INFRASTRUCTURE.md | Перенести как есть? |
| RESPONSEFORMAT.md | Уже в CLAUDE.md? |
| BASICINFO.md | Мержить в ABOUTME? |

### Группа 4 — Бизнес-домен

| Директория | Действие |
|-----------|----------|
| DOMAINS/construction/ (48 файлов, 7700 строк) | cp -r целиком |

## Criteria

- [x] ISC-1: TELOS директория содержит все 22 файла из бэкапа
- [x] ISC-2: ABOUTME.md существует (129 строк)
- [x] ISC-3: CONTACTS.md существует (59 строк)
- [x] ISC-4: RESUME.md существует (82 строки)
- [x] ISC-5: DAIDENTITY.md существует (70 строк)
- [x] ISC-6: AISTEERINGRULES.md содержит полные v3 правила (150 строк, включая язык)
- [x] ISC-7: OPINIONS, DEFINITIONS, CORECONTENT, PRODUCTIVITY перенесены
- [x] ISC-8: DOMAINS/construction/ перенесена целиком (48 файлов)
- [x] ISC-9: CONTEXT_ROUTING — 14/15 путей совпадают, PROJECTS.md создан
- [x] ISC-10: TECHSTACKPREFERENCES перенесён (не дубль settings.json)
- [x] ISC-11: ARCHITECTURE + INFRASTRUCTURE перенесены
- [x] ISC-12: RESPONSEFORMAT перенесён (не дубль CLAUDE.md — разные цели)

## Decisions

## Verification
