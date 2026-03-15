---
name: Jules задачи через batch скрипт
description: Массовые задачи для Jules создавать через scripts/jules-batch-tasks.sh, не вручную. Скрипт > ручная работа.
type: feedback
---

При создании 3+ задач для Jules — использовать `scripts/jules-batch-tasks.sh`, не ставить вручную через API.

**Why:** 15 задач вручную = 30+ минут копипаста + ошибки. Скрипт = 2 минуты + dry-run для проверки. Первый batch (15 тестов для Algorithm v4.0-alpha + LearnGate) прошёл 15/15 без ошибок.

**How to apply:**
1. Отредактировать `scripts/jules-batch-tasks.sh` — добавить/заменить задачи в секции TASKS
2. `bash scripts/jules-batch-tasks.sh --dry-run` — проверить
3. `bash scripts/jules-batch-tasks.sh` — запустить
4. Скрипт уже настроен на PAI-personal repo + master branch
5. Шаблон `$SUFFIX` задаёт стандарты: bun:test, conventional commits, English PR
