---
task: "Create ZaiVision CLI tool and audit Kitty UI"
slug: 20260303-zai-vision-kitty
effort: extended
phase: execute
progress: 16/18
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
- [ ] ISC-18: Коммит с ZaiVision.ts создан
- [ ] ISC-A-1: Anti: не зависит от сломанного zai-cli MCP
- [ ] ISC-A-2: Anti: не хардкодит API key в исходнике
