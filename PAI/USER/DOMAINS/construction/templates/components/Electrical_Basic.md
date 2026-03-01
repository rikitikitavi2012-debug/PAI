**Version:** 2.1
**Last Updated:** 2025-11-03
**Description:** Интеллектуальный компонент для автоматизированного расчета и проектирования базовой электрической сети (до 15 кВт).

## 1. Input/Output Parameters & Validation

# Входные параметры с правилами самовалидации
input:
  - name: "consumers"
    description: "Массив потребителей с указанием типа, мощности и расположения"
    type: array
    # Пример: {id: "S1", type: "socket", power_W: 2200, location: "veranda_outdoor"}
  - name: "wall_material_type"
    description: "Тип материала стен для выбора способа прокладки кабеля"
    type: string
    validation_rules: ["value IN ['wood_frame', 'concrete', 'brick']"]

# Ограничения применимости компонента
constraints:
  - "Только для однофазной сети 230В."
  - "Общая расчетная мощность не более 15 кВт."

Выходные данные, генерируемые компонентом
output:
  - name: "status"
  - name: "solution"
    properties:
      - total_power_kW: 4.5
      - circuit_count: 3
      - circuit_list: # Сгенерированный список групп (однолинейная схема)
          - {group_id: "G1", name: "Освещение", consumers: ["L1","L2"], cable: "ВВГнг(А)-LS 3х1,5", breaker: "C10A", rcd_required: false}
          - {group_id: "G2", name: "Розетки внутренние", consumers: ["S1","S2"], cable: "ВВГнг(А)-LS 3х2,5", breaker: "C16A", rcd_required: true}
          - {group_id: "G3", name: "Розетки уличные", consumers: ["S3"], cable: "ВВГнг(А)-LS 3х2,5", breaker: "C16A", rcd_required: true}
      - generated_bom: # Сгенерированная спецификация

## 2. Calculation & Logic Block (Исполняемый псевдокод)

FUNCTION calculate_electrical_system (input)
  // 1. Распределение потребителей по группам (световые, розеточные, силовые)
  groups = DISTRIBUTE_CONSUMERS(input.consumers)

  // 2. Расчет параметров для каждой группы
  FOR each group IN groups:
    group.total_power_W = SUM(consumer.power_W)
    group.calculated_current_A = group.total_power_W / 230

    // Подбор сечения кабеля и автомата по таблицам ПУЭ
    group.cable_section = GET_CABLE from [PUE_Table_1.3.4] using (group.calculated_current_A)
    group.breaker_nominal = GET_BREAKER from [PUE_Tables] using (group.cable_section)

    // Проверка необходимости УЗО/АВДТ
    IF group.type == 'socket' OR group.location == 'outdoor' OR group.location == 'wet_zone' THEN
      group.rcd_required = true
    END IF

  // 3. Генерация BoM
  solution.generated_bom = GENERATE_BOM(groups, input.wall_material_type)

  RETURN {status: "OK", output: solution}
END FUNCTION

## 3. Specification (BoM) - Генерируется динамически

**Пример генерации для 3-х групп:**

components:
  - item_code: "CBL-VVGNG-LS-3X2.5"
    description: "Кабель силовой ВВГнг(А)-LS 3х2,5"
    quantity: 45 # в метрах, с учетом запаса
    unit: "m"
  - item_code: "CBL-VVGNG-LS-3X1.5"
    description: "Кабель силовой ВВГнг(А)-LS 3х1,5"
    quantity: 30
    unit: "m"
  - item_code: "RCBO-1P-N-C16-30MA-A"
    description: "АВДТ 1P+N, 16А, характ. C, 30мА, тип А (для розеток)"
    quantity: 2
    unit: "pcs"
  - item_code: "CB-1P-C10A"
    description: "Автоматический выключатель 1P, 10А, характ. C (для света)"
    quantity: 1
    unit: "pcs"
  - item_code: "CONDUIT-D20-PVC"
    description: "Труба гофрированная ПВХ d20мм с протяжкой"
    quantity: 75
    unit: "m"

## 4. Critical Control Points (CCP)

*   **CCP_ID:** GROUND-01 (Заземление) - **КРИТИЧЕСКИЙ**

    *   **Action:** Проверка целостности защитного проводника (PE, желто-зеленый) от клеммы в щитке до КАЖДОЙ розетки, светильника и металлического корпуса.

    *   **Instrument:** Мультиметр в режиме "прозвонки".

    *   **Acceptance Criteria:** Наличие звукового сигнала (сопротивление близко к нулю) между PE-шиной щитка и PE-контактом конечной точки.

*   **CCP_ID:** CONNECT-01 (Соединения)

    *   **Action:** Контроль соединений в распределительных коробках.

    *   **Instrument:** Визуальный осмотр.

    *   **Acceptance Criteria:** Соединения выполнены ТОЛЬКО методом пайки, опрессовки гильзами или с помощью сертифицированных клеммников (WAGO, винтовые зажимы). **Любые скрутки категорически ЗАПРЕЩЕНЫ.**

*   **CCP_ID:** RCD-TEST-01 (Проверка УЗО/АВДТ)

    *   **Action:** Функциональная проверка каждого устройства защитного отключения.

    *   **Instrument:** Нажатие кнопки "ТЕСТ" на лицевой панели устройства.

    *   **Acceptance Criteria:** Устройство должно мгновенно отключить свою группу. Проверку проводить после полной сборки щита и подачи напряжения.

## 5. Customization & Trade-offs

| Option ID | Защитная автоматика | Уровень безопасности | Цена (множитель) |
| ------- | ------- | ------- | ------- |
| BASE | Групповые УЗО + Автоматы | Стандарт ПУЭ | x1.0 |
| STANDART | АВДТ на каждую группу | Повышенная надежность | x1.5 |
| PREMIUM | АВДТ + Реле контроля напряжения | Максимальная защита от скачков в сети | x1.9 |
