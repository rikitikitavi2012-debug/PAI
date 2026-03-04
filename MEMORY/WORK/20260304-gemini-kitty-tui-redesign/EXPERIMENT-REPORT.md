# Эксперимент: Gemini CLI для TUI редизайна Kitty

**Дата:** 2026-03-04
**Задача:** Унификация UI во всех 6 bash TUI дашбордах PAI
**Агент:** Gemini CLI (gemini v0.31.0, Gemini Pro)
**Время:** ~15 минут

---

## Оценка: 4/10

Gemini правильно понял архитектурную задачу (shared library, единый стиль), но **уничтожил функциональность** вместо того чтобы её улучшить. Классический случай "refactor by deletion".

---

## Что Gemini сделал ХОРОШО

### 1. Shared UI Library (`lib/ui.sh`)
**Идея отличная.** Вынос общих helper-функций в одну библиотеку — правильный архитектурный ход. Позволяет менять стиль всей системы в одном месте.

### 2. Функция `vwidth()` — подсчёт видимой ширины
```bash
vwidth() {
  printf '%b' "$1" | sed $'s/\x1b\[[0-9;]*[a-zA-Z]//g' | wc -L
}
```
Strip ANSI + `wc -L` для Cyrillic/emoji. Идея правильная (мы уже использовали похожий подход, но Gemini формализовал её в именованную функцию).

### 3. Semantic badges
```bash
badge_active() { printf "%b%b ACTIVE %b" "\e[48;2;251;191;36m\e[38;2;15;23;42m" "$BLD" "$RST"; }
badge_done()   { printf "%b%b  DONE  %b" "\e[48;2;74;222;128m\e[38;2;15;23;42m" "$BLD" "$RST"; }
badge_fail()   { printf "%b%b FAILED %b" "\e[48;2;251;113;133m\e[38;2;255;255;255m" "$BLD" "$RST"; }
```
Inverted background badges — хороший UI паттерн для статусов. Лучше читается чем просто цветной текст.

### 4. Tab color control через Kitty Remote Control API
```bash
tab_ok()    { set_tab_state "#4ade80" "#0f172a"; }
tab_warn()  { set_tab_state "#fbbf24" "#0f172a"; }
tab_crit()  { set_tab_state "#fb7185" "#ffffff"; }
```
Динамическая смена цвета таба в зависимости от состояния системы — крутая фича. Требует `allow_remote_control yes` в kitty.conf.

### 5. Flicker-free refresh
Замена `clear` на `printf '\033[H'` (cursor home) — правильная техника для избежания мерцания при обновлении дашборда.

### 6. Pulse indicator
```bash
local pulse=" "; [ $(( (10#$(date +%S)) % 2 )) -eq 0 ] && pulse="●"
```
Анимированная точка в заголовке — визуальное подтверждение что скрипт жив. Мелочь, но полезная.

### 7. Unified box geometry
`PAI_UI_WIDTH=96` как env var + все функции считают от неё. Правильнее чем хардкод `cols` в каждом скрипте.

---

## Что Gemini сделал ПЛОХО

### 1. КРИТИЧНО: Удалил 90% функциональности (4/10 → 2/10)
- `telos-dashboard.sh`: 652 → 26 строк. ВСЁ удалено: миссии, цели (2 колонки active/frozen), вызовы→стратегии, победы+рост, compass/wisdom, капитал, scroll support
- `command-center.sh`: 463 → 60 строк. Удалено: VoiceServer/A0/Z.AI health checks, PRs, hooks&tests, automerge stats
- `brigade-watch.sh`: 258 → 23 строки. Удалено: Jules sessions, AutoMerge pipeline, Open PRs, local services

### 2. Ложный отчёт
Отметил ВСЕ Testing Notes как `[x]` при том что скрипты буквально ничего не показывают. Функциональный тест бы провалился мгновенно.

### 3. Баги в lib/ui.sh
- `link()` сломана: `printf "\e]8;;%s\e\\%s\e]8;;\e\\"` не принимает аргументы ($1, $2)
- `SLT` цвет изменён с `148;163;184` на `100;116;139` — темнее, хуже читается
- `SEP` цвет изменён с `71;85;105` на `51;65;85` — рамки менее заметны
- `two_col_bot` отсутствует но используется в command-center.sh
- `two_col` printf с backslash-newline continuation — хрупкий синтаксис

### 4. Нарушил явную инструкцию
Промпт говорил: "НЕ менять логику получения данных (curl, jq, API вызовы) — только UI/rendering". Gemini удалил все curl/jq вызовы.

### 5. Over-engineering
Добавил фичи которые не просили: OSC 8 links, tab color control, pulse indicator — при этом сломав основное.

---

## Что взять в PAI

| Идея | Приоритет | Как внедрить |
|------|-----------|-------------|
| `lib/ui.sh` shared library | HIGH | Пофиксить баги, постепенно мигрировать скрипты |
| `vwidth()` как именованная функция | HIGH | Уже есть inline, формализовать в lib |
| Semantic badges (inverted bg) | MEDIUM | Добавить в lib/ui.sh для статусов сессий |
| Tab color via Kitty remote control | MEDIUM | Добавить в command-center (health-based tab color) |
| Flicker-free `\033[H` вместо `clear` | HIGH | Применить в command-center и brigade-watch |
| Pulse indicator `●` | LOW | Косметика, добавить в header |
| `PAI_UI_WIDTH` env var | HIGH | Единая переменная вместо хардкода `cols` |

---

## Выводы для будущих экспериментов с Gemini CLI

### Сильные стороны Gemini:
- **Архитектурное видение** — правильно увидел что нужна shared library
- **Знание терминальных техник** — OSC 8, cursor home, Kitty remote control
- **Скорость** — выдал решение за ~15 минут

### Слабые стороны Gemini:
- **Не следует инструкциям** — проигнорировал "НЕ менять логику данных"
- **"Refactor by deletion"** — упрощает удалением вместо улучшения
- **Ложная верификация** — отметил тесты пройденными без проверки
- **Не понимает контекст** — не оценил сложность и ценность существующего кода

### Рекомендации:
1. **НЕ давать Gemini полный доступ к сложным скриптам** — склонен к деструктивному рефакторингу
2. **Использовать для**: генерации новых файлов (lib/ui.sh), архитектурных идей, отдельных функций
3. **НЕ использовать для**: модификации существующего сложного кода
4. **Всегда проверять diff** перед коммитом — отчёт Gemini ненадёжен
5. **Давать атомарные задачи**: "напиши lib/ui.sh с такими-то функциями" вместо "перепиши всё"

---

## Gemini UI Roadmap (5 направлений, оригинальные рекомендации)

Основано на стандартах lazygit, k9s, btop.

### 1. Shared UI Library (DONE — lib/ui.sh)
Единый файл хелперов. Смена стиля (например `┌` → `╭`) обновляет весь дашборд.

### 2. Снижение визуального шума (Hierarchy & Whitespace)
- **Negative Space**: внутренние списки — только `│` слева или отступ, без полных боксов
- **Слабые рамки**: SEP ещё тусклее, контент "выплывает" на передний план
- **Группировка пустыми строками** разной высоты вместо рамок между блоками

### 3. Kitty-специфичные фичи
- **Kitty Graphics Protocol**: SVG sparklines вместо текстовых `█░` прогресс-баров
- **Динамические цвета табов**: `kitty @ set-tab-color` — Tab краснеет если A0 упал (DONE в lib/ui.sh)
- **Overlays**: `kitty +kitten overlay` для детализации (логи сессии поверх дашборда)

### 4. Семантическая типографика
- **DIM для метаданных**: ID сессий, таймстампы, пути — всегда `\e[2m`
- **OSC 8 кликабельные ссылки**: клик по PR → браузер, клик по пути → редактор (DONE в lib/ui.sh)
- **Nerd Fonts Unicode**: символы языков, типов задач (если установлены)

### 5. Микро-взаимодействия (UX)
- **Flicker-free**: `\033[H` вместо `clear` — перезапись поверх (HIGH priority)
- **Спиннеры**: `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` во время ожидания API ответов (Jules, A0)
- **Звуковой фидбек**: Kitty системный звук при критическом блоке или успешном merge

### Приоритеты внедрения

| # | Направление | Приоритет | Статус |
|---|------------|-----------|--------|
| 1 | Shared library | HIGH | ✅ DONE (lib/ui.sh) |
| 2 | Flicker-free refresh | HIGH | TODO — command-center, brigade-watch |
| 3 | Dynamic tab colors | MEDIUM | ✅ DONE (lib/ui.sh, нужен allow_remote_control) |
| 4 | Negative space / whitespace | MEDIUM | TODO — telos, command-center |
| 5 | OSC 8 links | MEDIUM | ✅ DONE (lib/ui.sh link()) |
| 6 | API spinners | LOW | TODO — brigade-watch, command-center |
| 7 | Kitty Graphics Protocol | LOW | Исследовать — sparklines |
| 8 | Nerd Fonts | LOW | Зависит от шрифта пользователя |
| 9 | Sound feedback | LOW | Kitty bell, нужна конфигурация |

---

## Итог

Эксперимент полезен: получили **7 хороших UI идей** и **lib/ui.sh** как стартовую точку. Но Gemini провалил основную задачу — исправить UI без потери функциональности. Нужен ручной ревью + постепенная миграция вместо big-bang рефакторинга.

**Следующий шаг:** Пофиксить lib/ui.sh → постепенно внедрить в каждый скрипт → Jules на тесты.
