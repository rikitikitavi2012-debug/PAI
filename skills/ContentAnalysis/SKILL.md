---
name: ContentAnalysis
description: Content extraction and analysis — wisdom extraction from videos, podcasts, articles, and YouTube. USE WHEN extract wisdom, content analysis, analyze content, insight report, analyze video, analyze podcast, extract insights, key takeaways, what did I miss, extract from YouTube, извлеки мудрость, анализ контента, проанализируй контент, ключевые выводы, что я упустил, извлеки из YouTube.
context: fork
---

## 🚨 MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

**You MUST send this notification BEFORE doing anything else when this skill is invoked.**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:8888/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Запускаю WORKFLOWNAME в скилле ContentAnalysis", "voice_id": "3EuKHIEZbSzrHGNmdYsx", "voice_enabled": true}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Запускаю **WorkflowName** в скилле **ContentAnalysis**...
   ```

# ContentAnalysis

Unified skill for content extraction and analysis workflows.

## Workflow Routing

| Request Pattern | Route To |
|---|---|
| Extract wisdom, content analysis, insight report, analyze content | `ExtractWisdom/SKILL.md` |
