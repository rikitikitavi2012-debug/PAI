**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования мелкозаглубленного ленточного фундамента (МЗЛФ).

---

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "perimeter_m"
    description: "Общий периметр ленты фундамента, включая внутренние перемычки, м"
    type: float
    validation_rules: ["value > 5"]

  - name: "load_per_meter_kN_m"
    description: "Расчетная погонная нагрузка на фундамент, кН/м"
    type: float
    validation_rules: ["value > 10", "value < 150"]

  - name: "soil_type_code"
    description: "Код типа грунта по классификатору SP22_Foundations.md"
    type: string
    validation_rules: ["value IN ['pesok_plotny', 'suglinok_polutverdy', 'supes_tverdaya']"]

# Ограничения применимости компонента
constraints:
  - "Применять только на непучинистых и слабопучинистых грунтах."
  - "Уровень грунтовых вод (УГВ) должен быть ниже глубины промерзания."

Выходные данные, генерируемые компонентом
output:
  - name: "status"
    description: "Статус выполнения: OK или ERROR"
  - name: "solution"
    description: "Объект с параметрами решения"
    properties:
      - tape_width_mm: 400
      - tape_height_mm: 800
      - concrete_class: "B25"
      - rebar_scheme_code: "RS-4-D12-D8-S300" # 4хD12, хомуты D8 с шагом 300
      - selected_option_id: "PREMIUM"
      - generated_bom: # Сгенерированная спецификация


## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_strip_foundation (input)

  // 1. Валидация входных данных
  VALIDATE input. IF fails, RETURN {status: "ERROR", message: "Некорректные входные данные."}

  // 2. Расчет геометрии ленты
  soil_capacity = GET from [SP22_Foundations.md] using input.soil_type_code
  IF soil_capacity IS NULL, RETURN {status: "ERROR", message: "Грунт не подходит."}

  required_width_mm = (input.load_per_meter_kN_m / soil_capacity) * 1000
  solution.tape_width_mm = ROUND_UP_TO_100(required_width_mm)
  IF solution.tape_width_mm < 300, solution.tape_width_mm = 300 // Минимальная конструктивная ширина

  solution.tape_height_mm = 800 // Для примера, может быть параметризовано

  // 3. Расчет армирования по упрощенной методике
  solution.rebar_scheme_code = CALCULATE_REBAR from [SP63_Concrete.md] using (solution.tape_width_mm, input.load_per_meter_kN_m)

  // 4. Генерация спецификации (BoM)
  solution.generated_bom = GENERATE_BOM(input.perimeter_m, solution, best_option)

  RETURN {status: "OK", output: solution}
END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

**Пример генерации для `perimeter_m: 20`:**

components:
  - item_code: "CONC-B25-W8-F300"
    description: "Бетон товарный B25 W8 F300"
    quantity: 6.4 # 20м * 0.4м * 0.8м
    unit: "m3"
  - item_code: "REBAR-A500C-D12"
    description: "Арматура А500С, d=12 мм (продольная)"
    quantity: 84 # (20м * 4 стержня) + запас 5%
    unit: "m"
  - item_code: "REBAR-A240-D8"
    description: "Арматура А240, d=8 мм (хомуты)"
    quantity: 95 # ((20м / 0.3м) * (0.4*2+0.8*2))
    unit: "m"
  - item_code: "SAND-GRAVEL-MIX"
    description: "Песчано-гравийная смесь для подушки"
    quantity: 3.6 # 20м * 0.6м * 0.3м
    unit: "m3"

## 4. Critical Control Points (CCP)

*   **CCP_ID:** BASE-01 (Основание)

    *   **Action:** Проверка толщины и уплотнения (трамбовки) песчано-гравийной подушки.

    *   **Instrument:** Рулетка, виброплита.

    *   **Acceptance Criteria:** Толщина подушки не менее 300 мм. Отсутствие "зыбкости" при ходьбе.

    *   // _cross-ref: SP22_Foundations.md_

*   **CCP_ID:** REBAR-01 (Армирование)

    *   **Action:** Контроль геометрии арматурного каркаса и правильности установки фиксаторов защитного слоя ПЕРЕД заливкой бетона.

    *   **Instrument:** Рулетка, проверка наличия пластиковых фиксаторов.

    *   **Acceptance Criteria:** Защитный слой от грунта (снизу и сбоку) - 70 мм. Внутри траншеи - 40 мм.

    *   // _cross-ref: SP63_Concrete.md_

*   **CCP_ID:** WTP-F-01 (Гидроизоляция)

    *   **Action:** Контроль укладки рулонной гидроизоляции по верху застывшего фундамента.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Два слоя, без пропусков, с перехлестом полотен не менее 150 мм.

    *   // _cross-ref: SP63_Concrete.md_

## 5. Customization & Trade-offs

| Option ID | Утепление и Защита | Описание | Price Multiplier |
| ------- | ------- | ------- | ------- |
| BASE | Только гидроизоляция | Защита от капиллярной влаги. Цоколь холодный. | x1.0 |
| STANDART | + Утепление цоколя | Добавляется утепление ЭППС по внешней стороне цоколя. Снижает промерзание грунта под лентой. | x1.35 |
| PREMIUM | "Теплый контур" | Утепление цоколя + горизонтальное утепление отмостки + устройство дренажа. Максимальная защита от морозного пучения. | x1.8 |
