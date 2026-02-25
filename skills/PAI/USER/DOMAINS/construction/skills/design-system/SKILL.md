# Skill: Design System (Дизайн-система)

## Цель
Собрать все исследования в единый документ — техническое задание для разработки сайта. Design System = единый источник правды для UI.

## Входные данные
- Buyer Personas (docs/research/BUYER_PERSONAS.md)
- Brand Guidelines (docs/research/BRAND_GUIDELINES.md)
- UX Research (docs/research/UX_RESEARCH.md)
- Бизнес-стратегия (STRATEGY.md)

## Методология

### 1. Design Tokens
- Цвета: CSS-переменные (--color-primary, --color-secondary и т.д.)
- Типографика: font-family, font-size шкала, line-height, font-weight
- Отступы: spacing scale (4, 8, 12, 16, 24, 32, 48, 64 px)
- Радиусы скругления (border-radius)
- Тени (box-shadow)
- Breakpoints (mobile, tablet, desktop, wide)

### 2. Компоненты
Для каждого компонента: название, назначение, варианты (default, hover, active, disabled), размеры (S/M/L), спецификация (отступы, цвета, типографика).

Список:
- Кнопки (primary, secondary, ghost, CTA)
- Формы (input, textarea, select, checkbox, radio)
- Карточки (проект, услуга, отзыв)
- Навигация (header, mobile menu, breadcrumbs, footer)
- Hero-секция
- Галерея проектов
- Калькулятор/Конфигуратор
- Блок отзывов
- Блок FAQ
- Таймлайн процесса работы
- Контактная форма
- Модальные окна

### 3. Паттерны взаимодействия
- Анимации: длительность, easing, что анимируется
- Загрузка: skeleton screens, lazy loading
- Обратная связь: toast/notification стили
- Валидация форм: inline ошибки

### 4. Контент-гайдлайн
- Tone of Voice с примерами (заголовки, описания, CTA)
- Шаблон текста для каждого типа страницы
- SEO-требования (мета-теги, h1, alt-тексты)

## Формат выхода
Markdown-файл `DESIGN_SYSTEM.md` со всеми 4 блоками.

## Критерии качества
- [ ] Все 4 блока присутствуют
- [ ] Design Tokens готовы к переводу в CSS/Tailwind
- [ ] Каждый компонент имеет все состояния (default, hover, active, disabled)
- [ ] Breakpoints конкретные (числа в px)
- [ ] Spacing scale консистентна (кратная 4 или 8)
- [ ] Компоненты покрывают все wireframes из UX Research
- [ ] Контент-гайдлайн содержит конкретные примеры текстов, не абстрактные правила
- [ ] Design System согласован с Brand Guidelines (цвета, шрифты совпадают)
