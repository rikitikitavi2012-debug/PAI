## 1. Specification (Bill of Materials, BoM)

# Машиночитаемая спецификация
components:
  - item_code: "FND-STRIP-U-B25-W8"
    description: "Ленточный мелкозаглубленный утепленный фундамент"
    # cross-ref: Foundation_Strip.md
    material: "concrete"
    class: "B25"
    options: ["W8", "F300"]
    insulation: "extruded_polystyrene_100mm"
    quantity: 3.2
    unit: "m3"
    # cross-ref: SP63_Concrete.md

  - item_code: "WALL-FRAME-150-INS-PINE"
    description: "Стеновой каркас с утеплением 150 мм"
    frame_material: "pine_dry_planed_45x145_AB"
    insulation: "basalt_wool_slab_150mm_density_50"
    membranes: ["vapor_barrier_sd20", "wind_diffusion_sd0.02"]
    quantity: 1
    unit: "set"
    # cross-ref: SP64_Wooden_Structures.md

  - item_code: "GLZ-PAN-WARM-PVC70-DblCh"
    description: "Теплое панорамное остекление, ПВХ 70мм"
    # cross-ref: Glazing_Panoramic_Warm.md
    profile: "pvc_70mm_5_chamber_class_A"
    glazing_unit: "double_chamber_40mm_i-glass_argon"
    r_value: 0.78 # Сопротивление теплопередаче
    quantity: 15
    unit: "m2"
    # cross-ref: GOST56926_Windows.md, SP538_Window_Design.md

  - item_code: "RF-SHED-INS-200"
    description: "Комплект утепленной односкатной кровли"
    # cross-ref: Roof_Shed_Poly.md
    insulation: "basalt_wool_slab_200mm_density_45"
    roofing_material: "standing_seam_metal_0.5mm_pural"
    quantity: 1
    unit: "set"

## 2. Construction Logic (Assembly Sequence)

1.  **Устройство утепленного фундамента и "пирога" пола.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Теплотехнический расчет перекрытия (R0)" >= regional_norm from [NORM_Thermal].
    // - CHECK: "Наличие гидроизоляции" по верху фундамента from [SP63_Concrete.md].

2.  **Возведение каркаса стен** с последовательным монтажом ветрозащиты, утеплителя и пароизоляции.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Теплотехнический расчет стены (R0)" >= regional_norm.
    // - CHECK: "Правильность расположения мембран" (пароизоляция изнутри, ветрозащита снаружи).

3.  **Монтаж оконных конструкций** с герметизацией монтажного шва.
    // **VALIDATION_CHECKS:**
    // - CHECK: "Расчет на ветровую нагрузку" для самого большого окна using [SP538_Window_Design.md, Algorithm_11].
    // - CHECK: "Схема монтажного шва" соответствует трехслойной схеме from [SP538_Window_Design.md].

4.  **Сборка утепленной кровли и ее герметичное примыкание к стене дома.**
    // **VALIDATION_CHECKS:**
    // - CHECK: "Расчет сечения стропил" с учетом веса утеплителя и снеговой нагрузки from [SP64_Wooden_Structures.md, NORM_02].
    // - CHECK: "Герметичность узла примыкания" (обязательно использование планки примыкания с герметиком).

## 3. Critical Control Points (CCP)

*   **CCP_ID:** **THM-01** (Тепловой контур) - **ГЛАВНЫЙ КОНТРОЛЬ**

    *   **Action:** Проверка непрерывности и герметичности пароизоляционного контура (пол-стены-потолок) до начала внутренней отделки.

    *   **Instrument:** Визуальный осмотр, специальный скотч для проклейки всех стыков и примыканий.

    *   **Acceptance Criteria:** Единый, неразрывный "мешок" из пароизоляции без повреждений.

    *   // _cross-ref: NORM_Thermal_Engineering_

*   **CCP_ID:** GLAZE-01 (Остекление)

    *   **Action:** Контроль герметичности монтажного шва окон.

    *   **Instrument:** Визуальный осмотр на всех трех слоях.

    *   **Acceptance Criteria:** Внешний слой (ПСУЛ) полностью расширился. Центральный (пена) без пустот. Внутренний (лента) плотно приклеен к раме и стене.

    *   // _cross-ref: SP538_Window_Design.md_

*   **CCP_ID:** **FIRE-01** (Пожарная безопасность)

    *   **Action:** Проверка класса горючести материалов внутренней отделки.

    *   **Instrument:** Проверка сертификатов на материалы.

    *   **Acceptance Criteria:** Класс материалов не ниже КМ2 для путей эвакуации.

    *   // _cross-ref: FZ123_Fire_Safety.md_

## 4. Customization & Upsell Options

# Пакетные предложения для Клиента
packages:
  - package_id: "BASE"
    name: "Пакет 'Теплая Веранда'"
    description: "Полноценное дополнительное помещение для круглогодичного использования."
    price_multiplier: 1.0
    includes:
      - "Стены: каркасные с утеплением 150 мм"
      - "Остекление: ПВХ-профиль 70 мм, двухкамерный стеклопакет"

  - package_id: "HOME_OFFICE_PRO"
    name: "Пакет 'Профессиональный Кабинет'"
    description: "Идеальное рабочее пространство: тихое, светлое и технологичное."
    price_multiplier: 1.5
    includes:
      - "Установка теплого пола (водяной от системы отопления дома)"
      - "Дополнительная звукоизоляция стен и потолка (акустическая вата)"
      - "Встроенная мебель: столешница, полки"
      - "Разводка электрики: 4 блока розеток, управляемое LED-освещение"

  - package_id: "WINTER_GARDEN_LUX"
    name: "Пакет 'Зимний Сад Люкс'"
    description: "Ваша личная оранжерея с автоматизированным микроклиматом."
    price_multiplier: 1.8
    includes:
      - "Остекление: Алюминиевый профиль с терморазрывом"
      - "Стеклопакеты с максимальным светопропусканием (Guardian Light)"
      - "Автоматика: система капельного полива, фитолампы с таймером, датчик влажности"
      - "Пол: керамогранит с трапом для слива воды"
