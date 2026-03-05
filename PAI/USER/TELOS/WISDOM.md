# Мудрость

**Правила, выведенные из жизненного опыта.**

Это не красивые цитаты — это принципы, проверенные практикой.

*Последнее обновление: 2026-03-03*

---

## Личные принципы

### W1: MVP лучше идеала — сделанное лучше идеального
**Источник:** 10+ лет на стройке + опыт запуска проектов. Перфекционизм — враг прогресса.
**Контекст:** C3 (внутренние барьеры). Противоядие от "ещё не готов".

### W2: Не уходи с работы пока свой доход не превысит зарплату
**Источник:** Стратегия ступенчатого роста (S2). Резкий уход без дохода — неоправданный риск.
**Контекст:** B0, M0 (независимость через параллельные проекты, не через прыжок в пустоту).

### W3: Учись руками, не книгами — делай проект, разберёшься по ходу
**Источник:** Вся карьера в tech построена на learn-by-doing. PAI, Agent Zero, вайбкодинг — всё освоено через практику, без курсов.
**Контекст:** B2, S0. PAI учит быстрее любых курсов.

### W4: Имей собственные ресурсы — то, что дают, то и отберут
**Источник:** Опыт жизни в РФ: блокировки, ограничения доступа к AI, зависимость от провайдеров.
**Контекст:** B3, M3 (техно-суверенитет). Государства ограничивают ресурсы — исторический факт.

### W5: Один проект за раз — энергия не распыляется
**Источник:** Осознание проблемы разбрасывания (C3). Много проектов = ни один не доведён.
**Контекст:** RedTeam подтвердил (3/8 агентов): один человек не потянет три трека.

### W6: Не показывай козыри до переговоров — сначала закрепи IP
**Источник:** RedTeam анализ идей (2026-02-20). 4/8 агентов атаковали конфликт интересов.
**Контекст:** I1 (партнёрство с фирмой). Prisoner's dilemma: кто открывается первым — проигрывает.

### W7: Экспертизу нельзя купить, код — можно. Фокусируйся на том, что нельзя
**Источник:** RedTeam анализ. Доменное знание 10+ лет = защитный ров. Код можно делегировать.
**Контекст:** IN-3, IN-8 (агенты RedTeam). B5 (вечные ниши).

### W8: Не доверяй — проверяй
**Источник:** 10+ лет работы прорабом на стройке. Главный урок строительной индустрии.
**Контекст:** Применимо ко всему: к подрядчикам, к материалам, к обещаниям, к собственным допущениям.

### W9: Прораб не кладёт плитку — он организует тех кто кладёт
**Источник:** Инсайт 2026-03-03 при интеграции Jules. Модель управления AI-агентами идентична модели управления бригадой на стройке. Не делай больше сам — управляй большим количеством работы.
**Контекст:** MO6 (делегирование), MO9 (AI Agent Orchestra), S1 (AI-автоматизация). Один дирижёр + несколько специалистов = мультипликатор. Применимо ко всем проектам и целям.

---

## Заимствованная мудрость

### Daniel Miessler (создатель PAI и Fabric)
Причина выбора PAI как системы. Философия, на которой строится наша инфраструктура.

**Система важнее модели (главный принцип):**
> "The orchestration and scaffolding are far more important than the model's intelligence. A well-designed system with an unsophisticated model will outperform a smart model in a poorly-designed system."
> "I've seen haiku outperform opus on many tasks because the scaffolding was good."
— [PAI December 2025](https://danielmiessler.com/blog/personal-ai-infrastructure-december-2025)

**AI — увеличительное стекло, не замена:**
> "AI is not a thing. It's an enabler of a thing. It's a magnifier of a thing. And that thing is human creativity."
— [AI Will 100x Human Creativity](https://danielmiessler.com/blog/ai-will-100x-human-creativity-and-output)

**Hill-climbing через верификацию:**
> "You can't hill-climb towards something you can't test."
> "The trick is making things verifiable. General things. General goals."
— [Generalized Hill-Climbing](https://danielmiessler.com/blog/nobody-is-talking-about-generalized-hill-climbing)

**Ясность > технология:**
> "My strong intuition is that prompting is the center mass of AI. Not RAG, not fine-tuning, and increasingly — not even the models."
— [AI is Mostly Prompting](https://danielmiessler.com/blog/ai-is-mostly-prompting)

**Контекст превращает инструмент в ассистента:**
> "Without context, you have a tool. With context, you have an assistant that knows you."
— [Building a PAI](https://danielmiessler.com/blog/personal-ai-infrastructure)

**TELOS — цель до технологий:**
> "Figure out your Telos... Define your purpose, your goals, your challenges, and the life you're building toward."
— [How My Projects Fit Together](https://danielmiessler.com/blog/how-my-projects-fit-together)

**Алгоритмическое обучение:**
> "Experiential learning trusts integration to luck, chance and time. Algorithmic learning makes integration explicit."
— [Algorithmic Learning](https://danielmiessler.com/blog/algorithmic-learning)

**Активация — не автоматизация:**
> "Most of humanity is not activated... People have been taught that there are special people who have ideas worth sharing."
> "There are too many Spielbergs working night shift at Walmart."
— [Cognitive Revolution Podcast](https://www.cognitiverevolution.ai/pioneering-pai-how-daniel-miessler-s-personal-ai-infrastructure-activates-human-agency-creativity/)

**Код до промптов (иерархия):**
> Goal → Code → CLI Tool → Prompt → Agent. "If you can solve it with a bash script, don't use AI."
— [PAI README](https://github.com/danielmiessler/Personal_AI_Infrastructure)

**Не автоматизируй "спортзал":**
> Outsource where outcomes matter (jobs); never automate activities where effort itself provides value (gym).
— [Ideas](https://danielmiessler.com/ideas)

**Таймлайн:**
> "I suspect that by 2028 what I am saying will be undeniable, and by 2030 it will be an emergency."
— [AI Changes 2026](https://danielmiessler.com/blog/ai-changes-2026)

*Полная коллекция: `~/.claude/MEMORY/RESEARCH/2026-03/miessler-philosophy.md`*

### Jim Collins (Good to Great, Flywheel)
Концепция маховика — почему momentum важнее скорости.

> "No matter how dramatic the end result, good-to-great transformations never happen in one fell swoop. There was no single defining action, no grand program, no one killer innovation, no solitary lucky break, no miracle moment."
— Good to Great (2001)

> "Each turn of the flywheel builds upon work done earlier, compounding your investment of effort."
— Turning the Flywheel (2019)

*Применение: PAI не появился за день. Каждая сессия — один оборот маховика. Momentum = MEMORY + WISDOM + FRAMES.*

### Warren Buffett (The Snowball, Compounding)
Сложный процент — единственная сила, работающая пока ты спишь.

> "Life is like a snowball. All you need is wet snow and a really long hill."
— The Snowball: Warren Buffett and the Business of Life (2008)

> "The first rule of compounding: never interrupt it unnecessarily."
— приписывается Чарли Мангеру (партнёр Баффетта)

*Применение: "Мокрый снег" = качество scaffolding (hooks, skills, TELOS). "Длинная гора" = время + постоянство направления. Не прерывай маховик сменой фокуса.*

### Navi
Сначала точим топор, потом рубим дерево.

---

## Принципы, которые ещё не сформулированы

- Личная поговорка / фраза — подумать на досуге
- Уроки из конкретных проектов на стройке
- Принципы отношений с людьми

---

*Добавлять по мере появления новых уроков. Мудрость — не коллекция, а рабочий инструмент.*
