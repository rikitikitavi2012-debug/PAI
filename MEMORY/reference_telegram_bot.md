---
name: A0 Telegram Bot Setup
description: Настройка Telegram-бота @A0_timecloud_bot — токен, контейнер, архитектура, фиксы, SSH доступ к хосту
type: reference
---

# A0 Telegram Bot (@A0_timecloud_bot)

## Расположение
- **Код:** `agent-zero-custom/telegram_bot/` (20 файлов Python/aiogram)
- **Работает в:** контейнер `agent-zero-new` (порт 50002)
- **НЕ на хосте** — дубликат процесса на хосте убит (PID 2057938, 2026-03-13)

## Ключевые файлы
- `bot.py` — main entry (Bot, Dispatcher, HealthMonitor, NotificationBridge, AnomalyDetector)
- `config.py` — env vars (BOT_TOKEN, ALLOWED_USERS, POLL_INTERVAL=5s)
- `api_client.py` — A0 Flask API клиент (session auth + CSRF)
- `notification_bridge.py` — поллит A0 API каждые 5сек, форвардит в TG
- `commands.py` — /start, /reset, /status, /stats

## Конфигурация
- **A0 API URL:** `http://127.0.0.1:80` (localhost в том же контейнере)
- **Auth:** login/password из .env (A0 Flask auth)
- **CSRF:** автоматический через session

## Фикс v0.9.8+ (2026-03-13)
В `api_client.py` метод `poll()` — добавлены обязательные параметры:
```python
json_data["notifications_from"] = 0
json_data["timezone"] = "UTC"
```

## SSH доступ к хосту VPS
- Прямой SSH с WSL не работает (Permission denied)
- **Workaround:** через контейнер 50001 → `ssh agentzero@172.18.0.1`
- Контейнер 50001 = escape hatch с SSH к хосту

## Именование контейнеров
| Порт | Имя контейнера | Роль |
|------|---------------|------|
| 50001 | (unnamed/agent-zero) | Escape hatch, SSH к хосту |
| 50002 | agent-zero-new | Основной A0, бот здесь |
| 50003 | (третий) | A2A peer |
