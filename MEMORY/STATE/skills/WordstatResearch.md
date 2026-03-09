# WordstatResearch — Workflow

> Сбор реальных частотностей ключевых слов из Yandex Wordstat перед написанием статей.
> Каждая статья должна опираться на Keyword Brief с реальными данными, не на догадки.

---

## Входные данные

| Параметр | Обязательный | Описание |
|----------|-------------|----------|
| Фразы | ✅ | 3-7 фраз для исследования (вариации темы) |
| GeoID | По умолчанию 2 | 2 = Санкт-Петербург |
| Токен | ✅ | Из Secrets Store: YANDEX_WORDSTAT_TOKEN |

---

## API спецификация

**Endpoint:** `https://api.direct.yandex.com/v4/json/`

**Аутентификация:** Bearer token из `YANDEX_WORDSTAT_TOKEN`

**Лимиты:**
- Максимум 10 фраз за один запрос
- Максимум 5 одновременных отчётов
- Обязательно удалять отчёты после использования

---

## Шаги выполнения

### Шаг 1: Создание отчёта (CreateNewWordstatReport)

```json
{
  "method": "CreateNewWordstatReport",
  "params": {
    "Phrases": ["терраса из дерева", "деревянная терраса цена", "терраса спб"],
    "GeoID": [2]
  }
}
```

**Ответ:** `reportId` — ID созданного отчёта

### Шаг 2: Ожидание (3-5 секунд)

Отчёт формируется асинхронно. Ждать перед запросом результатов.

### Шаг 3: Получение данных (GetWordstatReport)

```json
{
  "method": "GetWordstatReport",
  "params": {
    "reportId": "123456"
  }
}
```

**Ответ:** Массив `SearchedWith` с частотностями:
```json
{
  "SearchedWith": [
    {"Phrase": "терраса из дерева", "Shows": 1250},
    {"Phrase": "деревянная терраса", "Shows": 890}
  ]
}
```

### Шаг 4: Удаление отчёта (DeleteWordstatReport)

```json
{
  "method": "DeleteWordstatReport",
  "params": {
    "reportId": "123456"
  }
}
```

**ВАЖНО:** Всегда удалять отчёты после получения данных!

---

## Python пример (code_execution_tool)

```python
import requests
import json
import time

token = "y0__xDvi8OqCBjK3T4gvovN2BZ8VfE9p2IQEcJohhguQ9jHAsDrLw"
endpoint = "https://api.direct.yandex.com/v4/json/"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 1: Create report
phrases = ["терраса timber frame", "фахверк терраса", "timber frame технология"]
payload = {
    "method": "CreateNewWordstatReport",
    "params": {
        "Phrases": phrases,
        "GeoID": [2]  # SPb
    }
}

response = requests.post(endpoint, headers=headers, json=payload)
result = response.json()
report_id = result.get("result", {}).get("reportId")
print(f"Report ID: {report_id}")

# Step 2: Wait
time.sleep(5)

# Step 3: Get results
payload = {
    "method": "GetWordstatReport",
    "params": {"reportId": report_id}
}
response = requests.post(endpoint, headers=headers, json=payload)
data = response.json()

# Parse SearchedWith
searched_with = data.get("result", {}).get("data", [{}])[0].get("SearchedWith", [])
for item in searched_with:
    print(f"{item['Phrase']}: {item['Shows']} shows")

# Step 4: Delete report
payload = {
    "method": "DeleteWordstatReport",
    "params": {"reportId": report_id}
}
requests.post(endpoint, headers=headers, json=payload)
print("Report deleted")
```

---

## Выходные данные: Keyword Brief

После сбора данных сформировать Keyword Brief:

```markdown
## Keyword Brief
**Тема:** [тема статьи]
**Дата:** [дата]
**Регион:** Санкт-Петербург (GeoID: 2)

| Фраза | Частотность (месяц) | Приоритет |
|-------|---------------------|-----------|
| терраса timber frame | 450 | Primary |
| фахверк терраса | 280 | Secondary |
| timber frame технология | 190 | Supporting |

**Рекомендации:**
- Primary keyword в H1 и первом абзаце
- Secondary в одном из H2
- Supporting естественно в тексте
```

---

## Интеграция с WriteArticle

**Этот workflow вызывается на Step 0 в WriteArticle.md**

Ни одна статья не должна публиковаться без Keyword Brief с реальными частотностями.

---

## Ошибки и решения

| Ошибка | Причина | Решение |
|--------|---------|----------|
| 56exceeded | Превышен лимит отчётов | Удалить старые отчёты, подождать |
| 53authorization | Невалидный токен | Проверить YANDEX_WORDSTAT_TOKEN |
| 54notFound | Отчёт не готов | Увеличить время ожидания |
