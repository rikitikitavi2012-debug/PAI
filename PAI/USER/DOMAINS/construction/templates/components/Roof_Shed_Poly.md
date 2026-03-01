**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования односкатной кровли из поликарбоната.

---

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "rafter_span_m"
    description: "Пролет стропил (длина ската), м"
    type: float
    validation_rules: ["value > 1", "value < 6"] # Ограничение для поликарбоната

  - name: "lathing_step_m"
    description: "Шаг поперечной обрешетки, м"
    type: float
    validation_rules: ["value > 0.4", "value < 1.2"]

  - name: "polycarbonate_type"
    description: "Тип поликарбоната: сотовый или монолитный"
    type: string
    validation_rules: ["value IN ['cellular', 'monolithic']"]

  - name: "snow_load_kPa"
    description: "Нормативная снеговая нагрузка для региона, кПа"
    type: float

# Ограничения применимости компонента
constraints:
  - "Минимальный угол наклона кровли - 6 градусов (10%)."
  - "Не применять в регионах с V и выше снеговым районом для сотового поликарбоната."

Выходные данные, генерируемые компонентом
output:
  - name: "status"
  - name: "solution"
    properties:
      - polycarbonate_thickness_mm: 10 # Расчетная толщина
      - hole_diameter_for_fixing_mm: 13 # Расчетный диаметр отверстия
      - roofing_pie_code: "RP-SHED-POLY-C-V1"
      - generated_bom: # Сгенерированная спецификация


## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_polycarbonate_roof (input)

  // 1. Валидация входных данных
  VALIDATE input. IF fails, RETURN {status: "ERROR", message: "Некорректные входные данные."}

  // 2. Расчет толщины поликарбоната
  // Используется интерполяция по таблицам нагрузок от производителя
  required_thickness = GET from [Manufacturer_Polygal_Datasheet] using (input.lathing_step_m, input.snow_load_kPa)

  IF required_thickness IS NULL, RETURN {status: "ERROR", message: "Шаг обрешетки слишком велик для данной нагрузки."}
  solution.polycarbonate_thickness_mm = required_thickness

  // 3. Расчет отверстий для крепежа (критически важно)
  // Диаметр самореза (стандартно 5.5мм) + запас на расширение
  solution.hole_diameter_for_fixing_mm = 5.5 + 3

  // 4. Генерация спецификации (BoM)
  solution.generated_bom = GENERATE_BOM(solution, input, best_option)

  RETURN {status: "OK", output: solution}
END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

**Пример генерации для `polycarbonate_type: 'cellular'` и площади 20 м2:**

components:
  - item_code: "RF-POLY-CELL-10MM-BRONZE"
    description: "Сотовый поликарбонат, 10 мм, бронза, с УФ-защитой"
    quantity: 21 # в м2 (с учетом подрезки)
    unit: "m2"
  - item_code: "RF-POLY-CONN-H-10MM"
    description: "H-образный неразъемный соединительный профиль, 10 мм"
    quantity: 6 # в м
    unit: "m"
  - item_code: "RF-POLY-END-U-10MM"
    description: "U-образный торцевой профиль, 10 мм"
    quantity: 14 # в м
    unit: "m"
  - item_code: "RF-POLY-THERMOWASHER-30MM"
    description: "Термошайба с ножкой 10мм и EPDM-уплотнителем"
    quantity: 80 # из расчета 4 шт/м2
    unit: "pcs"
  - item_code: "SEAL-TAPE-ALU-UP"
    description: "Сплошная алюминиевая герметизирующая лента для торцов"
    quantity: 7 # в м
    unit: "m"
  - item_code: "SEAL-TAPE-PERF-DOWN"
    description: "Перфорированная лента для торцов"
    quantity: 7 # в м
    unit: "m"

## 4. Critical Control Points (CCP)

*   **CCP_ID:** UV-01 (УФ-Защита) - **КРИТИЧЕСКИЙ КОНТРОЛЬ**

    *   **Action:** Проверка ориентации каждого листа поликарбоната перед монтажом.

    *   **Instrument:** Визуальный осмотр маркировки на защитной пленке.

    *   **Acceptance Criteria:** Пленка с надписью "UV-Protected side" (или аналог) обращена НАРУЖУ (к солнцу). Снятие защитной пленки производится ПОСЛЕ монтажа.

*   **CCP_ID:** FIX-PC-01 (Крепеж)

    *   **Action:** Выборочный контроль затяжки термошайб.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Термошайба затянута до легкого касания листа, без его деформации ("вдавливания"). Лист должен иметь возможность микроподвижек.

*   **CCP_ID:** SEAL-01 (Герметизация сот)

    *   **Action:** Проверка герметизации торцов сотового поликарбоната.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Верхний торец (у стены) заклеен сплошной герметизирующей лентой. Нижний торец (на свесе) -- перфорированной. Оба торца плотно закрыты U-профилем.

## 5. Customization & Trade-offs

| Option ID | Тип поликарбоната | Внешний вид | Прочность | Цена (множитель) |
| ------- | ------- | ------- | ------- | ------- |
| BASE | Сотовый | Рассеянный свет, видны ребра жесткости | Стандартная | x1.0 |
| PREMIUM | Монолитный | Прозрачный, как стекло | Ударопрочный (антивандальный) | x2.5-3.0 |
