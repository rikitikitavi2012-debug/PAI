---
name: TFContent Render Preferences
description: Visual style guide for TF site imagery — mixed approach by purpose
type: reference
---

# TFContent — Стиль визуалов

## Стратегия: смешанный стиль под задачу

| Тип изображения | Стиль | Модель | Пример использования |
|-----------------|-------|--------|---------------------|
| **Hero / портфолио** | Фотореализм | FLUX 2 Max | Готовые объекты, общий вид террас, вечерний свет |
| **Схемы соединений** | Техническая иллюстрация | GPT-Image-1.5 | Шип-паз крупный план, ласточкин хвост, нагели |
| **Процесс строительства** | Архитектурная визуализация | FLUX 2 Pro | Сборка каркаса, подъём рам, монтаж |
| **Диаграммы / сравнения** | Инфографика | Ideogram 3.0 | TCO графики, сравнительные таблицы, climate data |
| **Итерации / черновики** | Быстрый скетч | Nano Banana 2 | Концепты, варианты ракурсов |

## Стилистические константы (для всех типов)

- **Палитра**: тёплое дерево (лиственница медово-золотистая), тёмный фон (stone-950), акцент amber
- **Свет**: вечерний golden hour ИЛИ утренний мягкий — НИКОГДА полуденный плоский
- **Контекст**: берёзы, сосны, ЛО ландшафт — не тропики, не горы
- **Детали**: видимые соединения шип-паз, текстура дерева, дубовые нагели
- **Антипаттерны**: НЕТ металлических уголков, НЕТ пластиковых элементов, НЕТ generic stock photo look

## Промпт-якоря (включать в каждый промпт)

```
timber frame construction, visible mortise-tenon joints, glulam GL24h beams 200x200mm,
larch decking, St Petersburg Russia landscape, birch trees, evening golden hour lighting,
premium residential, Scandinavian-Russian style
```

## Для технических схем

```
technical illustration, cutaway view, mortise-tenon joint detail,
oak wooden pegs, precise woodworking, engineering diagram style,
clean white background, dimensional annotations, cross-section view
```
