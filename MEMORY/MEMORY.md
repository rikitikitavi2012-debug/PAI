# Memory Index

## Reference
- [Hermes Agent Analysis](2026-03/2026-03-30_hermes-agent-analysis.md) — инсайты из nousresearch/hermes-agent: Memory Guidance, Tool-use Enforcement, Skills System, что позаимствовали для PAI
- [NotebookLM Integration](reference_notebooklm_integration.md) — интеграция Google NotebookLM: notebooklm-py, паттерны (Zero-Token YouTube, Content Pipeline), риски, экосистема
- [A0 Integration Architecture](reference_a0_integration.md) — полная схема интеграции Agent Zero: sync, knowledge base, scheduled tasks, улучшения
- [Session Search (FTS5)](reference_session_search.md) — FTS5 полнотекстовый поиск по истории сессий, skill /recall, автоиндексация
- [Gemini CLI Integration](reference_gemini_integration.md) — схема интеграции Gemini CLI: GEMINI.md, symlinks, hooks, routing table, DOMAINS
- [OpenCode CLI Integration](reference_opencode_integration.md) — схема интеграции OpenCode: AGENTS.md, plugin, symlinks, routing table, providers
- [Jules Integration](reference_jules_integration.md) — схема интеграции Jules: AGENTS.md, API, AutoMerge, русский язык, ограничения
- [A0 Telegram Bot](reference_telegram_bot.md) — настройка @A0_timecloud_bot: контейнер agent-zero-new, SSH workaround, фикс v0.9.8+
- [Yandex Estimates](reference_estimates_yandex.md) — справочник по оценкам из Яндекса

## Feedback
- [Не спамить A0](feedback_no_spam_a0.md) — не слать повторные запросы A0, ждать ответ или poll
- [Upstream Strategy](feedback_upstream_strategy.md) — НИКОГДА не merge upstream. Только cherry-pick. CLAUDE.md и Algorithm — наши.
- [Cross-Model Review](feedback_crossmodel_review.md) — ОБЯЗАТЕЛЬНО Gemini + A0 review при изменениях Algorithm. Claude has shared blind spots.
- [/simplify после нового кода](feedback_simplify_pattern.md) — запускать /simplify review после новых хуков/утилит и Extended+ сессий
- [Jules batch скрипт](feedback_jules_batch_script.md) — 3+ задач для Jules = через scripts/jules-batch-tasks.sh, не вручную
- [Hooks stdin sharing](feedback_hooks_stdin_sharing.md) — 2+ хука в одном hooks[] делят stdin. Один хук = один matcher entry.

## Project
- [A0 Telegram Bot Project](project_a0_telegram_bot.md) — рабочая директория /home/ser/projects/a0-telegram-bot/, стек, деплой, статус фаз, Jules PRs
- [A0 Infrastructure Status](project_a0_infra.md) — что сделано 2026-03-18 (FD fix, git, bot, backup), что осталось (50003 патч, health monitor, webhook)
- [TF Fencing Idea](project_tf_fencing_idea.md) — идея по ограждениям для timber frame сайта
- [Agent Claim System](project_claim_system_future.md) — claim system + deadlock detection для параллельных агентов (межсезонье)
