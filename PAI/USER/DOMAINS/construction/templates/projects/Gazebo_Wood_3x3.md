# Машиночитаемая спецификация
components:
  - item_code: "FND-PILE-SVS108-2500"
    description: "Винтовая свая, d=108мм, L=2500мм"
    material: "steel_S235"
    coating: "hot_dip_galvanized_80mkm" # Горячее цинкование, 80 мкм
    quantity: 9
    unit: "pcs"
    # cross-ref: SP24_Pile_Foundations.md

  - item_code: "WD-PINE-AB-150-150-6000"
    description: "Брус строганый, сосна"
    material: "pine"
    grade: "AB"
    section_x_mm: 150
    section_y_mm: 150
    length_mm: 6000
    quantity: 4 # (для ростверка и стоек)
    unit: "pcs"
    # cross-ref: SP64_Wooden_Structures.md

  - item_code: "RF-HIP-METAL-STANDART"
    description: "Комплект четырехскатной кровли (металлочерепица)"
    # cross-ref: Roof_Gable_Metal.md
    material: "metal_sheet_0.5mm"
    coating: "polyester_25mkm"

## 2. Construction Logic (Assembly Sequence)

1.  **Разметка и установка фундамента.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Несущая способность сваи" using [SP24_Pile_Foundations.md, Algorithm_12] with input [SP22_Foundations.md, soil_type].
    // - CHECK: "Глубина завинчивания" > [NORM_06, depth_of_freezing].

2.  **Монтаж нижней обвязки (ростверка) из бруса 150х150 мм.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Соответствие сечения" using [SP64_Wooden_Structures.md, Table_X].
    // - CHECK: "Качество древесины (сорт, влажность)" using [SP64_Wooden_Structures.md, Section_2.1].

3.  **Установка 4-х угловых стоек из бруса 150х150 мм.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Вертикальность установки" using [SP70_Carrying_Structures.md, Table_18].
    // - CHECK: "Надежность временного крепления" using [SP70_Carrying_Structures.md, Section_5.2].

4.  **Монтаж верхней обвязки и сборка стропильной системы.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Расчетное сечение стропил" using [SP64_Wooden_Structures.md, Algorithm_3] with input [NORM_02, snow_load, wind_load].
    // - CHECK: "Шаг стропил" < max_allowed from [SP17_Roofs.md, Table_Y].

5.  **Монтаж кровельного покрытия.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Соблюдение технологии монтажа" from [Roof_Gable_Metal.md].

6.  **Монтаж настила пола и ограждений.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Высота ограждения" >= 1.2м from [NORM_17, Table_17].

    *   CHECK: "Зазоры между досками настила" using [NORM_17, Algorithm_13].

## 3. Critical Control Points (CCP)

*   **CCP_ID:** FND-01 (Фундамент)

    *   **Action:** Проверить глубину завинчивания каждой из 9 свай.

    *   **Instrument:** Нивелир, измерительная рулетка.

    *   **Acceptance Criteria:** Фактическая глубина должна быть не менее расчетной глубины промерзания для данного региона (см. `NORM_06`).

    *   // _cross-ref: SP24_Pile_Foundations.md_

*   **CCP_ID:** FRM-01 (Каркас)

    *   **Action:** Проверить вертикальность угловых стоек перед фиксацией верхней обвязки.

    *   **Instrument:** Лазерный уровень или строительный уровень длиной 2 м.

    *   **Acceptance Criteria:** Отклонение от вертикали не более 3 мм на всю высоту стойки.

    *   // _cross-ref: SP70_Carrying_Structures.md_

*   **CCP_ID:** FIN-01 (Отделка)

    *   **Action:** Проверить зазоры между досками террасного настила.

    *   **Instrument:** Штангенциркуль или калиброванный шаблон.

    *   **Acceptance Criteria:** Зазор должен составлять 5-8 мм для обеспечения компенсации термического расширения.

    *   // _cross-ref: NORM_17_Terrace_Finishing.md_

## 4. Customization & Upsell Options

# Пакетные предложения для Клиента
packages:
  - package_id: "BASE"
    name: "Пакет 'Стандарт'"
    description: "Надежная и экономичная беседка из качественной сосны."
    price_multiplier: 1.0
    includes:
      - "Каркас: Сосна, сорт АВ"
      - "Фундамент: Сваи с покрытием из двухкомпонентной эмали"
      - "Кровля: Металлочерепица, покрытие полиэстер"

  - package_id: "LIFETIME_PREMIUM"
    name: "Пакет 'Пожизненная Гарантия'"
    description: "Максимальная долговечность и премиальный внешний вид."
    price_multiplier: 1.75
    includes:
      - "Каркас: Лиственница, сорт Экстра"
      - "Фундамент: Сваи с покрытием 'горячий цинк'"
      - "Кровля: Гибкая черепица (двухслойная)"
      - "Крепеж: Нержавеющая сталь А2"
      - "Опция: Встроенная светодиодная подсветка"

  - package_id: "ECO_FRIENDLY"
    name: "Пакет 'Эко-Стиль'"
    description: "Для тех, кто ценит натуральные материалы и гармонию с природой."
    price_multiplier: 1.4
    includes:
      - "Каркас: Клееный брус из северной ели"
      - "Обработка: Натуральные масла и воски"
      - "Кровля: Деревянная дранка или камыш"
