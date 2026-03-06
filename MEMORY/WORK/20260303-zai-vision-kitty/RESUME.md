# Z.AI Vision для Kitty UI — Resume Prompt

**Статус:** Готово к старту
**Дата:** 2026-03-03
**Фаза:** A (заточка инструментов, до ~10 марта)

---

## Контекст

PAI v4.0.3. Z.AI (Zhipu GLM-5) подключён как code reviewer в JulesAutoMerge (коммит 315befc). Ivan хочет расширить Z.AI использование — добавить **vision-анализ UI** для Kitty терминала. У Kitty есть UI-проблемы, и Z.AI vision поможет автоматически их ловить.

**Z.AI Vision возможности:**
- `zai-cli vision` — CLI для анализа изображений
- MCP tools: `analyze_image`, `extract_text`, `diagnose_error`, `ui_diff` и др. (8 tools)
- MCP server уже в settings.json: `zai-vision` (stdio via `npx @z_ai/mcp-server@latest`)
- Z.AI API key: ZAI_API_KEY в `~/.config/PAI/.env`

**Kitty контекст:**
- Kitty sessions: `MEMORY/STATE/kitty-sessions/`
- Tab titles: `MEMORY/STATE/tab-titles/`
- KittyEnvPersist.hook.ts — управляет Kitty окружением

---

## Задачи этой сессии

### 1. Z.AI Vision утилита для скриншотов

**Создать:** `PAI/Tools/ZaiVision.ts` — CLI обёртка для vision-анализа:
```
bun ZaiVision.ts screenshot              — сделать скриншот активного Kitty окна
bun ZaiVision.ts analyze <image_path>    — Z.AI анализ изображения
bun ZaiVision.ts diff <before> <after>   — сравнение двух скриншотов (UI регрессия)
bun ZaiVision.ts check                   — screenshot + analyze в одну команду
```

**Как делать скриншот Kitty:**
- `kitty @ launch --type=background -- import -window root /tmp/kitty-screenshot.png` или
- `kitten @ send-text` + `screencapture` или
- Просто `import` (ImageMagick) — проверить что установлен

**Z.AI Vision API call:**
- Использовать `zai-cli vision analyze_image --image <path>` (MCP CLI)
- Или прямой API: POST `https://api.z.ai/api/coding/paas/v4/chat/completions` с image в content (base64)

### 2. Интеграция в QA workflow

**Где использовать:**
- После Jules PR merge — автоматический скриншот + проверка что UI не сломался
- В QATester skill — добавить Z.AI vision как дополнительную проверку
- По запросу — `bun ZaiVision.ts check` для ручной проверки

**Опционально:** Добавить в JulesAutoMerge pipeline (после merge → screenshot → Z.AI vision → alert if regression)

### 3. Kitty UI issues — каталогизировать

Ivan сказал "есть проблемы UI". Нужно:
1. Сделать скриншоты текущего состояния Kitty
2. Z.AI проанализирует и найдёт проблемы
3. Создать список issues для фикса

---

## Критерии завершения

- [ ] ZaiVision.ts создан и работает (screenshot + analyze + diff + check)
- [ ] Скриншот Kitty — работающий метод найден и протестирован
- [ ] Z.AI Vision API вызов — работает, возвращает анализ
- [ ] Текущие Kitty UI проблемы — каталогизированы через Z.AI vision
- [ ] Коммит и push в private/master

---

## Промпт для копирования

```
Фаза A, задача 3: Z.AI Vision для Kitty UI. Прочитай ~/.claude/MEMORY/WORK/20260303-zai-vision-kitty/RESUME.md и выполни задачи. Контекст: создаём ZaiVision.ts утилиту для скриншотов + Z.AI анализа UI, потом применяем к Kitty для поиска проблем.
```
