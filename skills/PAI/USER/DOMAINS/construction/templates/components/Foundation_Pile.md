**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования фундамента на винтовых сваях.

---

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "total_load_kN"
    description: "Полная расчетная нагрузка от строения, кН"
    type: integer
    validation_rules:
      - "value > 0"
      - "value < 800" # Технологический предел для данного типа фундамента

  - name: "soil_type_code"
    description: "Код типа грунта по классификатору SP22_Foundations.md"
    type: string
    validation_rules:
      - "value IN ['suglinok_tverdy', 'pesok_plotny', 'glina_polutverdaya']" # Допустимые типы грунтов

  - name: "region_code"
    description: "Код региона для определения климатических параметров из NORM_06"
    type: "string"

  - name: "target_budget"
    description: "Опционально. Целевой бюджет на фундамент, руб."
    type: integer
    is_optional: true

  - name: "target_lifespan_years"
    description: "Опционально. Целевой срок службы, лет."
    type: integer
    is_optional: true

Выходные данные, генерируемые компонентом
output:
  - name: "status"
    description: "Статус выполнения: OK или ERROR"
  - name: "error_message"
    description: "Сообщение об ошибке, если status == ERROR"
  - name: "solution"
    description: "Объект с параметрами решения, если status == OK"
    properties:
      - pile_type: "СВС-108/2500"
      - pile_quantity: 9
      - pile_layout_scheme: "Схема 3x3 с шагом 1.5м"
      - selected_option_id: "PREMIUM"
      - generated_bom: # Сгенерированная спецификация
          - item_code: "FND-PILE-SVS108-2500-HDG"
            quantity: 9
      - dynamic_ccps: ["FND-P-01", "MAT-01"] # Список сгенерированных CCP


## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_pile_foundation (input)

  // 1. Валидация входных данных
  VALIDATE input using validation_rules. IF fails, RETURN {status: "ERROR", message: "Invalid input."}

  // 2. Получение нормативных данных
  depth_of_freezing = GET from [NORM_06] using input.region_code
  soil_capacity = GET from [SP24_Pile_Foundations.md, Table_14] using input.soil_type_code
  IF soil_capacity IS NULL, RETURN {status: "ERROR", message: "Грунт не подходит для свай."}

  // 3. Расчет количества свай
  required_pile_quantity = CEILING(input.total_load_kN / soil_capacity)

  // 4. Выбор оптимальной опции по долговечности и бюджету
  available_options = GET from [Customization_Table]
  best_option = SELECT from available_options WHERE
    (option.price <= input.target_budget OR input.target_budget IS NULL) AND
    (option.lifespan >= input.target_lifespan_years OR input.target_lifespan_years IS NULL)
  ORDER BY price DESC LIMIT 1
  IF best_option IS NULL, best_option = SELECT from available_options WHERE id == 'BASE'

  // 5. Формирование выходных данных
  solution.pile_type = "СВС-108/2500" // Для примера, может быть выбрано из номенклатуры
  solution.pile_quantity = required_pile_quantity
  solution.selected_option_id = best_option.id
  solution.generated_bom = GENERATE_BOM(solution.pile_type, solution.pile_quantity, best_option.coating_code)

  // 6. Генерация динамических CCP
  solution.dynamic_ccps.add("FND-P-01")
  load_factor = (input.total_load_kN / required_pile_quantity) / soil_capacity
  IF (load_factor > 0.9) THEN
    solution.dynamic_ccps.add("FND-P-02") // Добавляем доп. контроль

  RETURN {status: "OK", output: solution}

END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

_Этот раздел теперь не является статичным. Он будет сгенерирован функцией `GENERATE_BOM` на основе результатов расчета и выбора опции._
**Пример для опции `PREMIUM`:**

components:
  - item_code: "FND-PILE-SVS108-2500-HDG"
    description: "Винтовая свая d=108, L=2500, Горячий цинк"
    quantity: 9
    unit: "pcs"
  - item_code: "FND-HEAD-108-200-HDG"
    description: "Оголовок 200х200 для сваи 108, Горячий цинк"
    quantity: 9
    unit: "pcs"

## 4. Critical Control Points (CCP) - Базовые и Динамические

*   **CCP_ID:** FND-P-01 (Глубина) - _Базовый_

    *   **Action:** Контроль глубины завинчивания каждой сваи.

    *   **Instrument:** Нивелир.

    *   **Acceptance Criteria:** Низ лопасти > `depth_of_freezing` из `NORM_06`.

*   **CCP_ID:** FND-P-02 (Несущая способность) - _Динамический (добавляется, если нагрузка на сваю > 90% от расчетной)_

    *   **Action:** Провести пробное завинчивание одной сваи с контролем крутящего момента.

    *   **Instrument:** Гидравлический вращатель с манометром.

    *   **Acceptance Criteria:** Достигнут проектный крутящий момент.

## 5. Customization & Trade-offs

| Option ID | Покрытие | Код для BoM | Срок службы, лет | Множитель цены |
| ------- | ------- | ------- | ------- | ------- |
| BASE | Грунт-эмаль | -GE | 15+ | x1.0 |
| STANDART | Эпоксидное | -EPOXY | 30+ | x1.25 |
| PREMIUM | Горячий цинк | -HDG | 50+ | x1.6 |
