# API Keys Audit — 2026-03-05

All keys stored in `~/.config/PAI/.env`.

## Summary Table

| # | Service | Key Prefix | Status | Billing Model | Monthly Cost | Balance/Usage Endpoint |
|---|---------|------------|--------|---------------|--------------|----------------------|
| 0 | Anthropic | `sk-ant-api03-...` | ACTIVE ($1.51 spent) | Pay-per-use (prepaid) | ~$0.19/day | platform.claude.com → Cost (web) |
| 1 | OpenAI | `sk-proj-...` | ACTIVE (125 models) | Pay-per-use (prepaid credits) | Variable | `GET /v1/organization/usage/{type}` (needs `api.usage.read` scope) |
| 2 | Apify | `apify_api_...` | ACTIVE (FREE plan) | Free $5/mo credits, then pay-per-use | $0 | `GET /v2/users/me/usage/monthly?token=TOKEN` |
| 3 | Bright Data | `8cb81f0a-...` | BROKEN (lacks permissions) | Pay-per-use (GB/requests) | Unknown | `GET /customer/balance` (needs Finance/Admin permission) |
| 4 | Exa | `e1733f49-...` | ACTIVE (search works) | Free 1K req/mo, then pay-per-use | $0 | `GET https://admin-api.exa.ai/team-management/api-keys/{id}/usage` |
| 5 | Ref.tools | `ref-f0299e...` | ACTIVE (MCP server) | Free 200 credits (no expiry) | $0 | No programmatic endpoint (web dashboard) |
| 6 | Replicate | `r8_U9htVwE...` | ACTIVE (8+ predictions) | Pay-per-use (per-second GPU) | Variable | No billing API (web dashboard only) |

---

## Detailed Findings

### 0. Anthropic (`ANTHROPIC_API_KEY`)

- **What it does**: Claude API (Sonnet, Opus, Haiku). Used by PAI Inference.ts for standard/smart calls.
- **Account**: John's Individual Org (riki.tiki.tavi.2012@gmail.com)
- **Key name**: "Navi" (`sk-ant-api03-J3b...gQAA`), workspace Default
- **Billing**: Pay-per-use (prepaid credits). $1.51 spent since Feb 25, 2026.
- **Key status**: ACTIVE — last used Mar 5, 2026.
- **Usage tracking**: https://platform.claude.com → ANALYTICS → Usage / Cost (web dashboard, no special Admin key needed)
- **A0 note**: A0 currently uses Z.AI (GLM-5, Coding Plan) + OpenCode Zen (Kimi 2.5). NOT using this key. If A0 switches to Anthropic provider — costs will appear in same Cost dashboard.
- **Claude Code**: Uses Max subscription ($100/mo), NOT this API key. Separate billing.

### 1. OpenAI (`OPENAI_API_KEY`)

- **What it does**: LLM API (GPT-4o, DALL-E, Whisper, embeddings, etc.). 125 models available.
- **Account type**: Project-scoped key (`sk-proj-` prefix). Organization-level.
- **Billing**: Prepaid credits. Pay-per-use based on tokens consumed.
- **Key status**: ACTIVE — models list returns 125 entries.
- **Usage endpoint**: `GET https://api.openai.com/v1/organization/usage/completions?start_time=UNIX_TS`
  - **BLOCKED**: Current key lacks `api.usage.read` scope. Need to regenerate key with this permission at platform.openai.com.
  - Legacy `/v1/dashboard/billing/*` endpoints require session keys (browser only), no longer work with API keys.
- **Action needed**: Regenerate API key with `api.usage.read` scope, or check usage via web dashboard at https://platform.openai.com/usage
- **A0 note**: Can be used as A0 provider — costs tracked at platform.openai.com/usage

### 2. Apify (`APIFY_TOKEN`)

- **What it does**: Web scraping platform. Run actors (scrapers), store datasets, schedule tasks.
- **Account**: Ivan Skripkin (riki.tiki.tavi.2012@gmail.com), username: miraculous_laugh
- **Billing**: FREE plan — $5/month in usage credits included. Pay-as-you-go beyond that.
- **Key status**: ACTIVE — user info and usage data returned successfully.
- **Usage endpoint**: `GET https://api.apify.com/v2/users/me/usage/monthly?token=APIFY_TOKEN`
  - Returns detailed breakdown: storage, data transfer, actor compute units
  - Current cycle: 2026-02-22 to 2026-03-21, usage near $0 (minimal storage only)
- **User info**: `GET https://api.apify.com/v2/users/me?token=APIFY_TOKEN`
- **Note**: Token works fine. Previous "null" result was likely a network/sourcing issue, not token expiry.

### 3. Bright Data (`BRIGHTDATA_API_KEY`)

- **What it does**: Proxy network and web scraping infrastructure. Residential/datacenter proxies, SERP API, Web Unlocker.
- **Billing**: Pay-per-use based on data volume (GB) and request count. Various products with different pricing.
- **Key status**: BROKEN — "Your API key lacks the required permissions for this action"
- **Balance endpoint**: `GET https://api.brightdata.com/customer/balance` with `Authorization: Bearer TOKEN`
  - Returns `{balance, pending_balance}` — but needs Finance or Admin permission.
- **Problem**: Current token has insufficient permissions (likely Ops or User level).
- **5 permission levels**: Admin (full), Finance (billing only), Ops (zone config), Limit (passwords/IPs), User (API usage only)
- **Action needed**: Log into https://brightdata.com/cp/setting/users, create new API token with Admin or Finance permissions. Old tokens cannot be modified — must create new one.

### 4. Exa (`EXA_API_KEY`)

- **What it does**: AI-powered semantic web search. Neural search, content retrieval, find-similar, answer generation.
- **Billing**: Free tier = 1,000 requests/month. Then pay-per-use:
  - Search: $7/1K requests (1-10 results), +$1 per extra result
  - Contents: $1/1K pages
  - Answer: $5/1K answers
  - Agentic Search: $12/1K requests
- **Key status**: ACTIVE — search query succeeded.
- **Usage endpoint**: `GET https://admin-api.exa.ai/team-management/api-keys/{id}/usage`
  - Accepts `start_date`, `end_date` params (ISO 8601, up to 100 days back)
  - Returns `total_cost_usd` and `cost_breakdown`
  - **BLOCKED**: Returns "Unauthorized" — this is the admin API, may need a separate admin token or team setup.
- **Action needed**: Check https://dashboard.exa.ai for usage. Admin API may require team admin credentials.

### 5. Ref.tools (`REF_API_KEY`)

- **What it does**: Documentation search MCP server for coding agents. Provides curated technical docs, web search fallback, URL-to-markdown conversion.
- **Billing**: Credit-based system.
  - Free: 200 starter credits (never expire)
  - Basic: $9/month for 1,000 monthly credits
  - Extra credits: $9 per 1,000
- **Key status**: ACTIVE — configured as MCP server in Claude Code settings.json
- **Usage tracking**: No programmatic API endpoint found. Manage at https://ref.tools/account
- **Auth methods**: `x-ref-api-key` header, `?apiKey=` query param, or OAuth
- **MCP endpoint**: `https://api.ref.tools/mcp` (streamable HTTP, recommended)
- **Note**: For typical dev use, 200 free credits is sufficient. "Most developers won't use 1000/month."

### 6. Replicate (`REPLICATE_API_TOKEN`)

- **What it does**: Run open-source ML models via API. Image generation, LLMs, audio, video. Pay per second of GPU time.
- **Account**: rikitikitavi2012-debug (linked to GitHub)
- **Billing**: Pay-per-use. Billed per second of compute time on selected hardware (CPU, A100, H100, L40S, etc.)
- **Key status**: ACTIVE — account info and predictions returned. 8+ predictions in history.
- **Usage tracking**: No programmatic billing API endpoint exists.
  - Account info: `GET https://api.replicate.com/v1/account` with `Authorization: Token TOKEN`
  - Predictions history: `GET https://api.replicate.com/v1/predictions` (paginated)
  - Rate limits: 600 predictions/min, 3000 other requests/min
- **Action needed**: Check billing at https://replicate.com/account/billing (web only)

---

## Action Items

1. **Anthropic**: ✅ No action needed — $1.51 spent, tracking via platform.claude.com → Cost. No Admin key required
2. **OpenAI**: Regenerate API key at platform.openai.com with `api.usage.read` scope to enable programmatic usage tracking
3. **Bright Data**: Create new API token at brightdata.com/cp/setting/users with Admin or Finance permissions
4. **Exa**: Check if admin API requires separate credentials; use web dashboard for now
5. **Monitor costs**: OpenAI and Replicate are pay-per-use with no caps — set up alerts

## A0 Provider Strategy

A0 can switch between providers. All costs tracked by the provider's dashboard:
- **Current**: Z.AI GLM-5 (Coding Plan, $0 extra) + OpenCode Zen Kimi 2.5 ($0 extra)
- **Anthropic**: platform.claude.com → Cost (same key as PAI Inference)
- **OpenRouter**: openrouter.ai/activity ($3.22 remaining)
- **OpenAI**: platform.openai.com/usage (needs api.usage.read scope for programmatic)
- **Benefit**: Switching A0 to any provider = costs automatically tracked in that provider's dashboard

## Programmatic Health Check Script

```bash
# Quick status check for all API keys
source ~/.config/PAI/.env

# OpenAI — test model access
curl -s https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'OpenAI: {len(d.get(\"data\",[]))} models')" 2>/dev/null

# Apify — check plan and credits
curl -s "https://api.apify.com/v2/users/me?token=$APIFY_TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin)['data']['plan']; print(f'Apify: {d[\"id\"]} plan, \${d[\"monthlyUsageCreditsUsd\"]}/mo credits')" 2>/dev/null

# Bright Data — check balance (needs Finance+ permission)
curl -s "https://api.brightdata.com/customer/balance" -H "Authorization: Bearer $BRIGHTDATA_API_KEY"

# Exa — test search
curl -s https://api.exa.ai/search -H "x-api-key: $EXA_API_KEY" -H "Content-Type: application/json" -d '{"query":"test","numResults":1}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Exa: {\"OK\" if \"results\" in d else \"FAIL\"}')" 2>/dev/null

# Replicate — check account
curl -s https://api.replicate.com/v1/account -H "Authorization: Token $REPLICATE_API_TOKEN" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Replicate: {d.get(\"username\",\"FAIL\")}')" 2>/dev/null
```
