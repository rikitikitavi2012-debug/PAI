# Agent Zero Integration Plan for PAI

*Created: 2026-03-03 | Status: Active | Priority: P1*

## Current A0 Capabilities (Deployed)

### 14 Tools
1. `code_execution_tool` — Python/bash sandbox в Docker
2. `browser_agent` — автономная веб-автоматизация (browser-use)
3. `call_subordinate` — делегирование суб-агентам (A2A)
4. `search_engine` — SearXNG поиск (приватный)
5. `document_query` — Q&A по документам/PDF
6. `vision_load` — анализ изображений (OCR, UI, screenshots)
7. `memory_*` — FAISS vector DB (persistent memory)
8. `behaviour_adjustment` — настройка поведения на лету
9. `response` — форматирование ответов
10. `input` — интерактивный ввод
11. `wait` — пауза/rate limiting
12. `notify_user` — уведомления
13. `a2a_chat` — agent-to-agent messaging
14. `scheduler:*` — cron-like планировщик

### 9 Skills
1. `telos` — стратегический контекст (TELOS файлы)
2. `the-algorithm` — TheAlgorithm v2.0
3. `a0-deployer` — DevOps/инфраструктура
4. `chart-architect` — визуализация данных
5. `doc-forge` — генерация документов
6. `exa-synergy` — deep web research (Exa API)
7. `ops-commander` — операционное управление
8. `replicate-studio` — AI media generation
9. `create-skill` — создание новых skills

### REST API
| Endpoint | Method | Use |
|----------|--------|-----|
| `/health` | GET | Проверка доступности |
| `/api_message` | POST | Sync messaging (до 10min) |
| `/message_async` | POST | Fire-and-forget |
| `/api_log_get` | POST | История разговора |
| `/api_terminate_chat` | POST | Завершение сессии |
| `/scheduler_tasks_list` | POST | Список scheduled tasks |
| `/scheduler_task_run` | POST | Ad-hoc запуск задачи |

## 5 Кодинг-Интеграций (по приоритету)

### 1. A0 Code Review в JulesAutoMerge Pipeline [P1, 3h]

**Что:** Перед auto-merge A0 анализирует diff на security/quality issues.

**Где в коде:** `PAI/Tools/JulesAutoMerge.ts` → `processPR()` между tests и merge.

**Реализация:**
```typescript
// После тестов прошли, перед merge:
const diff = run(['gh', 'pr', 'diff', String(pr.number), '--repo', repo.repo]);
const review = await a0Review(diff.stdout, pr.title);
if (review.severity === 'HIGH') {
  record.result = 'review_blocked';
  return record;
}
```

**A0 prompt:** "Review this git diff for security vulnerabilities, performance issues, and code quality. Return JSON: {severity: LOW|MEDIUM|HIGH, issues: [{type, line, description}]}"

**ROI:** Catches ~60-70% security bugs before merge. Complements Jules test-only gate.

### 2. A0 Scheduled Health Monitor [P1, 2h]

**Что:** Ежечасный мониторинг всех API (Claude, Gemini, A0, gh, VoiceServer).

**Реализация:** A0 scheduler task + PAI/Tools/HealthMonitor.ts для ad-hoc проверки.

```typescript
// A0 scheduler task (hourly):
const endpoints = [
  { name: 'A0', url: `${A0_BASE}/health`, method: 'GET' },
  { name: 'Voice', url: 'http://localhost:8888/health', method: 'GET' },
  { name: 'GitHub', cmd: ['gh', 'auth', 'status'] },
];
```

**ROI:** Проактивное обнаружение проблем. Нет внезапных "Gemini не работает" при деплое.

### 3. A0 Background Research [P2, 2h]

**Что:** Пока Ivan кодит, A0 автономно исследует тему в фоне. Результат → MEMORY/RESEARCH/.

**Trigger:** Ручной вызов `bun AgentZero.ts async "Research: [topic]"` или через hook.

**A0 capabilities used:** browser_agent + search_engine + exa-synergy + memory.

**ROI:** 15 мин на сессию — research не блокирует coding flow.

### 4. A0 Hook Development Pipeline [P2, 4h]

**Что:** A0 генерирует hook + тесты по текстовой спецификации.

**A0 prompt:** "Create a PAI hook that [spec]. Follow defensive/fail-open pattern. Include: shebang, JSON stdin parsing, error handling, event logging. Also create test file using harness.ts."

**A0 capabilities used:** code_execution_tool + memory (знает паттерны) + document_query (читает THEHOOKSYSTEM.md).

**ROI:** 15-20 мин на новый hook. Consistency. Reduces boilerplate.

### 5. A0 Community Watcher [P2, 2h]

**Что:** Ежедневный мониторинг upstream PAI repo + anthropics/claude-code на релевантные issues/PRs.

**A0 capabilities used:** browser_agent + search_engine + scheduler.

**Trigger:** A0 scheduler daily at 09:00 MSK.

**Output:** Markdown report в MEMORY/RESEARCH/community/{date}.md.

**ROI:** 30-60 мин/неделю на мониторинг community. Не пропускаем важные issues.

## Что A0 делает лучше Navi (Claude Code)

| Задача | Navi | A0 |
|--------|------|-----|
| Background processing | Нет (блокирует сессию) | Async, 24/7 на VPS |
| Web scraping/browsing | Нет browser agent | browser-use + vision |
| Scheduled tasks | Нет cron | Встроенный scheduler |
| Code execution sandbox | Bun в host | Docker isolation |
| Long-running research | Timeout 2-5 мин | 10+ мин без проблем |
| Persistent memory | Файловая система | FAISS vector search |
| Multi-model inference | Через Inference.ts | LiteLLM (15+ providers) |

## Архитектура Интеграции

```
Navi (Claude Code) ←→ AgentZero.ts ←→ A0 (VPS Docker)
     ↓                    ↓                    ↓
  Strategy/UX       CLI Interface         Execution/24x7
  Architecture       Event Logging        Browser Agent
  Code Review        State Mgmt           Scheduler
  Interactive dev    Sync/Async           FAISS Memory
```

**Принцип:** Navi = мозг (стратегия, архитектура, interactive), A0 = руки (execution, background, monitoring).

## Immediate Next Steps

1. ✅ JulesAutoMerge — pipeline работает, баги исправлены
2. ✅ Jules upstream tasks — 3 задачи на community issues
3. 🔜 Добавить A0 code review step в JulesAutoMerge (P1, следующая сессия)
4. 🔜 Создать A0 scheduler task для health monitoring (P1)
5. 🔜 Создать A0 scheduler task для community watching (P2)
