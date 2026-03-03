---
task: Kitty terminal audit, error fixes, launch optimization, user guide
slug: 20260302-211500_kitty-terminal-setup-audit
effort: standard
phase: complete
progress: 10/10
mode: algorithm
started: 2026-03-02T21:15:00
updated: 2026-03-02T21:15:00
---

## Context

Ivan использует Kitty 0.45.0 в WSL2 для работы с Claude Code. Текущий workflow запуска слишком длинный: Windows Terminal → WSL вкладка → команда kitty → команда pai. При запуске появляются предупреждения (EGL, D-Bus, HISTCONTROL, update check). Нужно: пофиксить предупреждения, упростить запуск до 1-2 действий, объяснить преимущества Kitty.

## Criteria

- [x] ISC-1: D-Bus warnings перенаправлены в лог (WSL2 не имеет desktop portal)
- [x] ISC-2: Update check warning подавлен через update_check_interval 0
- [x] ISC-3: HISTCONTROL warning — безвредный, bash ignoreboth, не фиксится
- [x] ISC-4: Windows .bat файлы созданы на Desktop (PAI.bat + PAI Quick.bat)
- [x] ISC-5: pai-kitty stderr перенаправлен в ~/.cache/kitty-startup.log
- [x] ISC-6: Shell integration включена по умолчанию в Kitty 0.45.0
- [x] ISC-7: Гайд по ключевым хоткеям Kitty для Claude Code написан
- [x] ISC-8: Объяснение преимуществ Kitty vs Windows Terminal представлено
- [x] ISC-9: Workflow "как запускать" описан пошагово
- [x] ISC-10: Конфиг проверен на отсутствие других проблем

## Decisions

## Verification
