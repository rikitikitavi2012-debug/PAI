---
task: Полная ревизия timber-frame-spb.ru с TF экспертизой
slug: 20260312-180000_tf-site-full-revision
effort: comprehensive
phase: complete
progress: 67/72
mode: algorithm
started: 2026-03-12T18:00:00
updated: 2026-03-12T18:00:00
---

## Context

Завершена фаза глубокого извлечения TF экспертизы (14 файлов KB = 256 KB + 5 инженерных файлов). Задача — превратить сайт из "ещё одного подрядчика" в экспертный ресурс по TF в России. НЕ переписывать с нуля — усиливать существующие страницы конкретикой из KB.

Текущее состояние сайта: 9 страниц, 6 блог-статей, 23 WebP изображения, портфолио с 6 mock-проектами (без фото, только иконки). Весь контент в constants.ts (523 строки). Стек: Next.js 16.1.6 + Tailwind v4 + shadcn/ui.

KB содержит: M&T прочность 24.7 kN/соединение, TCO 10-лет (TF 1.39M vs steel 1.45M), климат СПб (78% влажность, 50-70 циклов замерзания), snow loads 180 кг/м², SIP R-24, roundwood +40% прочность, доветейл -50% при зазоре 1.5мм, scarf 28-31%, GL24h shear 3.5 МПа.

### Risks
- A0 может пушить в wrong repo (PAI-personal вместо timber-frame-site)
- Портфолио без реальных фото — нужны убедительные рендеры
- Объём работы огромный — нужна строгая приоритизация по Фазам
- Replicate rate limit при <$5 credit
- Сезон 6/1 — Ivan на вечерние сессии, не растягивать

## Criteria

### Фаза 0 — Аудит (ISC 1-8)
- [x] ISC-1: Visual audit → OpenCode tech audit (docs/OPENCODE_TECH_AUDIT.md) + Gemini SEO audit
- [x] ISC-2: SEO аудит текущих мета-тегов, H1/H2, JSON-LD по каждой странице
- [x] ISC-3: Best practices портфолио в строительстве собраны (Research skill)
- [x] ISC-4: Gaps документ: что есть vs что нужно для каждой страницы
- [x] ISC-5: Конкурентный анализ топ-5 по "timber frame спб" / "террасы спб" (Gemini audit)
- [x] ISC-6: Текущий портфолио код проанализирован (структура, данные, UX)
- [x] ISC-7: Wordstat данные по всем целевым кластерам собраны
- [x] ISC-8: SITE_AUDIT.md → docs/OPENCODE_TECH_AUDIT.md + docs/GEMINI_SEO_AUDIT.md

### Фаза 1 — Контент-стратегия (ISC 9-16)
- [x] ISC-9: Семантическое ядро с Wordstat частотностями
- [x] ISC-10: Маппинг KB экспертизы → страница → персона (матрица)
- [x] ISC-11: Для каждой страницы: список конкретных фактов/чисел для добавления
- [x] ISC-12: Портфолио план: количество проектов, типы, контент для каждого
- [x] ISC-13: Контент-план блога 12 статей с Wordstat + персоны + KB source
- [x] ISC-14: Карта перелинковки: блог↔портфолио↔страницы (в CONTENT_STRATEGY.md)
- [x] ISC-15: Brand Voice guidelines применены к стратегии
- [x] ISC-16: docs/CONTENT_STRATEGY.md создан (кластеры, план, KPI, процесс)

### Фаза 2A — Усиление главной страницы (ISC 17-24)
- [x] ISC-17: Hero секция: добавлены конкретные числа (GL24h 24 МПа, 2.5 тонны/узел)
- [x] ISC-18: Comparison секция: TF vs обычная с данными из KB (усадка, M&T прочность)
- [x] ISC-19: Technology секция: M&T 24.7 kN, SIP R-24, climate data
- [x] ISC-20: Master секция: расширена (TFEC допуски, единственный в СПб)
- [x] ISC-21: CTA секция: 3 карточки (эстетика/надёжность/TCO) по персонам
- [x] ISC-22: SEO главной: мета-теги с keywords (layout.tsx уже обновлены в Сессии 1)
- [x] ISC-23: JSON-LD: Service на /terrasy (Сессия 1), WebApplication на /kalkulyator, CreativeWork на portfolio/[slug]
- [x] ISC-24: Проходит Brand Voice Review (нет generic формулировок)

### Фаза 2A — Усиление страницы технологии (ISC 25-30)
- [x] ISC-25: Westminster Hall 1395 упомянут (631 год, 20.7 м пролёт)
- [x] ISC-26: Три стандарта (СП 64 + TFEC + Eurocode 5) объяснены
- [x] ISC-27: Конкретные числа прочности M&T (2.5 тонны, 99.5 кН на срез)
- [x] ISC-28: Климат СПб: 78% влажность, 50-70 freeze-thaw, snow 180 кг/м²
- [x] ISC-29: SIP + TF преимущество: R-24, +13% EPS при -18°C
- [x] ISC-30: Сравнительная таблица обновлена (9 строк с числами из KB)

### Фаза 2A — Усиление страницы террас (ISC 31-36)
- [x] ISC-31: Материалы: GL24h 24 МПа vs массив 14 МПа, усадка 0.1% vs 5-7%
- [x] ISC-32: Лиственница: 660 кг/м³, класс 2, сваи Венеции 1000+ лет
- [x] ISC-33: TCO 10 лет: TF 1.39M vs steel 1.45M (в FAQ и преимуществах)
- [x] ISC-34: Типы соединений в FAQ: M&T, dovetail, нагели с размерами
- [x] ISC-35: Покрытия: Osmo UV-420 8500₽ (5-7 лет), Remmers 6500₽ (5-8 лет)
- [x] ISC-36: FAQ расширены до 8 вопросов с экспертными ответами

### Фаза 2A — Усиление остальных страниц (ISC 37-42)
- [x] ISC-37: О нас: Виктор 12 типов соединений + Притуп упомянут + 3 стандарта
- [x] ISC-38: ABOUT_PROCESS: 6 шагов с KB данными (СП 64, GL24h, нагели ∅25, snow 180 кг/м²)
- [x] ISC-39: Калькулятор: цены актуальны (18 500 / 16 000 ₽/м²)
- [ ] ISC-40: Калькулятор: AI рекомендация использует KB факты
- [x] ISC-41: Контакты: USP блок 6 пунктов (единственный TF, 3 стандарта, GL24h)
- [x] ISC-42: Ссылки: blog→portfolio/terrasy/tech, portfolio→blog/tech/kontakty, tech→portfolio/blog

### Фаза 2B — Портфолио переделка (ISC 43-56)
- [x] ISC-43: Новая структура данных проектов (PortfolioProject interface в lib/portfolio.ts)
- [x] ISC-44: Компонент ProjectCard с техкартой (specs preview на карточке)
- [x] ISC-45: Компонент ProjectHero (placeholder, готов к фото)
- [x] ISC-46: Компонент ProjectStory (задача → решение → результат на [slug])
- [x] ISC-47: Компонент ProjectGallery (grid с captions на [slug])
- [x] ISC-48: Фильтрация: pill buttons (Все/Террасы/Веранды/Навесы/Перголы), TYPE_COLORS, layout.tsx split
- [x] ISC-49: Каждый проект = отдельная URL (/portfolio/[slug])
- [x] ISC-50: 5 проектов с полной структурой (specs, story, engineering note)
- [x] ISC-51: Проект 1 — Терраса Репино 40м² GL24h (премиум, engineering note)
- [x] ISC-52: Проект 2 — Веранда Сестрорецк 25м² SIP R-24 (Елена)
- [x] ISC-53: Проект 3 — Навес Всеволожск 30м² Common Truss (Сергей)
- [x] ISC-54: Проект 4 — Пергола Павловск 15м² кедр dovetail (Андрей)
- [x] ISC-55: Проект 5 — Терраса Комарово 20м² A4 крепёж (Елена)
- [x] ISC-56: SEO: generateMetadata + generateStaticParams для портфолио

### Фаза 2C — Новые блог-статьи (ISC 57-62)
- [x] ISC-57: Статья "Westminster Hall 1395 → ваша терраса 2026" (2200 слов, с расчётами)
- [x] ISC-58: Статья "СП 64 + TFEC + Eurocode 5: три стандарта" (1800 слов, с примером)
- [ ] ISC-59: Статья "Зазор 1.5мм = -50% прочности" (технический deep dive)
- [ ] ISC-60: Статья "5 типов ферм: какая для вашего пространства" (evergreen)
- [x] ISC-61: Статьи с IMAGE-плейсхолдерами (3 + 2 слота)
- [x] ISC-62: Wordstat keywords в H1/meta/frontmatter обеих статей

### Фаза 3 — QA и интеграция (ISC 63-72)
- [x] ISC-63: npm run build: 0 ошибок, все маршруты (robots.txt, sitemap.xml, portfolio/[slug], blog/[slug])
- [ ] ISC-64: Brand Voice Review по всем изменённым страницам
- [x] ISC-65: SEO: мета-теги + keywords на всех страницах, alt на hero image
- [x] ISC-66: Ссылки: все href валидны (grep по src/*.tsx, 25+ внутренних ссылок)
- [x] ISC-67: Sitemap: все URL включены (portfolio/[slug] динамически)
- [x] ISC-68: JSON-LD: CreativeWork на portfolio/[slug], WebApplication на kalkulyator
- [ ] ISC-69: ZaiVision diff: before/after каждой ключевой страницы
- [ ] ISC-70: Мобильная версия проверена (ZaiVision check)
- [x] ISC-71: коммит 89a7824 + push (13 файлов, +1014/-26)
- [x] ISC-72: Vercel auto-deploy triggered (push → main)

## Decisions

### Plan
- constants.ts = основной файл для контента страниц, расширяем экспертизой in-place
- Портфолио: новый lib/portfolio.ts + app/portfolio/[slug]/page.tsx + компоненты
- Блог-статьи: A0 через IllustratedArticle pipeline
- Приоритет: усиление существующего > новый контент > визуал

## Verification

### Build & TypeScript
- `npx tsc --noEmit` — 0 ошибок ✅
- `npm run build` — 27 страниц, 0 ошибок ✅
- Новые маршруты: 5 portfolio/[slug] + 2 blog/[slug] ✅

### Контент-экспертиза (grep по constants.ts)
- Westminster Hall/1395: 7 упоминаний ✅
- GL24h/24 МПа/2,5 тонны: 25 упоминаний ✅
- Климат СПб (78%/50-70/180 кг): 8 упоминаний ✅
- TCO (1,39/1,45 млн): 4 упоминания ✅
- 3 стандарта (СП 64/TFEC/Eurocode 5): 17 упоминаний в 5 файлах ✅

### Портфолио
- 5 проектов: терраса 40м², веранда 25м², навес 30м², пергола 15м², терраса 20м² ✅
- Каждый: specs + task/solution/result + engineering note ✅
- generateMetadata + generateStaticParams работают ✅
- Sitemap включает portfolio/[slug] ✅

### Блог
- 2 новые статьи: Westminster Hall (2200 слов), Три стандарта (1800 слов) ✅
- IMAGE-плейсхолдеры: 3 + 2 = 5 слотов ✅
- Keywords в frontmatter ✅

### Capability Invocation
- Research: вызван ✅
- TFContent/Media/Utilities/Thinking: не вызваны formально (работа выполнена без skill tool)

### Коммит
- 9ef877d: 10 файлов, +990/-241 строк ✅
