# Workflow: Report & Analysis

> Pull stats from Direct Reports API + Metrika API, analyze performance, generate actionable insights.

## Prerequisites
- [ ] YandexDirectExpertise.md loaded (target KPIs)
- [ ] YANDEX_DIRECT_TOKEN available
- [ ] METRIKA_COUNTER_ID known

## Step 1: Determine Report Type

| User Request | Direct Report | Metrika Query |
|---|---|---|
| Campaign overview | CAMPAIGN_PERFORMANCE_REPORT | — |
| Ad group performance | ADGROUP_PERFORMANCE_REPORT | — |
| Which ads work best | AD_PERFORMANCE_REPORT | — |
| Keyword performance | CRITERIA_PERFORMANCE_REPORT | — |
| Search queries | SEARCH_QUERY_PERFORMANCE_REPORT | — |
| Site behavior | — | visits, bounceRate, pageviews |
| Conversion funnel | — | goalXXXreaches, conversionRate |
| Full ROI analysis | CAMPAIGN_PERFORMANCE_REPORT | visits + goals by UTMCampaign |

## Step 2: Pull Direct Stats

### Campaign Performance (most common)
```bash
curl -s "$DIRECT_API/reports" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -H "Accept-Language: ru" \
  -H "processingMode: auto" \
  -H "returnMoneyInMicros: false" \
  -H "skipReportHeader: true" \
  -H "skipReportSummary: true" \
  -d '{
    "params": {
      "SelectionCriteria": {
        "DateFrom": "DATE_FROM",
        "DateTo": "DATE_TO"
      },
      "FieldNames": [
        "CampaignName", "Impressions", "Clicks", "Ctr",
        "AvgCpc", "Cost", "Conversions", "CostPerConversion"
      ],
      "ReportName": "TF Weekly Report",
      "ReportType": "CAMPAIGN_PERFORMANCE_REPORT",
      "DateRangeType": "CUSTOM_DATE",
      "Format": "TSV",
      "IncludeVAT": "YES"
    }
  }'
```

### Search Query Report (for negative keyword mining)
```bash
curl -s "$DIRECT_API/reports" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -H "processingMode: auto" \
  -H "returnMoneyInMicros: false" \
  -d '{
    "params": {
      "FieldNames": ["Query", "Impressions", "Clicks", "Ctr", "Cost"],
      "ReportName": "Search Queries",
      "ReportType": "SEARCH_QUERY_PERFORMANCE_REPORT",
      "DateRangeType": "LAST_7_DAYS",
      "Format": "TSV"
    }
  }'
```

## Step 3: Pull Metrika Stats

### Traffic by Source
```bash
curl -s "$METRIKA_API/stat/v1/data?id=COUNTER_ID\
&metrics=ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:avgVisitDurationSeconds\
&dimensions=ym:s:trafficSource\
&date1=DATE_FROM&date2=DATE_TO" \
  -H "Authorization: OAuth $YANDEX_METRIKA_TOKEN"
```

### Conversions by Campaign (UTM)
```bash
curl -s "$METRIKA_API/stat/v1/data?id=COUNTER_ID\
&metrics=ym:s:visits,ym:s:goalXXXreaches,ym:s:goalXXXconversionRate\
&dimensions=ym:s:UTMCampaign\
&date1=DATE_FROM&date2=DATE_TO\
&filters=ym:s:UTMSource=='yandex'\
&attribution=lastsign" \
  -H "Authorization: OAuth $YANDEX_METRIKA_TOKEN"
```

## Step 4: Analyze & Generate Insights

### KPI Dashboard Format
```
=== TF Direct Report: DD.MM — DD.MM ===

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Impressions | X | — | — |
| Clicks | X | — | — |
| CTR | X% | > 5% | OK/WARN |
| Avg CPC | X ₽ | < 150 ₽ | OK/WARN |
| Cost | X ₽ | < budget | OK/WARN |
| Conversions | X | — | — |
| CPA | X ₽ | < 3,000 ₽ | OK/WARN |
| Conv. Rate | X% | > 3% | OK/WARN |
```

### Mandatory Analysis Points
1. **Top/Bottom performers:** Best and worst keywords by CPA
2. **Budget efficiency:** % of budget spent on converting keywords
3. **Search query mining:** New negatives + new keyword ideas
4. **Trend:** Week-over-week or month-over-month changes
5. **Recommendations:** 3-5 specific action items

### Recommendation Categories
- **Quick wins:** Bid adjustments, negative keywords (do now)
- **Ad copy:** New variants to test, underperforming ads to pause
- **Structure:** New ad groups, campaign restructuring
- **Budget:** Reallocation between campaigns/groups

## Step 5: Output Report

Always include:
1. Summary table (KPI dashboard)
2. Top 5 and Bottom 5 (keywords or ads)
3. Actionable recommendations with priority
4. Comparison to previous period if data available

For weekly reports, batch findings:
```
Отчёт за неделю DD.MM — DD.MM:
[KPI table]
[Top/Bottom performers]
[Recommendations: 1) ... 2) ... 3) ...]
Попутно заметил: [any side observations]
```
