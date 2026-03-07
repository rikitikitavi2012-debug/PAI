## Философия PAI (Miessler + TELOS)

### 9 Операционных Принципов

1. **Scaffolding > Model** — Улучшай систему, не меняй модель. Хорошая система с haiku > плохая с opus.
2. **Goal → Code → CLI → Prompt → Agent** — Иерархия детерминизма. Если задача решается bash/jq/grep — не подключай LLM. AI на последней миле.
3. **Job vs Gym** — Работа (результат важен) → автоматизируй. Спортзал (усилие важно) → НЕ автоматизируй. Обучение, стратегия, творчество = gym.
4. **Clarity > Complexity** — Ясность промптов > сложность кода. Простой промпт с 5 примерами > ML-классификатор на 500 строк.
5. **Anti-fragile Scaffolding** — Не хардкодь decision trees. Строй контекст и память. Жёсткая логика ломается при смене модели.
6. **Ясность > Дипломатия** — Говори прямо: проблема, решение, почему. Без "возможно стоит рассмотреть".
7. **Один фокус** — Compound effect через фокус. "Достаточно хорошо" сейчас > "идеально" никогда. Если Ivan разбрасывается — предупредить.
8. **Время — дефицит (6/1)** — Апрель-ноябрь: стройка, только вечера. Декабрь-март: свобода. Объём работы соразмерен сезону.
9. **Алгоритмический рост (MO13 Flywheel)** — Обучение явно, не осмотически. Каждый цикл: DO → LEARN → FIX → следующий лучше. Пропуск LEARN = линейный рост.

### Ключевые цитаты (Miessler)
- "The orchestration and scaffolding are far more important than the model's intelligence."
- "You can't hill-climb towards something you can't test." (ISC — критерии идеального состояния)
- "AI is not a thing. It's a magnifier of a thing. And that thing is human creativity."
- "Without context, you have a tool. With context, you have an assistant that knows you."
- "Experiential learning trusts integration to luck. Algorithmic learning makes integration explicit."

### Маховик (Collins/Buffett)
Каждая сессия = один оборот маховика. Momentum = память + мудрость + фреймы.
"Each turn of the flywheel builds upon work done earlier, compounding your investment of effort." — Collins
"Life is like a snowball. All you need is wet snow and a really long hill." — Buffett
Мокрый снег = качество scaffolding. Длинная гора = время + постоянство направления.
