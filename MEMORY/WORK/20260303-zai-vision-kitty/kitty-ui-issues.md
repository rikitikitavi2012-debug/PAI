# Kitty UI Issues — Z.AI Vision Audit (2026-03-03)

Автоматический аудит через `bun ZaiVision.ts check`. Модель: Z.AI GLM-4.6v.

## 1. Alignment (Выравнивание)

- **Status bar label-value misalignment**: Labels (CONTEXT, USAGE, MEMORY, LEARNING) left-aligned, values right-aligned — сложно ассоциировать
- **Inconsistent status bar spacing**: PAI STATUSLINE (left) и tab title (right) — неравномерные отступы
- **Chat widget text alignment**: Sprut AI Chat виджеты — mixed center/left alignment

## 2. Color Contrast (Контраст)

- **Low contrast context percentage**: 51% в CONTEXT секции — бледный цвет на тёмном фоне, может не проходить WCAG 2.1 AA (4.5:1)
- **Dark green code background**: Зелёный фон кода — потенциальная нагрузка на глаза при длительной работе
- **Chat widget icon visibility**: Sprut AI Chat иконки — цвета сливаются с тёмным фоном

## 3. Readability (Читаемость)

- **Dense status bar**: Слишком много данных в одной строке (location, time, weather, env vars) — информационная перегрузка
- **Small learning graph**: LEARNING секция — маленькие бары, похожие цвета (green/blue), мелкие лейблы
- **Truncated chat messages**: Right-side виджеты обрезают текст
- **Faint code line numbers**: Номера строк (серый на тёмном) — плохо отличаются от кода

## 4. Layout (Компоновка)

- **Jarring code-status transition**: Резкий переход от кода к status bar — нет границы/отступа
- **Cluttered lower sections**: CONTEXT/USAGE/MEMORY/LEARNING плотно упакованы — мало white space
- **Uneven chat widget widths**: Right-side виджеты разной ширины
- **Orphaned "Hill-climbing" text**: Красно-оранжевый текст не интегрирован в основной layout

## Приоритеты

| # | Issue | Severity | Fix Effort |
|---|-------|----------|------------|
| 1 | Dense status bar | High | Medium — нужен редизайн |
| 2 | Low contrast elements | High | Low — поменять цвета |
| 3 | Label-value misalignment | Medium | Low — выровнять |
| 4 | Cluttered lower sections | Medium | Medium — добавить spacing |
| 5 | Faint line numbers | Low | Low — увеличить яркость |
| 6 | Code-status transition | Low | Low — добавить border |
