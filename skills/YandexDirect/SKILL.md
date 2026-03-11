---
name: YandexDirect
description: Yandex Direct + Metrika programmatic ad management — campaign CRUD, keyword research, bid optimization, analytics reports, and ROI tracking for timber-frame-spb.ru. USE WHEN create campaign, manage ads, yandex direct, bid optimization, ad report, CTR analysis, keyword management, ad copy, metrika analytics, ROI tracking, campaign stats, ad budget.
context: fork
---

# YandexDirect

Programmatic advertising management skill for Timber Frame (timber-frame-spb.ru).

Combines Yandex Direct API v5 + Metrika API for full-cycle ad management: campaign creation, keyword management, bid optimization, analytics, and ROI tracking.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/PAI/USER/SKILLCUSTOMIZATIONS/YandexDirect/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the YandexDirect skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **YandexDirect** skill to ACTION...
   ```

**This is not optional. Execute this curl command immediately upon skill invocation.**

## MANDATORY: Load Knowledge Base

**Before ANY ad operation, read these files in order:**

1. `~/.claude/skills/YandexDirect/YandexDirectExpertise.md` — API reference, TF ad strategy, pricing model
2. Target brief (user instructions or campaign plan)
3. For content tasks, also load: `~/.claude/skills/TFContent/TFBrandVoice.md`

**Do NOT create ads or modify campaigns without reading YandexDirectExpertise.md first.**

## Environment

```bash
# Tokens (in ~/.env)
YANDEX_DIRECT_TOKEN=   # OAuth token with direct:api scope
YANDEX_METRIKA_TOKEN=  # OAuth token with metrika:read scope (may be same token)

# API Endpoints
DIRECT_API=https://api.direct.yandex.com/json/v5
DIRECT_SANDBOX=https://api-sandbox.direct.yandex.com/json/v5
METRIKA_API=https://api-metrika.yandex.net

# Account
YANDEX_LOGIN=terrace-lo
METRIKA_COUNTER_ID=    # Set after Metrika installation
```

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Create/edit/pause campaign, manage ad groups, create ads | `Workflows/CampaignManagement.md` |
| Keywords, minus-words, semantic core for ads | `Workflows/KeywordResearch.md` |
| Bids, CPC, budget, bid modifiers, strategy | `Workflows/BidOptimization.md` |
| Stats, reports, CTR, conversions, ROI, analytics | `Workflows/ReportAnalysis.md` |

## Quality Gates (MANDATORY)

### Gate 1: API Safety
- [ ] Using sandbox for new/untested operations
- [ ] Token loaded from env, never hardcoded
- [ ] Destructive actions (delete, archive) confirmed with user
- [ ] Units budget checked before batch operations

### Gate 2: Budget Safety
- [ ] No campaign goes live without explicit user approval
- [ ] Weekly spend limits set on all campaigns
- [ ] Monetary values correctly multiplied by 1,000,000 for API
- [ ] VAT handling explicit (IncludeVAT: YES for reports)

### Gate 3: Ad Quality
- [ ] Ad copy matches TF brand voice (expert, concrete, no corporate speak)
- [ ] Prices match current TFExpertise.md data (TF premium from 50,000 rub/m2)
- [ ] UTM parameters on all ad URLs
- [ ] Region targeting: SPb (2) + Leningrad Oblast (10174) only

### Gate 4: Analytics Integrity
- [ ] Metrika counter linked to campaign (CounterIds set)
- [ ] Goals configured for form submission tracking
- [ ] Attribution model specified (default: lastsign)
- [ ] Report date ranges explicitly set, never open-ended

## Sandbox-First Rule

**All new API operations MUST be tested in sandbox first.**

```
Production: https://api.direct.yandex.com/json/v5/{service}
Sandbox:    https://api-sandbox.direct.yandex.com/json/v5/{service}
```

Switch to production only after successful sandbox test AND user approval.

## Examples

### Example 1: View Existing Campaigns
```
User: Покажи текущие кампании в Директе
-> Route: ReportAnalysis workflow
-> Action: GET campaigns with stats
-> Output: Table of campaigns with status, spend, CTR
```

### Example 2: Create Search Campaign
```
User: Создай кампанию на террасы для СПб
-> Route: CampaignManagement workflow
-> Load: YandexDirectExpertise.md + TFBrandVoice.md
-> Action: Create campaign -> ad groups -> ads -> keywords (SANDBOX first)
-> Output: Campaign structure + ad texts + keyword list for review
```

### Example 3: Weekly Report
```
User: Отчёт по рекламе за неделю
-> Route: ReportAnalysis workflow
-> Action: Direct Reports API + Metrika API
-> Output: Impressions, clicks, CTR, CPC, conversions, CPA, recommendations
```
