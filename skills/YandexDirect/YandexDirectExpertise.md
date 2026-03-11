# Yandex Direct + Metrika — Expertise Base

> API reference, TF advertising strategy, competitive landscape.
> Full API research: `docs/research/YANDEX_API_DIRECT_METRIKA.md`

---

## 1. API Quick Reference

### Authentication
All requests require OAuth token in header:
```
Authorization: Bearer {YANDEX_DIRECT_TOKEN}
Accept-Language: ru
```

### Base URLs
| Environment | URL |
|---|---|
| Production | `https://api.direct.yandex.com/json/v5/{service}` |
| Sandbox | `https://api-sandbox.direct.yandex.com/json/v5/{service}` |
| Metrika | `https://api-metrika.yandex.net` |

### Services & Methods
| Service | Key Methods |
|---|---|
| campaigns | get, add, update, delete, suspend, resume, archive |
| adgroups | get, add, update, delete |
| ads | get, add, update, delete, suspend, resume, moderate |
| keywords | get, add, update, delete, suspend, resume |
| bids | get, set, setAuto |
| bidmodifiers | get, add, delete, set, toggle |
| reports | POST (TSQL-like query) |

### Money Format
All monetary values = integer * 1,000,000.
- 50 rub = `50000000`
- 1,500 rub = `1500000000`
- Weekly budget 10,000 rub = `10000000000`

### Rate Limits (Units)
- Max 5 concurrent requests
- Daily limit split into 24 hourly windows
- Monitor via `Units` response header: `{spent}/{remaining}/{daily_limit}`
- Error 152 = out of units, wait for next hour

---

## 2. TF Campaign Architecture

### Account Structure
```
terrace-lo (account)
├── [Search] TF Террасы — Брендовые
│   └── AdGroup: "Timber Frame"
│       Keywords: timber frame спб, тимбер фрейм терраса, ...
│
├── [Search] TF Террасы — Общие запросы
│   ├── AdGroup: "Террасы СПб"
│   │   Keywords: терраса из бруса спб, деревянная терраса, ...
│   ├── AdGroup: "Веранды СПб"
│   │   Keywords: веранда из бруса, остеклённая веранда, ...
│   └── AdGroup: "Навесы/Перголы"
│       Keywords: навес из бруса, пергола деревянная, ...
│
├── [Search] TF Террасы — Конкуренты
│   └── AdGroup: "vs конкуренты"
│       Keywords: террасы спб цены, строительство террас спб, ...
│
└── [Search] TF Террасы — Ремаркетинг
    └── AdGroup: "Посетители сайта"
        Audience: visitors who didn't convert
```

### Target Regions
| RegionId | Region | Priority |
|---|---|---|
| 2 | Санкт-Петербург | Primary |
| 10174 | Ленинградская область | Primary |

### Persona → Campaign Mapping
| Persona | Campaign Focus | Budget Share |
|---|---|---|
| Андрей (premium) | Брендовые + "элитный", "премиум" | 40% |
| Елена (standard-premium) | Общие + "веранда", "терраса под ключ" | 40% |
| Сергей (economy-standard) | Общие + "цена", "недорого" | 20% |

---

## 3. Ad Copy Templates

### Title Rules (Yandex Direct)
- Title: max 56 chars (including spaces)
- Title2: max 30 chars
- Text: max 81 chars
- Display URL: max 20 chars

### Proven Ad Templates for TF

**Template A: Price + Benefit**
```
Title:  Террасы из бруса — от 50 000 ₽/м²
Title2: Проект + 3D бесплатно
Text:   Timber Frame каркас. Монтаж за 14 дней. СПб и ЛО. Рассчитайте стоимость онлайн!
```

**Template B: Technology + Trust**
```
Title:  Timber Frame террасы — технология 500 лет
Title2: СПб и Ленобласть
Text:   Клеёный брус, видимый каркас, без усадки. Гарантия 10 лет. Звоните!
```

**Template C: Problem-Solution**
```
Title:  Терраса к дому? Timber Frame — лучший выбор
Title2: Расчёт за 2 минуты
Text:   Онлайн-калькулятор + AI-подбор материалов. Бесплатный выезд замерщика в СПб.
```

### UTM Template
```
?utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_name}&utm_content={ad_id}&utm_term={keyword}
```

Dynamic substitution params: `{campaign_name}`, `{campaign_id}`, `{ad_id}`, `{keyword}`, `{source}`

### Sitelinks (always include)
| Title | URL |
|---|---|
| Калькулятор | /kalkulyator |
| Портфолио | /terrasy/timber-frame |
| Технология | /tekhnologiya |
| Блог | /blog |

---

## 4. Keyword Strategy

### Core Keyword Clusters
Source: `docs/research/SEO_SEMANTIC_CORE.md` (55 keywords, 7 clusters)

| Cluster | Example Keywords | Monthly Volume | CPC Estimate |
|---|---|---|---|
| Branded TF | timber frame спб, тимбер фрейм | 50-200 | 30-60 ₽ |
| Terraces | терраса из бруса спб, деревянная терраса | 500-2000 | 80-150 ₽ |
| Verandas | веранда к дому, остеклённая веранда спб | 300-1000 | 70-120 ₽ |
| Pergolas | пергола деревянная, навес из бруса | 200-500 | 40-80 ₽ |
| Price | терраса цена спб, стоимость веранды | 300-800 | 100-200 ₽ |
| Construction | строительство террасы, терраса под ключ | 400-1500 | 90-180 ₽ |
| Materials | клеёный брус для террасы, лиственница терраса | 100-300 | 50-90 ₽ |

### Negative Keywords (mandatory)
```
-бесплатно -своими руками -чертёж -скачать -видео -урок
-квартира -балкон -многоэтажный -ремонт -бытовка
-москва -краснодар -сочи -ростов (non-SPb cities)
-пластик -пвх -алюминий -металл (non-wood materials)
```

---

## 5. Budget & Bidding Guidelines

### Recommended Starting Budget
| Period | Daily | Weekly | Monthly |
|---|---|---|---|
| Test (2 weeks) | 500 ₽ | 3,500 ₽ | — |
| Ramp-up (month 1) | 1,000 ₽ | 7,000 ₽ | 30,000 ₽ |
| Stable (month 2+) | 1,500-3,000 ₽ | 10,000-21,000 ₽ | 45,000-90,000 ₽ |

### Bidding Strategy
- **Start:** WB_MAXIMUM_CLICKS with weekly limit (learn phase)
- **After 50 conversions:** Switch to WB_MAXIMUM_CONVERSIONS (CPA target)
- **Target CPA:** 1,500-3,000 ₽ per lead (premium segment)
- **Network:** SERVING_OFF (search only, no YAN for start)

### Seasonal Adjustments (construction niche)
| Month | Modifier | Rationale |
|---|---|---|
| Jan-Feb | -30% | Low season, planning phase |
| Mar | +0% | Season start, early birds |
| Apr-May | +30% | Peak demand |
| Jun-Aug | +20% | Active construction |
| Sep-Oct | +10% | Late season deals |
| Nov-Dec | -20% | Off season |

---

## 6. Metrika Integration

### Counter Setup
```javascript
ym(COUNTER_ID, "init", {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true
});
```

### Goals to Configure
| Goal | Type | Trigger |
|---|---|---|
| Form Submission | action | `submit_contact_form` |
| Calculator Used | action | `calculator_result` |
| Phone Click | action | `phone_click` |
| Blog Read (3+ min) | engagement | `time_on_page > 180` |

### Key Metrics to Track
| Metric | API Field | Target |
|---|---|---|
| CTR | Ctr | > 5% (search) |
| CPC | AvgCpc | < 150 ₽ |
| Bounce Rate | bounceRate | < 40% |
| Conversion Rate | ConversionRate | > 3% |
| CPA | CostPerConversion | < 3,000 ₽ |

### Attribution
Default: `lastsign` (last significant click, ignores direct visits).
For analysis: compare with `first` to evaluate acquisition channels.

---

## 7. Competitive Landscape (SPb)

### Direct Competitors (Yandex Search)
- Generic builders advertising "terraces" — not TF-specific
- Low-quality sites, no 3D visualization, no online calculator
- **Our advantages:** TF expertise, 3D SketchUp, online calculator, blog content

### Competitive Ad Strategy
- Highlight unique: "Timber Frame", "3D-визуализация", "онлайн-калькулятор"
- Price anchoring: "от 50 000 ₽/м²" (premium positioning, filters price shoppers)
- Trust signals: "технология 500 лет", "гарантия 10 лет", "клеёный брус"
