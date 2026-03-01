# Реестр цифровых активов

Реестр цифровых ресурсов Ivan для мгновенного распознавания и управления.

---

## Серверы (VPS)

### Agent Zero VPS
- **IP:** 72.56.86.51
- **SSH alias:** `agentzero`
- **Тип:** VPS (Timeweb)
- **OS:** Ubuntu 24.04 LTS
- **CPU/RAM:** 8 GB RAM
- **Disk:** 77 GB (53% used)
- **Назначение:** AI-агенты Agent Zero в Docker контейнерах
- **Порты:** 22 (SSH), 50001-50003 (Agent Zero Web UI), 10050 (Zabbix)

#### Docker контейнеры

| Контейнер | Порт | Назначение |
|-----------|------|------------|
| agent-zero | :50001 | Основной Agent Zero |
| agent-zero-new | :50002 | Новая версия Agent Zero |
| agent-zero-construction | :50003 | Строительный Agent Zero |

### Xray Tunnel VPS
- **IP:** 72.56.99.127
- **SSH alias:** `xray-vps`
- **Тип:** VPS (Timeweb)
- **OS:** Ubuntu 24.04 LTS
- **CPU/RAM:** 1 GB RAM (минимальный)
- **Disk:** 14 GB (21% used)
- **Назначение:** VPN/прокси (Xray VLESS/XTLS) для обхода блокировок
- **Порты:** 22 (SSH), 443 (Xray), 10050 (Zabbix)

---

## Локальная машина

### Windows 11 Pro + WSL2
- **WSL:** Ubuntu 24.04 (user: ser)
- **Терминал:** Kitty v0.45.0
- **Редактор:** VS Code
- **AI:** Claude Code с Anthropic Max подпиской
- **Туннель:** SSH -D 1080 → privoxy :8118 → Claude Code

---

## Сервисы и подписки

| Сервис | Тип | Назначение |
|--------|-----|------------|
| Anthropic Max | AI подписка | Claude Code / PAI |
| Timeweb | VPS хостинг | Agent Zero + Xray серверы |
| ElevenLabs | API | Голосовой вывод Navi (TTS) |
| Supabase | Database + Auth | PostgreSQL для проектов |
| GitHub | Git хостинг | [@rikitikitavi2012-debug](https://github.com/rikitikitavi2012-debug) |
| YouTube | Видеохостинг | [Канал](https://www.youtube.com/channel/UCHmG_uLs-K-L-cIC25L6GgA) |
| Google API | API | YouTube Data API, Google AI (Gemini) |
| Vercel | Деплой | Фронтенд хостинг |
| Apify | API | Скрапинг соцсетей |
| BrightData | API | SERP скрапинг |
| Replicate | API | Генерация изображений (Flux, Nano Banana) |
| OpenRouter | API | Мультимодельный роутер |
| Exa.ai | API | AI-поиск |

---

## Проекты (активные)

| Проект | Путь | Стек | Статус |
|--------|------|------|--------|
| PAI Dashboard | `~/projects/pai-dashboard/` | Next.js 16, shadcn/ui, Tailwind | В разработке |
| PAI (фреймворк) | `~/.claude/skills/PAI/` | TypeScript, Bun | Активный |

---

## Доступ и безопасность

- **SSH ключ:** `~/.ssh/id_rsa` (единый для всех серверов)
- **SSH config:** `~/.ssh/config` (alias'ы agentzero, xray-vps)
- **Мониторинг:** Zabbix agent на обоих VPS (порт 10050, Timeweb)
- **Прокси:** Xray → SOCKS5 → privoxy → HTTP_PROXY для Claude Code

---

## API-ключи (реестр, без значений)

Все ключи хранятся в `.env` файлах, НЕ в USER файлах.

| API | Переменная | Статус |
|-----|-----------|--------|
| ElevenLabs TTS | `ELEVENLABS_API_KEY` | Активен |
| GitHub PAT | `GITHUB_TOKEN` | Активен |
| Google API | `GOOGLE_API_KEY` | Активен |
| YouTube Data | `YOUTUBE_API_KEY` | Активен |
| Replicate | `REPLICATE_API_TOKEN` | Активен |
| Apify | `APIFY_TOKEN` | Активен |
| BrightData SERP | `BRIGHTDATA_API_KEY` | Активен |
| OpenRouter | `OPENROUTER_API_KEY` | Активен |
| Exa.ai | `EXA_API_KEY` | Активен |
| Vercel | `VERCEL_TOKEN` | Активен |
| Supabase | `SUPABASE_ACCESS_TOKEN` | Активен |
| Ref.tools | `REF_API_KEY` | Активен |
| Yandex Wordstat | — | Нужно получить |
| Yandex Direct API | — | Нужно получить |
| Yandex Metrika | — | Нужно получить |
| Cloudflare | `CF_ACCOUNT_ID` | Не настроен |
| OpenAI | `OPENAI_API_KEY` | Не настроен |

---

## Будущие интеграции (TODO)

- **Yandex Wordstat API** — ключевые слова для SEO статей сайта МАФ
- **Yandex Direct API** — контекстная реклама
- **Yandex Metrika API** — аналитика сайтов

---

*Обновлять при добавлении новых серверов, сервисов или проектов.*
