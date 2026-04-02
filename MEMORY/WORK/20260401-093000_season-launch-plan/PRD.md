---
task: План запуска рекламы на сезон — сайт + Директ
slug: 20260401-093000_season-launch-plan
effort: Extended
phase: observe
progress: 0/8
mode: algorithm
started: 2026-04-01T09:30:00
updated: 2026-04-01T09:30:00
---

## Context

Сезон уже начался (1 апреля). Иван на стройке 6/1, только вечера свободны. Сайт полнофункционален (18 страниц, 12 статей, 5 портфолио), но реклама не запущена. Direct API одобрен. Блокер: регистрация ПД.

**Ключевые ограничения:**
- Время Ивана: 2-3 часа/неделю на маркетинг
- Бюджет: 20K ₽/мес стартовый
- Цель: первые лиды к середине апреля

## Criteria

- [ ] ISC-1: Иван понимает что делает сам vs что делает Navi (verify: explicit confirmation)
- [ ] ISC-2: Регистрация ПД на pd.rkn.gov.ru — инструкция для Ивана (verify: doc exists)
- [ ] ISC-3: Цели в Метрике настроены: форма, телефон, калькулятор (verify: ym goals exist)
- [ ] ISC-4: UTM-разметка для Директа готова (verify: utm params documented)
- [ ] ISC-5: Тестовая кампания в sandbox Директ создана (verify: campaign exists)
- [ ] ISC-6: Боевая кампания "террасы спб" готова к запуску (verify: campaign active)
- [ ] ISC-7: Бюджет и ставки определены (verify: numbers documented)
- [ ] ISC-8: Автоответ на заявки — шаблон email/WhatsApp (verify: template exists)
- [ ] ISC-9: Решение по хостингу — выбрана альтернатива Vercel или Cloudflare Proxy (verify: decision documented)

## Decisions

**Блокер обнаружен:** Vercel частично заблокирован в РФ (IP 76.76.21.21). Риски для рекламной кампании.

**Исследование запущено (4 агента):**
1. Amvera Cloud — РФ аналог, рубли, автодеплой
2. Coolify на VPS (Timeweb/Reg.ru) — self-hosted PaaS
3. Yandex Cloud Serverless Containers
4. Cloudflare Proxy — защита текущего Vercel

**Критерии выбора:**
- Автодеплой из GitHub (push → deploy)
- Рублёвая оплата
- Next.js 16 поддержка
- SSL + кастомные домены
- Удобство для Navi (управление через CLI/API)
- Стоимость < 2000 ₽/мес

## Verification

(To be filled in VERIFY phase)
