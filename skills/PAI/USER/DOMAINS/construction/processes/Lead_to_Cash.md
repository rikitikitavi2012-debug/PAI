# Сквозной бизнес-процесс "От Лида до Оплаты"

> Адаптировано для PAI системы. Оригинал: СТРОЙ-ИНТЕЛЛЕКТ (Perplexity, ноябрь 2024).

**Версия документа:** 1.0
**Статус:** Разработка
**Владелец процесса:** Ivan (Управляющий Менеджер)
**Главный пользователь:** Ivan (через Navi)
**Архитектура:** Гибридная (этапно-событийная) с итерационными циклами и проактивными предложениями.

---

### Этап 1: Квалификация Лида (Lead Qualification)

**Цель:** Получить, проверить, обогатить и квалифицировать первичный запрос для дальнейшей работы.

1. **Событие-триггер:** `Event: LeadReceived`
   * **Описание:** Инициируется Ivan через Navi, когда поступает новый потенциальный заказ.
   * **JSON Schema:**
     ```
     {
       "event_id": "uuid",
       "timestamp": "iso_8601",
       "source": "CRM | email | call | manual",
       "data": {
         "client_name": "string",
         "client_contact": "string (phone|email)",
         "raw_query": "string (e.g., 'хочу беседку 3х3 с мангалом')"
       }
     }
     ```

2. **Обработчики:**
   * Navi: Планирование (Координация):
     * **Действие:** `Action: ParseAndValidateLead`.
     * **Логика:** Парсит `raw_query`. Проводит **Data Sanity Check**: проверяет наличие контактов и минимальную осмысленность запроса. При успехе создает Профиль Проекта (`project_id`) со статусом `NEW`. При провале (спам, неполные данные) — `Event: LeadRejected` с причиной.
     * **Действие:** `Action: RequestProjectProfile`. Запрашивает у Ivan выбор **контекстного профиля** (`Budget`, `Standard`, `Premium`).
   * Navi: Аналитика:
     * **Действие:** `Action: EnrichLeadData`.
     * **Логика:** В фоновом режиме по имеющимся данным (например, коду телефона) определяет регион, анализирует `raw_query` для определения типа объекта (`terrace`, `gazebo` и т.д.).

3. **Обработка нехватки данных:**
   * **Событие:** `Event: AdditionalDataRequired`
   * **Логика:** Если для базового анализа (`EnrichLeadData` или последующего `PerformComplianceCheck`) не хватает критических данных (например, "к чему пристраивать веранду?"), генерируется это событие.
   * **JSON Schema:** `{ "project_id": "uuid", "missing_fields": ["attached_to_building_type", "desired_height"] }`
   * **Результат:** Проект переходит в статус `PENDING_DATA` с таймаутом **24 часа**. Navi формирует запрос Ivan. Если таймаут истекает, генерируется `Event: ActionRequired_Escalation` для привлечения внимания Ivan.

4. **Событие-результат:** `Event: LeadQualified`
   * **Описание:** Лид признан валидным и готовым к предварительному расчету.
   * **JSON Schema:**
     ```
     {
       "project_id": "uuid",
       "context_profile": "Budget | Standard | Premium",
       "enriched_data": {
         "region": "string (e.g., 'RU-LEN')",
         "project_type": "terrace | gazebo | etc."
       }
     }
     ```
   * **Подписчики:** Navi: Нормоконтроль, Navi: Сметный расчёт, Navi: Планирование.

---

### Этап 2: Предварительный расчет и нормоконтроль

**Цель:** Быстро оценить проект на предмет соответствия нормам и порядка стоимости, чтобы отсечь нецелевые запросы.

1. **Событие-триггер:** `Event: LeadQualified`

2. **Обработчики (параллельно):**
   * Navi: Нормоконтроль: `Action: PerformComplianceCheck` — формирует отчет `compliance_report.txt` с базовыми ограничениями.
   * Navi: Сметный расчёт: `Action: GeneratePreliminaryBoM` — формирует черновой перечень материалов `preliminary_bom.csv` на основе подходящего шаблона.
   * Navi: Планирование: `Action: DraftInitialTimeline` — формирует черновой график `draft_timeline.txt`.

3. **Событие-результат:** `Event: PreliminaryEstimateReady`
   * **Описание:** Результаты предварительного анализа собраны.
   * **JSON Schema:**
     ```
     {
       "project_id": "uuid",
       "artifacts": ["compliance_report.txt", "preliminary_bom.csv", "draft_timeline.txt"],
       "analytics_payload": { "calculation_time_sec": 12 }
     }
     ```
   * **Подписчики:** Ivan.

4. **Шлюз контроля:** Navi представляет результаты Ivan, который принимает решение: **Одобрить** (`Event: PreliminaryEstimateApproved`), **Отклонить** (`Event: LeadLost`) или **Запросить правки**.

---

### Этап 3: Детальный Расчет Сметы

**Цель:** Создать точный, версионируемый и проверяемый документ сметы, включающий все работы и материалы.

1. **Событие-триггер:** `Event: PreliminaryEstimateApproved`

2. **Обработчики:**
   * Navi: Сметный расчёт (Ведущий): `Action: GenerateDetailedEstimate` — создает `Смета_v1.0.csv`, которая включает:
     * `SubAction: FinalizeBoM` (финальный список материалов из прайс-листа материалов).
     * `SubAction: FinalizeBoW` (финальный список работ из прайс-листа работ).
   * Navi: Закупки: `Action: ProvideLogisticsCost` — предоставляет стоимость доставки.
   * Navi: Нормоконтроль: `Action: ValidateDetailedCompliance` — проверяет финальную смету на соответствие нормативам.

3. **Шлюз Контроля Сметы:** Navi инициирует `Event: RequestSmetaReview`. Navi: Сметный расчёт, Navi: Нормоконтроль, Navi: Закупки должны подтвердить корректность.

4. **Событие-результат:** `Event: DetailedSmetaApproved`
   * **JSON Schema:**
     ```
     {
       "project_id": "uuid",
       "smeta_artifact": "Smeta_v1.0.csv",
       "smeta_version": "1.0",
       "total_cost": 125000.00,
       "analytics_payload": { "detailed_calculation_time_sec": 45 }
     }
     ```
   * **Подписчики:** Ivan, Navi: Аналитика.

---

### Этап 4: Формирование КП и Клиентская Итерация

**Цель:** Предоставить клиенту коммерческое предложение и гибко отработать его возражения.

1. **Событие-триггер:** `Event: DetailedSmetaApproved`

2. **Обработчики:**
   * Navi: `Action: SynthesizeProposal` — создает `КП_v1.0.pdf` на основе `Сметы_v1.0.csv` и шаблона (шаблоны документов — в планах).
   * Navi: Аналитика: `Action: BenchmarkProposal` — создает `benchmark_report.txt` с детальным сравнением цен по ключевым позициям с рынком.

3. **Шлюз контроля (Ivan):** Утверждает КП для отправки. Проект переходит в статус `PENDING_CLIENT_APPROVAL`.

4. **Петля Обратной Связи от Клиента:**
   * **Сценарий А (Согласен):** Ivan инициирует `Event: ProposalApproved`. **Переход к Этапу 5.**
   * **Сценарий Б (Правки):** Ivan инициирует `Event: ClientRequestsRevision` с `{"reason": "too_expensive", "client_feedback": "можете дешевле на 15%?"}`.
     * Navi: Сметный расчёт, Navi: Закупки, Navi: Аналитика запускают `Action: GenerateProactiveAlternatives` и выдают отчет с вариантами экономии.
     * Ivan выбирает вариант и **процесс возвращается на Этап 3** для генерации `Сметы_v1.1`.
   * **Сценарий В (Отказ):** Ivan инициирует `Event: LeadLost` с `analytics_payload: { "reason": "cost", "stage": 4, "final_offer": 125000 }`.

---

### Этап 5: Контрактация

**Цель:** Юридически закрепить договоренности с клиентом.

1. **Событие-триггер:** `Event: ProposalApproved`

2. **Обработчики:**
   * Navi: Юридическая проверка: `Action: GenerateContract` — создает `Договор.pdf` на основе шаблона (шаблоны документов — в планах).

3. **Шлюз контроля:** Ivan утверждает и передает клиенту Договор.

4. **Событие-результат:** `Event: ContractSigned`. Статус проекта меняется на `IN_PROGRESS`. **Основной процесс Lead_to_Cash.md завершен.**

---

### Этап 6: Управление Изменениями (Post-Contract)

**Цель:** Изолированно и контролируемо обрабатывать любые изменения после подписания договора.

* **Логика:** Данный этап полностью вынесен из Lead_to_Cash.md. Любой запрос на изменение (доп. работы, замена материалов) инициирует `Event: ChangeOrderRequested`, который запускает отдельный бизнес-процесс, описанный в файле **Change_Order.md**.
