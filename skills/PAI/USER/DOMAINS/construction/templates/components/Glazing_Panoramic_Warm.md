**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования "теплого" панорамного остекления.

---

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "width_mm"
    description: "Ширина проема, мм"
    type: integer
    validation_rules: ["value > 500", "value < 3500"]

  - name: "height_mm"
    description: "Высота проема, мм"
    type: integer
    validation_rules: ["value > 500", "value < 2800"]

  - name: "required_r_value"
    description: "Требуемое сопротивление теплопередаче, м2*С/Вт"
    type: float
    validation_rules: ["value >= 0.55"]

  - name: "wall_material_type"
    description: "Тип материала стены для подбора крепежа"
    type: string
    validation_rules: ["value IN ['wood_frame', 'concrete_heavy', 'brick_hollow', 'gas_block_d500']"]

  - name: "wind_load_kPa"
    description: "Нормативная ветровая нагрузка, кПа"
    type: float

Выходные данные, генерируемые компонентом
output:
  - name: "status"
  - name: "solution"
    properties:
      - profile_system_code: "PVC-76-6" # 6-камерный ПВХ профиль 76мм
      - glazing_unit_formula: "6i-16Ar-4-16Ar-4i" # СПД 46мм с закаленным наружным стеклом
      - achieved_r_value: 0.82
      - generated_bom: # Сгенерированная спецификация

## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_warm_glazing (input)
  // 1. Поиск оптимального решения (профиль + стеклопакет)
  best_solution = FIND_OPTIMAL from [Glazing_Database] WHERE (solution.r_value >= input.required_r_value) ORDER BY price ASC LIMIT 1
  IF best_solution IS NULL, RETURN {status: "ERROR", message: "Невозможно достичь требуемого R0 с текущей базой данных."}

  // 2. Проверка на ветровую нагрузку и прогиб
  deflection = CALCULATE_DEFLECTION from [SP538_Window_Design.md] using (input.width, input.height, input.wind_load, best_solution.glass_thickness)
  IF deflection > max_allowed_deflection THEN
    // Пробуем усилить конструкцию: сначала закаленное стекло, потом увеличение толщины
    best_solution = FIND_OPTIMAL with (tempered_glass=true)
    IF still fails, best_solution = FIND_OPTIMAL with (glass_thickness_plus=2mm)
    IF still fails, RETURN {status: "ERROR", message: "Превышен допустимый прогиб. Требуется разделение проема импостом."}
  END IF

  // 3. Подбор крепежа и генерация BoM
  fasteners = GET_FASTENERS from [Hardware_DB] using (input.wall_material_type)
  solution.generated_bom = GENERATE_BOM(best_solution, fasteners, input.width, input.height)

  RETURN {status: "OK", output: solution}
END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

**Пример генерации для окна 2000х2500 мм:**

components:
  - item_code: "GLZ-PVC76-6i-16Ar-4-16Ar-4i"
    description: "Окно ПВХ 76мм, СПД 46мм (6i-16Ar-4-16Ar-4i)"
    quantity: 1
    unit: "pcs"
  - item_code: "FIX-NAGEL-10-182"
    description: "Нагель для монтажа в бетон/кирпич, 10х182 мм"
    quantity: 10 # из расчета шага 700 мм
    unit: "pcs"
  - item_code: "SEAL-PSUL-15-4_8"
    description: "Лента ПСУЛ (предварительно сжатая самоуплотняющаяся), 15мм, для шва 4-8мм"
    quantity: 9 # периметр окна
    unit: "m"
  - item_code: "SEAL-FOAM-PRO-WINTER"
    description: "Профессиональная монтажная пена (зимняя формула)"
    quantity: 2
    unit: "pcs"
  - item_code: "SEAL-VAPOR-TAPE-IN-FULL"
    description: "Пароизоляционная лента для внутреннего шва (сплошная)"
    quantity: 9
    unit: "m"

## 4. Critical Control Points (CCP)

*   **CCP_ID:** JOINT-01 (Монтажный шов) - **КРИТИЧЕСКИЙ**

    *   **Action:** Поэтапный контроль устройства трехслойного монтажного шва.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Наружный слой (ПСУЛ) плотно прилегает к четверти проема. Центральный (пена) сплошной, без пустот. Внутренний (пароизоляционная лента) герметично приклеен к профилю окна и стене.

    *   // _cross-ref: SP538_Window_Design.md, ГОСТ 30971-2012_

*   **CCP_ID:** GEOM-01 (Геометрия и зазоры)

    *   **Action:** Проверка вертикальности, горизонтальности и равномерности зазоров между рамой и проемом.

    *   **Instrument:** Лазерный уровень, рулетка.

    *   **Acceptance Criteria:** Отклонение от уровня не более 1.5 мм на 1 м. Монтажные зазоры по бокам и сверху в пределах 15-40 мм.

## 5. Customization & Trade-offs

| Option ID | Материал профиля | Внешний вид / Статус | Теплоизоляция (R0) | Цена (множитель) |
| ------- | ------- | ------- | ------- | ------- |
| BASE | ПВХ (Поливинилхлорид) | Стандарт, надежно | ***  | x1.0 |
| STANDART | Дерево (клееный брус) | Натуральный, престижно | ****  | x1.8 |
| PREMIUM | "Теплый" алюминий | Современный хай-тек, элитно | ***** | x2.5 |
