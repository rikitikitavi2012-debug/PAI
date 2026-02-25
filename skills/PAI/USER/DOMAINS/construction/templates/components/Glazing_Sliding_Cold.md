**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования "холодного" раздвижного остекления из алюминиевых профилей.

---

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "opening_width_mm"
    type: integer
    validation_rules: ["value >= 1000", "value <= 6000"]

  - name: "opening_height_mm"
    type: integer
    validation_rules: ["value >= 1200", "value <= 2400"]

  - name: "sash_count"
    description: "Желаемое количество створок (от 2 до 6)"
    type: integer
    validation_rules: ["value >= 2", "value <= 6"]

# Ограничения применимости компонента
constraints:
  - "Основание для монтажа должно быть жестким и строго горизонтальным."
  - "Не предназначено для отапливаемых помещений."

Выходные данные, генерируемые компонентом
output:
  - name: "status"
  - name: "solution"
    properties:
      - profile_system_code: "PROVEDAL_C640"
      - track_count: 3 # Количество полозьев
      - actual_sash_width_mm: 850
      - glass_type: "float_5mm_m1"
      - generated_bom: # Сгенерированная спецификация

## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_cold_glazing (input)
  // 1. Поиск оптимальной системы (количество полозьев)
  sash_width_approx = input.opening_width_mm / input.sash_count
  best_system = FIND_SYSTEM from [Cold_Glazing_Systems_DB] WHERE
    (sash_width_approx >= system.min_sash_width AND sash_width_approx <= system.max_sash_width)
  IF best_system IS NULL, RETURN {status: "ERROR", message: "Неоптимальное количество створок для данной ширины. Рекомендация: изменить sash_count."}

  // 2. Валидация соотношения сторон и площади створки
  sash_ratio = input.opening_height_mm / best_system.actual_sash_width
  sash_area = (input.opening_height_mm * best_system.actual_sash_width) / 1_000_000
  IF sash_ratio > best_system.max_ratio OR sash_area > best_system.max_area THEN
    RETURN {status: "ERROR", message: "Превышены макс. габариты или площадь створки. Увеличьте sash_count."}

  // 3. Генерация BoM
  solution.generated_bom = GENERATE_BOM(best_system, input.opening_width_mm, input.opening_height_mm)

  RETURN {status: "OK", output: solution}
END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

**Пример генерации для проема 4000х2200 мм, 4 створки:**

components:
  - item_code: "ALU-PROF-C640-FRAME-3T"
    description: "Рама 3-полозковая Provedal C640, RAL9016"
    quantity: 12.4 # в метрах погонных
    unit: "m"
  - item_code: "ALU-PROF-C640-SASH"
    description: "Профиль створки Provedal C640, RAL9016"
    quantity: 14.4
    unit: "m"
  - item_code: "GLASS-FLOAT-5MM"
    description: "Стекло листовое М1, 5 мм"
    quantity: 8.8
    unit: "m2"
  - item_code: "HDW-ROLLER-ADJ-C640"
    description: "Ролики для створки C640, регулируемые"
    quantity: 8 # по 2 на створку
    unit: "pcs"
  - item_code: "SEAL-BRUSH-7MM-SCHLEGEL"
    description: "Щеточный уплотнитель Schlegel, 7мм"
    quantity: 17.6
    unit: "m"

## 4. Critical Control Points (CCP)

*   **CCP_ID:** TRACK-01 (Направляющие)

    *   **Action:** Контроль горизонтальности установки нижней направляющей.

    *   **Instrument:** Уровень длиной не менее 2 м или лазерный нивелир.

    *   **Acceptance Criteria:** Отклонение от горизонтали не более 1 мм на всей длине проема.

*   **CCP_ID:** DRAIN-01 (Дренаж) - **КРИТИЧЕСКИЙ**

    *   **Action:** Проверка наличия, чистоты и расположения дренажных отверстий.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Фрезерованные отверстия размером 5х20 мм во внешней камере нижней рамы, с шагом не более 600 мм, но не менее 2-х на проем. Отверстия должны быть свободны от стружки и герметика.

    *   // _cross-ref: Альбом тех. решений Provedal_

*   **CCP_ID:** FUNC-01 (Функциональность)

    *   **Action:** Проверка легкости хода всех створок после монтажа.

    *   **Instrument:** Ручное перемещение.

    *   **Acceptance Criteria:** Все створки перемещаются плавно, без заеданий и излишних усилий. Замки-защелки срабатывают четко.

## 5. Customization & Trade-offs

| Option ID | Количество полозьев | % открываемого проема | Рекомендация | Цена (множитель) |
| ------- | ------- | ------- | ------- | ------- |
| BASE | 2 | ~50% | Для узких проемов до 3м | x1.0 |
| STANDART | 3 | ~66% | Оптимально для проемов 3-5м | x1.25 |
| PREMIUM | 4 | ~75% | Для широких проемов >5м | x1.45 |
| UPSELL | + Москитная сетка | +100% защиты от насекомых | Must-have для террас | +20% |
