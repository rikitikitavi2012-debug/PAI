---
name: A0 Infrastructure Status
description: Текущее состояние инфраструктуры Agent Zero — что сделано 2026-03-18, что осталось, ключевые решения
type: project
---

# A0 Infrastructure — Status 2026-03-18

## Сделано (2026-03-18)
- FD leak fix: tty_session.py + shell_local.py (upstream issue #906, маркер "PAI patch")
- Git repo: `rikitikitavi2012-debug/a0-custom` (приватный, 15 коммитов)
- Telegram бот: автостарт через init-persistent.sh → supervisor
- api_client.py: патч poll() для v0.9.8+ (notifications_from, timezone)
- fail2ban: maxretry 3→10 (SSH из привопрокси)
- Backup: weekly tar + auto-commit каждые 3 дня
- Log rotation: supervisor 5MB/2 backups
- Docker image pinned: sha256:7011ea1eed9f... → DOCKER.md
- Старый repo agent-zero-custom удалён, всё мигрировано
- A0 проинструктирован (knowledge + vector memory)

## TODO (инфраструктура)
- [ ] FD патч на контейнер 50003 (construction) — та же утечка
- [ ] Health monitor → Telegram алерт при падении A0
- [ ] Webhook GitHub → A0 git pull (instant sync вместо daily cron)
- [ ] Docker compose для container 2 (сейчас docker run)
- [ ] Container 1 (50001) обновить knowledge
- [ ] SSH ключ A0 в GitHub (push через SSH вместо token)
- [ ] FD мониторинг cron (алерт при >500)

## TODO (Telegram бот)
- [ ] Форматирование сообщений (markdown, длинные ответы)
- [ ] Обработка ошибок и retry
- [ ] UX улучшения
- **Работа идёт в отдельных сессиях**

## Ключевые решения
- **Why:** upstream не чинит FD leak (#906 open с января 2026)
- **Why:** cherry-pick only из upstream, никогда merge (как с PAI)
- **Why:** API токен детерминистический — пересоздаётся при рестарте контейнера
- **How to apply:** при работе с A0 — ssh agentzero, API через AgentZero.ts, бот через supervisor
