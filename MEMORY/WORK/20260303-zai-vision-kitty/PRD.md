---
task: "Create ZaiVision CLI tool and audit Kitty UI"
slug: 20260303-zai-vision-kitty
effort: extended
phase: complete
progress: 18/18
mode: interactive
started: 2026-03-03T21:47:00Z
updated: 2026-03-03T21:52:00Z
---

## Context

Ivan хочет расширить использование Z.AI — создать CLI утилиту ZaiVision.ts для автоматического скриншота Kitty окна + vision-анализа через Z.AI GLM-4.6v API. Затем применить утилиту к текущему Kitty UI для каталогизации проблем.

**Техническая разведка (OBSERVE):**
- PowerShell .NET screenshot работает в WSL2 (→ /tmp/*.png)
- `zai-cli vision` сломан (search MCP server fails), прямой Z.AI API (`glm-4.6v`) работает
- `max_tokens=2000` недостаточно — reasoning занимает все токены, content пустой. Нужно 4000+
- Kitty remote control работает: `kitten @ ls`, `kitten @ get-text`
- Инструменты: `import` (ImageMagick) не работает в WSL2, `grim`/`slurp` не установлены

**Constraints:**
- WSL2 — нет прямого X11/Wayland screenshot, только через PowerShell interop
- Z.AI API key через ~/.config/PAI/.env
- Шаблон: паттерн существующих Tools (Inference.ts, AgentZero.ts)

### Risks
- PowerShell screenshot захватывает весь экран, не только Kitty — нужно кадрирование или принять
- Z.AI API может давать reasoning без content при малом max_tokens
- WSL2 путь к PowerShell может отличаться на других машинах

## Criteria

- [x] ISC-1: ZaiVision.ts файл создан в PAI/Tools/
- [x] ISC-2: `screenshot` команда делает скриншот через PowerShell
- [x] ISC-3: Скриншот сохраняется как PNG в /tmp/
- [x] ISC-4: `analyze` команда отправляет изображение в Z.AI API
- [x] ISC-5: Z.AI API возвращает содержательный анализ (content не пустой)
- [x] ISC-6: `diff` команда принимает два изображения для сравнения
- [x] ISC-7: `diff` использует Z.AI для визуального сравнения UI
- [x] ISC-8: `check` команда объединяет screenshot + analyze
- [x] ISC-9: CLI выводит результат анализа в stdout
- [x] ISC-10: API key загружается из ~/.config/PAI/.env
- [x] ISC-11: Ошибки API обрабатываются с понятным сообщением
- [x] ISC-12: Таймаут API вызова настроен (120с)
- [x] ISC-13: Файл имеет shebang и chmod +x
- [x] ISC-14: `--help` выводит справку по командам
- [x] ISC-15: Скриншот текущего Kitty UI сделан и сохранён
- [x] ISC-16: Z.AI vision анализ текущего Kitty UI выполнен
- [x] ISC-17: Список UI проблем Kitty каталогизирован
- [x] ISC-18: Коммит с ZaiVision.ts создан
- [x] ISC-A-1: Anti: не зависит от сломанного zai-cli MCP
- [x] ISC-A-2: Anti: не хардкодит API key в исходнике

## Verification

- ISC-1: `ls PAI/Tools/ZaiVision.ts` — exists, 10864 bytes
- ISC-2,3: `screenshot` → /tmp/zai-screenshot-*.png (371KB → 386KB resized)
- ISC-4,5: `analyze` → Z.AI API returns structured content (191+ chars)
- ISC-6,7: `diff` → Z.AI compares two images, lists 6 categories of changes
- ISC-8: `check` → combines screenshot+analyze, full UI audit returned
- ISC-9: stdout output confirmed for all commands
- ISC-10: `grep ZAI_API_KEY` — loads from env/file, 5 references
- ISC-11: error handling with `process.exit(1)` and descriptive messages
- ISC-12: `API_TIMEOUT_MS = 120_000` confirmed
- ISC-13: shebang `#!/usr/bin/env bun`, permissions `-rwxr-xr-x`
- ISC-14: `--help` shows all 4 commands + examples
- ISC-15: Screenshot at /tmp/zai-screenshot-2026-03-03T18-57-37-resized.png
- ISC-16: Full Z.AI analysis returned with 4 categories, 15 issues
- ISC-17: `kitty-ui-issues.md` — 40 lines, 15 issues in 4 categories with priority table
- ISC-18: Commit b306291
- ISC-A-1: 0 references to `zai-cli` in source
- ISC-A-2: 0 hardcoded API keys found
