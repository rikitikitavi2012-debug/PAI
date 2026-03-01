## 1. Specification (Bill of Materials, BoM)

# Машиночитаемая спецификация
components:
  - item_code: "FND-CONC-B25-W6"
    description: "Бетон для столбчатого фундамента"
    material: "concrete"
    class: "B25"
    options: ["W6", "F200"]
    quantity: 1.2
    unit: "m3"
    # cross-ref: SP63_Concrete.md

  - item_code: "STL-TUBE-PRF-80-80-3"
    description: "Стойка каркаса, труба профильная"
    material: "steel_S235"
    section_x_mm: 80
    section_y_mm: 80
    wall_thickness_mm: 3
    length_mm: 3000
    quantity: 6
    unit: "pcs"
    # cross-ref: SP16_Steel_Structures.md

  - item_code: "STL-TUBE-PRF-80-40-2"
    description: "Прогон/элемент фермы, труба профильная"
    material: "steel_S235"
    section_x_mm: 80
    section_y_mm: 40
    wall_thickness_mm: 2
    quantity: 36 # в метрах погонных
    unit: "m"
    # cross-ref: SP16_Steel_Structures.md

  - item_code: "RF-POLY-CELL-10MM-BRONZE"
    description: "Кровля, сотовый поликарбонат, бронза"
    material: "polycarbonate_cellular"
    thickness_mm: 10
    uv_protection: "true"
    area_sq_m: 19
    quantity: 1
    unit: "set"
    # cross-ref: SP17_Roofs.md

  - item_code: "HDW-ANCHOR-M12-120"
    description: "Анкерный болт для крепления стоек"
    material: "steel_galvanized"
    diameter_mm: 12
    length_mm: 120
    quantity: 24
    unit: "pcs"

## 2. Construction Logic (Assembly Sequence)

1.  **Устройство фундамента:** Бурение скважин и заливка 6-ти столбчатых фундаментов.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Класс бетона" >= B22.5 from [SP63_Concrete.md].
    // - CHECK: "Расчет на ветровую нагрузку (вырыв)" using [NORM_02, wind_load] and [SP16_Steel_Structures.md, anchor_bolt_calculation].

2.  **Монтаж стоек:** Установка 6 стоек из трубы 80х80х3 мм на заранее забетонированные закладные детали.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Вертикальность стоек" с допуском 5 мм на всю высоту from [SP70_Carrying_Structures.md, Table_18].
    // - CHECK: "Момент затяжки болтов" в соответствии с проектной документацией.

3.  **Сборка и монтаж ферм:** Сварка 4-х кровельных ферм из трубы 80х40х2 мм и их монтаж на стойки.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Расчетное сечение элементов фермы" using [SP16_Steel_Structures.md, Algorithm_Steel_Beam] with input [NORM_02, snow_load].
    // - CHECK: "Катет сварных швов" (не менее 4 мм) from [SP16_Steel_Structures.md, Section_14.1].

4.  **Монтаж кровли:** Установка обрешетки и крепление листов сотового поликарбоната с использованием термошайб.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Толщина поликарбоната" >= 10 мм для III снегового района from [SP17_Roofs.md, NORM_02].

    *   CHECK: "Наличие УФ-защитного слоя" (должен быть обращен к солнцу).

## 3. Critical Control Points (CCP)

*   **CCP_ID:** FND-03 (Фундамент)

    *   **Action:** Контроль глубины заложения фундаментов.

    *   **Instrument:** Нивелир, рулетка.

    *   **Acceptance Criteria:** Низ фундамента должен быть ниже расчетной глубины промерзания для региона (см. `NORM_06`).

    *   // _cross-ref: SP22_Foundations.md_

*   **CCP_ID:** WLD-01 (Сварка)

    *   **Action:** Визуальный и инструментальный контроль сварных швов в узлах крепления ферм к стойкам.

    *   **Instrument:** Шаблон сварщика, лупа.

    *   **Acceptance Criteria:** Отсутствие трещин, пор, подрезов. Равномерный катет шва.

    *   // _cross-ref: SP16_Steel_Structures.md_

*   **CCP_ID:** PNT-01 (Защита от коррозии)

    *   **Action:** Контроль качества антикоррозионной обработки (окраски) после монтажа, особенно в местах сварки.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Сплошное покрытие без пропусков и повреждений. Все места "зачистки" сварки должны быть подкрашены.

    *   // _cross-ref: SP16_Steel_Structures.md_

## 4. Customization & Upsell Options

# Пакетные предложения для Клиента
packages:
  - package_id: "BASE"
    name: "Пакет 'Стандарт'"
    description: "Надежный и функциональный навес с кровлей из сотового поликарбоната."
    price_multiplier: 1.0
    includes:
      - "Каркас: Сталь С235 с трехкомпонентной эмалью"
      - "Кровля: Сотовый поликарбонат 10 мм (бронза)"

  - package_id: "STYLE_PREMIUM"
    name: "Пакет 'Современный Стиль'"
    description: "Эстетичный и особо прочный навес с 'воздушной' кровлей."
    price_multiplier: 1.6
    includes:
      - "Замена кровли на монолитный поликарбонат 6 мм (тонированный)"
      - "Покраска каркаса порошковой эмалью в любой цвет по RAL"
      - "Скрытый крепеж кровли"

  - package_id: "COMFORT_PLUS"
    name: "Пакет 'Всепогодная Защита'"
    description: "Максимальная защита автомобиля и комфорт использования."
    price_multiplier: 2.1
    includes:
      - "Пакет 'STYLE_PREMIUM'"
      - "Добавление боковых стенок из поликарбоната на 2/3 высоты"
      - "Интегрированная водосточная система в стойках"
      - "Автоматическое светодиодное освещение с датчиком движения"
