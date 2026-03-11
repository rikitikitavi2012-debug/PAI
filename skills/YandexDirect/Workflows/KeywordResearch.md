# Workflow: Keyword Research

> Keyword management for Yandex Direct campaigns — add, optimize, negative keywords.

## Prerequisites
- [ ] YandexDirectExpertise.md loaded (keyword clusters + negatives)
- [ ] YANDEX_DIRECT_TOKEN available
- [ ] SEO_SEMANTIC_CORE.md consulted for baseline keywords

## Step 1: Source Keywords

### From Existing Data
1. `docs/research/SEO_SEMANTIC_CORE.md` — 55 keywords, 7 clusters
2. Previous campaign data (if available via Reports API)
3. Yandex Wordstat (when API approved)

### From Competitor Analysis
- Search query reports from existing campaigns
- Manual research via Wordstat web interface

## Step 2: Organize into Ad Groups

**Rule: 1 ad group = 1 tight keyword cluster (5-15 keywords)**

```
AdGroup: "Террасы из бруса"
├── терраса из бруса спб
├── терраса из бруса цена
├── терраса из бруса под ключ
├── деревянная терраса из бруса
└── терраса из клеёного бруса
```

### Match Types (Yandex syntax)
| Syntax | Type | Example |
|---|---|---|
| keyword | Broad | терраса спб (includes word forms) |
| "keyword" | Phrase | "терраса спб" (exact phrase, any word form) |
| !keyword | Fixed form | !терраса !спб (exact word form) |

**Recommendation:** Start with broad, refine with negatives. Move to phrase match for expensive high-volume keywords.

## Step 3: Apply Negative Keywords

### Mandatory Negatives (always apply at campaign level)
```
Campaign NegativeKeywords:
бесплатно, своими руками, чертёж, скачать, видео, урок,
квартира, балкон, многоэтажный, ремонт, бытовка,
москва, краснодар, сочи, ростов, новосибирск, екатеринбург,
пластик, пвх, алюминий, металл, поликарбонат
```

### Dynamic Negatives (from search query reports)
After 1-2 weeks of running, pull SEARCH_QUERY_PERFORMANCE_REPORT:
1. Find queries with impressions but 0 clicks (irrelevant)
2. Find queries with clicks but high bounce rate (wrong intent)
3. Add as negatives

## Step 4: API Operations

### Add Keywords
```bash
curl -s "$DIRECT_API/keywords" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -d '{
    "method": "add",
    "params": {
      "Keywords": [
        {"AdGroupId": GROUP_ID, "Keyword": "терраса из бруса спб"},
        {"AdGroupId": GROUP_ID, "Keyword": "деревянная терраса цена спб"}
      ]
    }
  }'
```

### Get Keyword Stats
```bash
curl -s "$DIRECT_API/keywords" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -d '{
    "method": "get",
    "params": {
      "SelectionCriteria": {"AdGroupIds": [GROUP_ID]},
      "FieldNames": ["Id","Keyword","Bid","State","Status","StatisticsSearchVolume"]
    }
  }'
```

## Step 5: Verify & Report

Output format:
```
| Keyword | Match | Volume | CPC est. | Ad Group |
|---------|-------|--------|----------|----------|
| терраса из бруса спб | broad | 720 | ~120 ₽ | Террасы |
```

After adding: confirm with GET, show added count and any warnings.
