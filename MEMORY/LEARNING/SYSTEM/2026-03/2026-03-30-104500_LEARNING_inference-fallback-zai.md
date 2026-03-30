---
type: LEARNING
category: SYSTEM
timestamp: 2026-03-30T10:45:00Z
rating: 8
tags: [inference, fallback, zai, claude-api, error-handling]
---

# Inference Z.AI Fallback

## Context

Autoresearch skill падал с http_401 ошибками потому что Inference tool пытался использовать Claude API напрямую, но ANTHROPIC_API_KEY не валидный когда мы на Z.AI.

## Feedback

Inference tool теперь имеет fallback на Z.AI при 401/403/429 ошибках от Claude API. Это позволяет использовать inference-dependent workflows (Autoresearch, UpdateTabTitle) без Anthropic ключа.

## Technical Details

- Fallback chain: Claude API → Z.AI (glm-5-turbo/glm-5/glm-5.1)
- Level mapping: fast→glm-5-turbo, standard→glm-5, smart→glm-5.1
- Triggers: 401 (Unauthorized), 403 (Forbidden), 429 (Rate Limit)

## Impact

- Autoresearch может работать на Z.AI
- UpdateTabTitle inference работает без Anthropic ключа
- Все hooks использующие inference продолжают работать
