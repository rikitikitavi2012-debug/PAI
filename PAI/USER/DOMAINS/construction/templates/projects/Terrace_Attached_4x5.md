## 1. Specification (Bill of Materials, BoM)

# Машиночитаемая спецификация
components:
  - item_code: "FND-PILE-SVS108-2500"
    description: "Винтовая свая для внешних опор, d=108мм, L=2500мм"
    material: "steel_S235"
    coating: "hot_dip_galvanized_80mkm"
    quantity: 6
    unit: "pcs"
    # cross-ref: Foundation_Pile.md

  - item_code: "WD-LARCH-LGR-50-200"
    description: "Опорный брус (лежень), лиственница, сорт АВ"
    material: "larch"
    grade: "AB"
    section_x_mm: 200
    section_y_mm: 50
    length_m: 5
    quantity: 1
    unit: "pcs"
    # cross-ref: SP64_Wooden_Structures.md

  - item_code: "HDW-ANCHOR-CHEM-M12-180"
    description: "Химический анкер для крепления леженя к стене"
    material: "steel_galvanized_class_8.8"
    diameter_mm: 12
    length_mm: 180
    quantity: 10 # Шаг 500 мм
    unit: "pcs"
    # cross-ref: SP15_Masonry_Structures.md

  - item_code: "MTL-FLASH-Z-5000"
    description: "Z-образный гидроизоляционный фартук"
    material: "steel_galvanized_0.5mm"
    length_m: 5
    quantity: 1
    unit: "pcs"

  - item_code: "FIN-DECK-DPK-32-GREY"
    description: "Террасная доска, ДПК, класс 32, цвет 'серый графит'"
    material: "wood_polymer_composite"
    class: "32"
    color: "RAL7024"
    area_sq_m: 20
    quantity: 1
    unit: "set"
    # cross-ref: NORM_17_Terrace_Finishing.md

## 2. Construction Logic (Assembly Sequence)

1.  **Подготовка стены дома:** Демонтаж внешней отделки на высоту 300 мм, разметка оси крепления опорного бруса.

2.  **Монтаж опорного бруса (Ledger Board) к стене.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Расчет анкеров на срез и вырыв" using [SP64_Wooden_Structures.md, SP15_Masonry_Structures.md].
    // - CHECK: "Наличие гидроизоляционного фартука" - **ОБЯЗАТЕЛЬНО**.

3.  **Установка фундамента:** Монтаж 6 винтовых свай для внешнего ряда опор.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Несущая способность сваи" using [Foundation_Pile.md] with input [SP22_Foundations.md, soil_type].

4.  **Сборка каркаса:** Монтаж внешних стоек, балок и лаг пола (сечение 50х150 мм).
    // **VALIDATION_CHECKS:**
    // - CHECK: "Сечение и шаг лаг" (не более 500 мм) using [SP64_Wooden_Structures.md, Algorithm_Floor_Joist_Calc].
    // - CHECK: "Огнебиозащитная обработка" всех скрытых элементов from [NORM_10].

5.  **Монтаж настила и ограждений.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Высота ограждения" == 1.2 м (для высоты террасы > 0.45м) from [NORM_17, Table_17].
    // - CHECK: "Наличие зазоров между досками ДПК" (5-8 мм) from [NORM_17].

## 3. Critical Control Points (CCP)

*   **CCP_ID:** **ATT-01** (Примыкание к стене) - **САМЫЙ ВАЖНЫЙ КОНТРОЛЬ**

    *   **Action:** Контроль монтажа опорного бруса ДО установки лаг.

    *   **Instrument:** Динамометрический ключ, визуальный осмотр.

    *   **Acceptance Criteria:** Затяжка анкеров соответствует проекту; Z-образный фартук заведен ПОД обшивку дома на 100 мм вверх и полностью накрывает верхнюю грань опорного бруса.

    *   // _cross-ref: SP64_Wooden_Structures.md, SP15_Masonry_Structures.md_

*   **CCP_ID:** WTP-01 (Гидроизоляция)

    *   **Action:** Проверка сплошности антисептирования и гидроизоляции.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Все торцы, запилы и отверстия в древесине обработаны антисептиком. Между бетоном фундамента и деревянным ростверком проложен слой рулонной гидроизоляции.

    *   // _cross-ref: SP64_Wooden_Structures.md, SP63_Concrete.md_

*   **CCP_ID:** SEC-01 (Безопасность ограждений)

    *   **Action:** Проверка надежности крепления стоек ограждения к каркасу.

    *   **Instrument:** Приложение горизонтальной нагрузки (50 кг) к верхней части стойки.

    *   **Acceptance Criteria:** Отсутствие видимых деформаций и люфта в узле крепления.

    *   // _cross-ref: NORM_17_

## 4. Customization & Upsell Options

# Пакетные предложения для Клиента
packages:
  - package_id: "BASE"
    name: "Пакет 'Стандарт'"
    description: "Надежная терраса на свайном фундаменте с настилом из ДПК."
    price_multiplier: 1.0
    includes:
      - "Фундамент: Сваи с эмалевым покрытием"
      - "Каркас: Сосна, сорт АВ, обработка антисептиком"
      - "Настил: ДПК, класс 31"

  - package_id: "SEAMLESS_INTEGRATION"
    name: "Пакет 'Единое Пространство'"
    description: "Стираем границу между домом и садом, создавая единую лаунж-зону."
    price_multiplier: 3.0 # Включает стоимость портала и работ по проему
    includes:
      - "Демонтаж оконно-дверного блока и усиление проема"
      - "Установка панорамного раздвижного портала (3х2.2м)"
      - "Настил террасы и пол в прилегающей комнате из идентичного материала (термодоска)"
      - "Пакет 'Всесезонный Комфорт'"

  - package_id: "ALL_SEASON"
    name: "Пакет 'Всесезонный Комфорт'"
    description: "Позволяет использовать террасу с ранней весны до поздней осени."
    price_multiplier: 1.9
    includes:
      - "Установка перголы с моторизированной крышей-жалюзи над террасой"
      - "Монтаж 'мягких окон' (прозрачные ПВХ-шторы) по периметру"
      - "Установка 2-х потолочных инфракрасных обогревателей"
