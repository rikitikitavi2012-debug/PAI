# Исследование: Лучшие практики Project-Level CLAUDE.md (Февраль 2026)

## Методология
- 4 параллельных агента-ресёрчера (ClaudeResearcher, GeminiResearcher, CodexResearcher, PerplexityResearcher)
- Прямой анализ официальной документации Anthropic (code.claude.com)
- 15+ реальных примеров из GitHub
- Community источники: Reddit, блоги, Twitter

## 1. Официальная документация Anthropic

### Иерархия файлов памяти (по приоритету, от высшего к низшему)

| Тип | Расположение | Назначение | Видимость |
|-----|-------------|-----------|-----------|
| **Managed policy** | `/etc/claude-code/CLAUDE.md` (Linux) | Политики организации | Все пользователи |
| **Project memory** | `./CLAUDE.md` или `./.claude/CLAUDE.md` | Командные инструкции проекта | Через git |
| **Project rules** | `./.claude/rules/*.md` | Модульные правила по темам | Через git |
| **User memory** | `~/.claude/CLAUDE.md` | Личные предпочтения | Только ты |
| **Project local** | `./CLAUDE.local.md` | Личные настройки проекта | Только ты (gitignored) |
| **Auto memory** | `~/.claude/projects/<project>/memory/` | Автоматические заметки Claude | Только ты |

### Ключевые механизмы
- CLAUDE.md в родительских директориях загружается полностью при старте
- CLAUDE.md в дочерних директориях загружается on-demand
- Auto memory: только первые 200 строк MEMORY.md
- Более специфичные инструкции имеют приоритет
- `@path/to/file` импорты — рекурсивные, до 5 уровней глубины
- `.claude/rules/*.md` — автоматически загружаются с приоритетом `.claude/CLAUDE.md`
- Поддержка path-specific rules через YAML frontmatter `paths:`

### Что включать (официально)

| ВКЛЮЧАТЬ | НЕ ВКЛЮЧАТЬ |
|----------|------------|
| Bash-команды, которые Claude не угадает | То, что Claude поймёт из кода |
| Стиль кода, отличающийся от стандартов | Стандартные конвенции языка |
| Инструкции по тестированию | Детальная API документация (ссылка) |
| Git конвенции (ветки, PR формат) | Информация, часто меняющаяся |
| Архитектурные решения проекта | Длинные объяснения и туториалы |
| Quirks среды разработки (env vars) | Описание каждого файла |
| Неочевидные gotchas | Очевидные практики типа "write clean code" |

## 2. Community консенсус (15+ источников)

### Размер файла
- **Идеал:** < 60 строк (HumanLayer)
- **Рабочий:** < 150 строк
- **Максимум:** < 300 строк (builder.io)
- **Бюджет инструкций:** ~150-200 для frontier моделей; system prompt Claude Code уже ~50

### Три столпа эффективного CLAUDE.md (HumanLayer)
1. **WHAT** — стек, структура проекта
2. **WHY** — назначение компонентов
3. **HOW** — команды, тестирование, верификация

### Анти-паттерны (из community)
1. **Kitchen sink** — всё в одном файле → Claude игнорирует
2. **Instruction overload** — >200 инструкций → деградация качества
3. **Auto-generated** — `/init` без ручной доработки
4. **Code style enforcement** — стиль через CLAUDE.md вместо линтеров
5. **Hotfix instructions** — узкие поведенческие фиксы размывают главное
6. **Generic advice** — "write clean code" бесполезно
7. **Vague instructions** — "format properly" вместо "2-space indent"

### Лучшие практики (синтез)
1. **Progressive disclosure** — основное в CLAUDE.md, детали в отдельных файлах через `@`
2. **Rules directory** — `.claude/rules/` для модульных правил по темам
3. **Path-specific rules** — через YAML frontmatter `paths:` в rules/
4. **Treat as code** — ревью, прунинг, тестирование изменений
5. **Emphasis for critical** — `IMPORTANT` или `YOU MUST` для ключевых правил
6. **Compaction instructions** — указать что сохранять при context compression
7. **Skills для domain knowledge** — вместо всего в CLAUDE.md

## 3. Реальные примеры из GitHub (топ-паттерны)

### Типичная структура хорошего project CLAUDE.md:
1. **Project Overview** (1-2 строки)
2. **Commands** (build, test, lint, deploy)
3. **Architecture** (ключевые директории + описание)
4. **Code Style** (только то, что отличается от дефолтов)
5. **Testing** (фреймворк, запуск, паттерны)
6. **Key Decisions** (архитектурные решения)
7. **Gotchas** (неочевидные вещи)

### Примечательные примеры:
- **CUDA ML проект** — подробная архитектура, data structs, CUDA kernels, troubleshooting
- **Elixir Stats lib** — API examples, driver config, test categories, performance notes
- **Laravel Auth Service** — endpoints, auth flow, RBAC, Kafka events, test patterns
- **Rust AWS CLI** — resource hierarchies, parallelization strategy, snapshot testing

## 4. Специфика для PAI

### Что НЕ нужно в project-level CLAUDE.md (уже в глобальном PAI):
- Идентичность Navi
- Algorithm v1.5.0
- AI Steering Rules
- Capabilities
- Voice system
- Hooks система
- Memory system

### Что НУЖНО в project-level CLAUDE.md:
- Стек и архитектура конкретного проекта
- Команды build/test/lint/deploy
- Стиль кода (специфичный для проекта)
- Ключевые архитектурные решения
- Gotchas и environment requirements
- Ссылки на детальные docs через `@`
- PAI-специфичные инструкции: compaction rules, progressive disclosure refs

## 5. Итоговая рекомендация для нашей системы

### Структура проекта:
```
project-root/
├── CLAUDE.md              # Основные инструкции (< 80 строк)
├── .claude/
│   ├── rules/
│   │   ├── code-style.md  # Стиль кода (path-specific если нужно)
│   │   ├── testing.md     # Правила тестирования
│   │   └── deployment.md  # Деплой правила
│   ├── agents/            # Кастомные агенты проекта
│   └── skills/            # Навыки проекта
├── CLAUDE.local.md        # Личные настройки (gitignored)
└── docs/                  # Детальная документация для @imports
```

### Принципы:
1. **CLAUDE.md < 80 строк** — только то, что Claude не угадает сам
2. **Rules/ для модульности** — каждый файл на одну тему
3. **@imports для деталей** — ссылки на README, docs/
4. **Не дублировать PAI** — PAI уже даёт identity, algorithm, hooks
5. **Compaction instructions** — явно указать что сохранять
6. **Тестировать изменения** — наблюдать реакцию Claude после изменений

## Источники

### Официальные
- [Anthropic: Manage Claude's Memory](https://code.claude.com/docs/en/memory)
- [Anthropic: Settings](https://code.claude.com/docs/en/settings)
- [Anthropic: Best Practices](https://code.claude.com/docs/en/best-practices)
- [Anthropic: Skills](https://code.claude.com/docs/en/skills)

### Community
- [Builder.io: How to Write a Good CLAUDE.md](https://www.builder.io/blog/claude-md-guide)
- [HumanLayer: Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md)
- [Buildcamp: The Ultimate Guide to CLAUDE.md](https://www.buildcamp.io/guides/the-ultimate-guide-to-claudemd)
- [Gend.co: Claude Skills and CLAUDE.md Guide](https://www.gend.co/blog/claude-skills-claude-md-guide)
- [Chris Dzombak: Streamlining User-Level CLAUDE.md](https://www.dzombak.com/blog/2025/12/streamlining-my-user-level-claude-md/)
- [GitHub: awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)
- [GitHub: everything-claude-code](https://github.com/affaan-m/everything-claude-code)
- [GitHub Gist: anthropic-claude-code-rules](https://gist.github.com/markomitranic/26dfcf38c5602410ef4c5c81ba27cce1)
- [ClaudeFast: Rules Directory Guide](https://claudefa.st/blog/guide/mechanics/rules-directory)
- [ClaudeLog: What Are Claude Rules](https://claudelog.com/faqs/what-are-claude-rules/)
