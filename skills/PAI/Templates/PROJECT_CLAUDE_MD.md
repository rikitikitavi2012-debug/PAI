# {Project Name}

> {Одна строка: что делает проект и на каком стеке.}

## Commands

```bash
# Dev
{dev command}

# Build
{build command}

# Test
{test command}

# Lint / Format
{lint command}

# Deploy
{deploy command, если есть}
```

## Architecture

{Краткое описание архитектуры: 3-7 строк. Ключевые директории и их назначение.}

```
src/
  components/   # UI компоненты
  lib/          # Утилиты и хелперы
  app/          # Роуты / страницы
public/         # Статика
```

## Code Style

- {Модульная система: ES modules / CommonJS / etc.}
- {Форматирование: Prettier / Biome / конфиг}
- {Именование: camelCase / snake_case / kebab-case}
- {Импорты: абсолютные / относительные, порядок}

## Testing

- {Фреймворк: vitest / jest / pytest / etc.}
- {Запуск одного теста: `command`}
- {Паттерн именования: `*.test.ts` / `*_test.go` / etc.}
- {Мок/стаб стратегия, если нестандартная}

## Key Decisions

- {Решение 1: почему выбрано X вместо Y}
- {Решение 2: архитектурный паттерн и обоснование}

## Things That Will Bite You

- {Неочевидное поведение 1}
- {Обязательный env var или зависимость}
- {Известный workaround}
- {Файлы/области которые НЕ трогать, если есть}

## Environment

- {Node >= 20 / Python 3.12 / etc.}
- {Обязательные env vars: `DATABASE_URL`, `API_KEY`}
- {Внешние зависимости: Redis, PostgreSQL, etc.}

## PAI Integration

- Запускать `claude` из корня проекта: `cd {project_path} && claude`
- При compaction сохранять: список изменённых файлов, текущую ветку, результаты тестов
- Использовать `@README.md` для контекста проекта
- Использовать `@docs/` для детальной документации через progressive disclosure
