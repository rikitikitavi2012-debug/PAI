**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования двухскатной кровли из металлочерепицы.

---

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "span_m"
    description: "Ширина пролета здания, м"
    type: float
    validation_rules: ["value > 2", "value < 9"]

  - name: "angle_deg"
    description: "Угол наклона ската, градусы"
    type: integer
    validation_rules: ["value >= 14", "value <= 45"]

  - name: "roof_type"
    description: "Тип кровли: холодная или теплая (утепленная)"
    type: string
    validation_rules: ["value IN ['cold', 'warm']"]

  - name: "snow_load_kPa"
    description: "Нормативная снеговая нагрузка для региона, кПа"
    type: float
    validation_rules: ["value > 0"]

  - name: "wind_load_kPa"
    description: "Нормативная ветровая нагрузка для региона, кПа"
    type: float
    validation_rules: ["value > 0"]

# Ограничения применимости компонента
constraints:
  - "Только для зданий с простой прямоугольной формой в плане."
  - "Не применять для кровель с ендовами и сложными примыканиями (требуется отдельный компонент)."

Выходные данные, генерируемые компонентом
output:
  - name: "status"
  - name: "solution"
    properties:
      - rafter_section_mm: "50x200" # Сечение стропил
      - rafter_step_mm: 580 # Шаг стропил (под утеплитель)
      - lathing_step_mm: 350 # Шаг обрешетки (под волну металлочерепицы)
      - roofing_pie_code: "RP-GABLE-WARM-MC-V1" # Код "кровельного пирога"
      - generated_bom: # Сгенерированная спецификация

## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_gable_roof (input)
  // 1. Валидация входных данных
  VALIDATE input. IF fails, RETURN {status: "ERROR", message: "Некорректные входные данные."}

  // 2. Расчет стропильной системы
  total_load = (input.snow_load_kPa + input.wind_load_kPa) * safety_factor
  required_rafter_section = CALCULATE_RAFTER from [SP64_Wooden_Structures.md] using (total_load, input.span_m, input.angle_deg)

  IF required_rafter_section IS NULL, RETURN {status: "ERROR", message: "Невозможно подобрать сечение."}

  solution.rafter_section_mm = required_rafter_section.section
  solution.rafter_step_mm = required_rafter_section.step

  // 3. Формирование "кровельного пирога" и спецификации
  solution.roofing_pie_code = "RP-GABLE-" + input.roof_type + "-MC-V1"
  solution.generated_bom = GENERATE_BOM(solution, input, best_option)

  RETURN {status: "OK", output: solution}
END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

**Пример генерации для `roof_type: "warm"` и площади 100 м2:**

components:
  - item_code: "WD-PINE-AB-50-200"
    description: "Доска для стропил, 50х200 мм, сорт АВ"
    quantity: 2.1 # в м3
    unit: "m3"
  - item_code: "INS-BASALT-SLAB-200"
    description: "Утеплитель, базальтовая вата, плиты, 200 мм"
    quantity: 20 # в м3
    unit: "m3"
  - item_code: "MEM-VAPOR-SD20"
    description: "Пароизоляционная мембрана, Sd>20м"
    quantity: 110 # в м2 (с учетом нахлестов)
    unit: "m2"
  - item_code: "MEM-WIND-DIFF-A"
    description: "Гидро-ветрозащитная диффузионная мембрана"
    quantity: 110
    unit: "m2"
  - item_code: "RF-METAL-TILE-MPE-8017"
    description: "Металлочерепица, Матовый полиэстер, RAL8017"
    quantity: 105
    unit: "m2"

## 4. Critical Control Points (CCP)

*   **CCP_ID:** PIE-01 (Кровельный пирог)

    *   **Action:** Контроль правильности монтажа слоев утепленной кровли.

    *   **Instrument:** Визуальный осмотр перед монтажом обрешетки.

    *   **Acceptance Criteria:** Слои уложены в порядке: пароизоляция (изнутри), утеплитель (между стропил, без щелей), гидро-ветрозащита (сверху стропил), вентзазор (контробрешетка), обрешетка.

    *   // _cross-ref: SP17_Roofs.md_

*   **CCP_ID:** FIX-01 (Крепеж покрытия)

    *   **Action:** Выборочный контроль правильности крепления листов металлочерепицы.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Кровельный саморез с EPDM-прокладкой вкручен в НИЖНЮЮ часть волны, перпендикулярно плоскости ската, без перетягивания.

    *   // _cross-ref: Инструкция производителя металлочерепицы_

*   **CCP_ID:** VENT-01 (Вентиляция)

    *   **Action:** Проверка наличия и непрерывности вентиляционных зазоров.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Наличие вентзазора на карнизе (через перфорированную ленту), под коньком и по плоскости ската (контробрешетка высотой 50 мм).

    *   // _cross-ref: SP17_Roofs.md_

## 5. Customization & Trade-offs

| Option ID | Покрытие металлочерепицы | Эстетика | Срок службы, лет | Цена (множитель) |
| ------- | ------- | ------- | ------- | ------- |
| BASE | Полиэстер (PE) | Глянцевая поверхность | 10-15 | x1.0 |
| STANDART | Матовый полиэстер (MPE) | Благородная матовая поверхность | 20-25 | x1.25 |
| PREMIUM | Pural Matt | Текстурированная шелковисто-матовая поверхность | 30-50 | x1.7 |
