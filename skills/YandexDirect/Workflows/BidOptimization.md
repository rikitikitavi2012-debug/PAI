# Workflow: Bid Optimization

> Manage bids, budgets, bid modifiers, and bidding strategies.

## Prerequisites
- [ ] YandexDirectExpertise.md loaded (budget guidelines, seasonal adjustments)
- [ ] YANDEX_DIRECT_TOKEN available
- [ ] Current campaign performance data (from ReportAnalysis)

## Money Format Reminder

**All monetary values in API = rubles * 1,000,000**
- 50 rub = `50000000`
- 150 rub = `150000000`
- Weekly budget 7,000 rub = `7000000000`

## Step 1: Assess Current State

Before any bid changes:
1. Pull current bids: `bids.get`
2. Pull keyword performance: CRITERIA_PERFORMANCE_REPORT
3. Calculate current CPC, CTR, CPA per keyword

## Step 2: Choose Strategy

### For New Campaigns
```json
{
  "Search": {
    "BiddingStrategyType": "WB_MAXIMUM_CLICKS",
    "WbMaximumClicks": {
      "WeeklySpendLimit": 7000000000
    }
  },
  "Network": {"BiddingStrategyType": "SERVING_OFF"}
}
```

### After 50+ Conversions
```json
{
  "Search": {
    "BiddingStrategyType": "WB_MAXIMUM_CONVERSIONS",
    "WbMaximumConversions": {
      "WeeklySpendLimit": 14000000000,
      "GoalId": METRIKA_GOAL_ID
    }
  }
}
```

## Step 3: Bid Adjustments

### Manual Bid Setting
```bash
curl -s "$DIRECT_API/bids" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -d '{
    "method": "set",
    "params": {
      "Bids": [
        {"KeywordId": 111, "Bid": 120000000}
      ]
    }
  }'
```

### Bid Modifiers

**Device adjustments:**
```bash
# Mobile -20% (most TF customers research on desktop)
curl -s "$DIRECT_API/bidmodifiers" \
  -H "Authorization: Bearer $YANDEX_DIRECT_TOKEN" \
  -d '{
    "method": "add",
    "params": {
      "BidModifiers": [{
        "CampaignId": CAMPAIGN_ID,
        "MobileAdjustment": {"BidModifier": 80}
      }]
    }
  }'
```

**Seasonal adjustments (apply monthly):**
| Month | BidModifier | API Value |
|---|---|---|
| Jan-Feb | -30% | 70 |
| Mar | 0% | 100 |
| Apr-May | +30% | 130 |
| Jun-Aug | +20% | 120 |
| Sep-Oct | +10% | 110 |
| Nov-Dec | -20% | 80 |

## Step 4: Optimization Rules

### Raise bids when:
- CTR > 8% AND position > 3 (good ad, low visibility)
- CPA < target AND budget not exhausted
- High-converting keyword being outbid

### Lower bids when:
- CTR < 2% after 100+ impressions
- CPA > 2x target
- Bounce rate > 60% for keyword

### Pause keyword when:
- 200+ impressions, 0 conversions, CPA > 3x target
- Consistently < 1% CTR (likely wrong intent)

## Step 5: Verify & Report

Output bid changes as:
```
| Keyword | Old Bid | New Bid | Reason |
|---------|---------|---------|--------|
| терраса из бруса | 100 ₽ | 130 ₽ | High CTR 9.2%, position 4 |
```

Always show budget impact: estimated weekly spend change.
