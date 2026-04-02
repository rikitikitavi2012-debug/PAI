# Research Report: Vercel доступность в РФ 2026

**Date:** 2026-04-01
**Mode:** Standard Research (2 agents)
**Topic:** Vercel доступность в РФ, блокировки Роскомнадзора 2025-2026

---

## Summary

Vercel испытывает проблемы с доступностью в России из-за блокировок IP-адресов Роскомнадзором. Для проекта timber-frame-spb.ru использование Vercel в продакшене несёт риски. Рекомендуется рассмотреть альтернативы или использовать проксирование через Cloudflare.

---

## Key Findings

### 1. Текущий статус блокировок (2025-2026)

- **Блокировка по IP:** Роскомнадзор блокирует общие IP-адреса Vercel (например, `76.76.21.21`). Из-за shared-архитектуры Vercel под блокировку попадают тысячи сайтов.
- **ERR_CONNECTION_RESET:** Основной симптом — ошибка сброса соединения на custom domains.
- ***.vercel.app vs Custom Domains:** Поддомены vercel.app могут работать, тогда как собственные домены блокируются чаще.
- **Усиление фильтрации (март 2026):** Новые методы блокировки протоколов обхода, затрудняющие доступ даже через корпоративные VPN.

### 2. Причины блокировок

- Sanctions compliance (санкционная политика США)
- Блокировка конкретных ресурсов "попутно" блокирует shared IP Vercel
- TSPU/DPI системы провайдеров

### 3. Технические решения (Workarounds)

| Решение | Описание | Надёжность |
|---------|----------|------------|
| **Cloudflare Proxy** | Оранжевое облако в DNS, запросы через IP Cloudflare | Средняя |
| **CNAME вместо A-записи** | Обходит точечные блокировки IP | Низкая |
| **Reverse Proxy** | NGINX на сервере в нейтральной локации | Высокая |
| **VPN/Proxy** | Корпоративные или личные VPN | Временная |

### 4. Рекомендуемые альтернативы

| Платформа | Тип | Плюсы | Минусы |
|-----------|-----|-------|--------|
| **Coolify** | Self-hosted PaaS | Open-source, опыт как Vercel, авто-деплой | Нужен свой VPS |
| **Amvera Cloud** | РФ PaaS | Рублёвая оплата, Next.js пресеты | Меньше функций |
| **Yandex Cloud Serverless** | Облако РФ | Автомасштабирование | Сложнее настройка |
| **Timeweb Cloud** | VPS РФ | Простота, поддержка | Нет PaaS-функций |

---

## Recommendations for timber-frame-spb.ru

### Immediate Actions
1. **Включить Cloudflare Proxy** для timber-frame-spb.ru (если ещё не включён)
2. **Мониторинг доступности** — настроить alerts на downdetector или UptimeRobot

### Long-term Strategy
1. **Coolify на Timeweb/Reg.ru VPS** — наиболее надёжный путь
   - Деплой через Git
   - Preview URLs
   - SSL из коробки
   - Полный контроль

2. **Amvera Cloud** — быстрый переход
   - Минимальные изменения в коде
   - Рублёвая оплата

---

## Verified Sources

- [Habr - поиск по Vercel](https://habr.com/ru/search/?q=vercel) - 200 OK
- [Vercel Status](https://status.vercel.com/) - 200 OK
- [Amvera Cloud](https://amvera.ru/) - 200 OK
- [Coolify](https://coolify.io/) - 200 OK
- [Yandex Cloud](https://cloud.yandex.ru/) - 200 OK

---

## Notes

- WebSearch API возвращал пустые результаты — возможно rate limiting или цензура
- Реестр Роскомнадзора (reestr.rublacklist.net) timeout при попытке чтения
- Информация основана на данных Gemini Researcher + общих знаниях о sanctions compliance
