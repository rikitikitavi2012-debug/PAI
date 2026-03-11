# Workflow: Campaign Management

> Create, edit, pause, archive campaigns, ad groups, and ads via Yandex Direct API v5.

## Prerequisites
- [ ] YandexDirectExpertise.md loaded
- [ ] YANDEX_DIRECT_TOKEN available in env
- [ ] For ad copy: TFBrandVoice.md loaded

## Step 1: Determine Operation

| User Intent | API Service | Method |
|---|---|---|
| List campaigns | campaigns | get |
| Create campaign | campaigns | add |
| Pause campaign | campaigns | suspend |
| Resume campaign | campaigns | resume |
| Create ad group | adgroups | add |
| Create ad | ads | add + moderate |
| Edit ad text | ads | update |

## Step 2: Build API Request

### Common Headers
```bash
-H "Authorization: Bearer $YANDEX_DIRECT_TOKEN"
-H "Accept-Language: ru"
-H "Client-Login: terrace-lo"
```

### Campaign Creation Checklist
1. Name: descriptive, includes type + region (`TF Террасы СПб — Поиск`)
2. StartDate: future date (never today for review)
3. BiddingStrategy: WB_MAXIMUM_CLICKS with WeeklySpendLimit for new campaigns
4. Network: SERVING_OFF (search only for start)
5. CounterIds: Metrika counter linked
6. NegativeKeywords: mandatory list from expertise base
7. Settings: ADD_METRICA_TAG = YES

### Ad Group Creation Checklist
1. Name: keyword cluster name
2. CampaignId: parent campaign
3. RegionIds: [2, 10174] (SPb + LO)

### Ad Creation Checklist
1. Title: max 56 chars, includes keyword + price/benefit
2. Title2: max 30 chars, location or USP
3. Text: max 81 chars, CTA included
4. Href: with UTM parameters
5. Sitelinks: Калькулятор + Портфолио minimum
6. After creation: call `moderate` method

## Step 3: Execute

**SANDBOX FIRST for any create/update/delete operation.**

```bash
# Sandbox
curl -s "https://api-sandbox.direct.yandex.com/json/v5/campaigns" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -d '{"method": "add", "params": { ... }}'

# Verify in sandbox
curl -s "https://api-sandbox.direct.yandex.com/json/v5/campaigns" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -d '{"method": "get", "params": {"SelectionCriteria": {}, "FieldNames": ["Id","Name","State"]}}'
```

## Step 4: Verify & Report

After execution, always:
1. Confirm operation with GET request
2. Report result to user in table format
3. For new campaigns: show full structure (campaign -> groups -> ads -> keywords)
4. For modifications: show before/after diff

## Safety Rules

- **Never delete campaigns without user confirmation** — use suspend/archive instead
- **Never set StartDate=today** — always future date for review window
- **Always check Units remaining** before batch operations
- **Production operations require explicit "да, в продакшн" from user**
