---
name: A0 Telegram Bot Project
description: Рабочая директория, стек, бригада, деплой для проекта TG бота Agent Zero со стримингом
type: project
---

# A0 Telegram Bot (@A0_timecloud_bot)

## Рабочая директория
`/home/ser/projects/a0-telegram-bot/` — клон `rikitikitavi2012-debug/a0-custom`

## Стек
Python 3.13, aiogram 3.26.0, python-socketio 5.16.1, Bot API 9.5 (sendMessageDraft)

## Деплой
`make deploy` — push + git pull в контейнере + supervisorctl restart

## Контейнер
`agent-zero-new` на VPS 72.56.86.51:50002, SSH: `ssh agentzero`

## Контекстные файлы (настроены 2026-03-18)
- CLAUDE.md (Navi), GEMINI.md (Gemini), AGENTS.md (OpenCode), .jules/AGENTS.md (Jules)
- Makefile: 15 команд (deploy, test, logs, status, shell...)
- .gemini/settings.json, opencode.json

## Статус (2026-03-18)
- Фаза 1 (исследование) ✅
- Фаза 2 (документация) ✅ — 13 файлов, 4200+ строк
- Фаза 3 (реализация) ✅ — socket_client, stream_reply, message_handler v2
- Фаза 4 (тестирование) 🔄 — Jules сделал 3 PR (тесты + интеграция), нужен merge + live test
- Bugfixes: session leak, callback safety, queue cleanup (Gemini review)

## Jules PRs (merge pending)
- PR #3: тесты StreamReply
- PR #2: streaming fix + log types + inline keyboard
- PR #1: тесты A0SocketClient

**Why:** Проект перенесён из ~/.claude в собственную директорию для бригадной работы
**How to apply:** Всегда работать из /home/ser/projects/a0-telegram-bot/, не из ~/.claude
