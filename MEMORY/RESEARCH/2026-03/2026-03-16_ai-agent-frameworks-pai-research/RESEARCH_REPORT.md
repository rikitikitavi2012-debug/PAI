# Extensive Research: Передовые AI Agent фреймворки и техники для PAI

**Дата:** 2026-03-16
**Режим:** Extensive (9 направлений поиска, 27+ запросов)
**Цель:** Определить лучшие техники, архитектуры и инновации для создания лучшей персональной AI-инфраструктуры

---

## Executive Summary

Ландшафт AI-агентов в начале 2026 переживает взрывной рост. Ключевые тренды: (1) самоулучшающиеся агенты через эпизодическую память и RL без обновления весов, (2) spec-driven development вместо "vibe coding", (3) context engineering как отдельная дисциплина с 4 стратегиями, (4) Agent-as-a-Judge для самооценки, (5) multi-agent системы с изоляцией контекста превосходят single-agent на 90%. PAI уже реализовал многие передовые паттерны (hooks, skills, FRAMES, Algorithm), но есть 6 конкретных архитектурных возможностей для значительного улучшения.

---

## 1. Самоулучшающиеся агентские системы

### 1.1 OpenHands (ex-OpenDevin)
- **Архитектура CodeAct 1.0:** LLM-рассуждение встроено в единую coding control plane, поддержка сессионного контекста проекта
- **Паттерн:** задачи декомпозируются в упорядоченные action loops, которые создают и валидируют промежуточные артефакты, затем итерируют по ошибкам
- **Ключевое:** эквивалент structured chain-of-thought + ReAct decision loops
- [OpenHands](https://openhands.dev/) | [GitHub](https://github.com/OpenHands/OpenHands) | [Arxiv](https://arxiv.org/abs/2407.16741)

### 1.2 OpenSage: Self-Programming Agent Generation Engine (Февраль 2026)
- **Первый ADK, где AI создает агентов автоматически** с самогенерируемой топологией и toolsets
- **Вертикальная топология:** декомпозиция сложной задачи в последовательные подзадачи через специализированных sub-agents
- **Горизонтальная топология:** несколько sub-agents выполняют одну задачу разными планами, затем merge через agent ensemble
- **Автоматическое создание инструментов** во время выполнения (скрипты, анализаторы, генераторы)
- **Иерархическая граф-память** для эффективного управления
- **#1 на CyberGym и Terminal-Bench 2.0**
- [OpenSage](https://www.opensage-agent.ai/) | [Arxiv](https://arxiv.org/abs/2602.16891)

### 1.3 MemRL: Self-Evolving Agents (Январь 2026)
- **Разделение стабильного LLM-рассуждения и пластичной памяти:** frozen LLM + evolving memory с Q-values
- **Two-Phase Retrieval:** фильтрация кандидатов по семантической релевантности, затем выбор по learned utility (Q-values)
- **Решает stability-plasticity dilemma:** непрерывное улучшение без обновления весов модели
- **Превосходит все baselines** на HLE, BigCodeBench, ALFWorld, Lifelong Agent Bench
- [MemRL](https://arxiv.org/abs/2601.03192) | [GitHub](https://github.com/MemTensor/MemRL)

### 1.4 Voyager Pattern (Skill Library)
- **Три компонента:** автоматический curriculum, растущая skill library исполняемого кода, итеративный prompting с environment feedback
- **Skills temporally extended, interpretable, compositional** — составной рост способностей агента
- **Ключевой паттерн:** успешные action sequences кодифицируются для будущего использования
- [Voyager](https://voyager.minedojo.org/)

### 1.5 ACE: Agentic Context Engineering (Октябрь 2025)
- **Три роли:** Generator (создает trajectories), Reflector (извлекает insights из ошибок), Curator (обновляет Playbook)
- **Playbook как центральный репозиторий стратегий** — grow-and-refine, delta-edits вместо монолитных перезаписей
- **+10.6% на agent tasks, +8.6% на domain benchmarks** без fine-tuning
- **Предотвращает context collapse** — потерю важной контекстной информации со временем
- [ACE Paper](https://arxiv.org/abs/2510.04618) | [GitHub](https://github.com/ace-agent/ace)

**Релевантность для PAI:** PAI уже реализует элементы Voyager (SKILL.md, skill library) и ACE (FRAMES как playbook, Algorithm как decision loop). Рекомендуется: (1) внедрить MemRL-подобную Q-value оценку для memory retrieval, (2) формализовать Reflector/Curator цикл в Algorithm, (3) рассмотреть горизонтальную топологию OpenSage для сложных задач.

---

## 2. Декомпозиция целей и верификация

### 2.1 Microsoft CORPGEN (Февраль 2026)
- **Трёхуровневая декомпозиция:** Strategic Objectives (Monthly) -> Tactical Plans (Daily) -> Operational Actions (Per-Cycle)
- **Sub-agent isolation** для предотвращения memory contamination
- **Tiered memory:** working, structured, semantic
- **Adaptive summarization** для управления token limits
- **Experiential learning** (хранение записей о выполненных задачах) — главный фактор улучшения: с 8.7% до 15.2%
- [CORPGEN](https://www.microsoft.com/en-us/research/blog/corpgen-advances-ai-agents-for-real-work/) | [Arxiv](https://arxiv.org/abs/2602.14229)

### 2.2 Kiro: Spec-Driven Development (Amazon, 2025-2026)
- **Формализация спецификаций до генерации кода:** requirements.md -> design.md -> код
- **Agent hooks** — автоматические триггеры, выполняющие действия агента при специфических событиях
- **Автономный агент** может работать днями без вмешательства
- **Anti-vibe-coding:** формальные спецификации вместо итеративного угадывания
- [Kiro](https://kiro.dev/) | [TechCrunch](https://techcrunch.com/2025/12/02/amazon-previews-3-ai-agents-including-kiro-that-can-code-on-its-own-for-days/)

### 2.3 Zylos Research: Long-Running AI Agents
- **Длительность задач удваивается каждые 7 месяцев** — агенты уже выполняют 2-часовые задачи автономно
- **Прогноз:** 8-часовой рабочий день к концу 2026
- **Ключевая проблема:** агенты отмечают features как complete без proper testing — топовый reliability issue
- [Zylos Research](https://zylos.ai/research/2026-01-16-long-running-ai-agents)

**Релевантность для PAI:** ISC-система PAI — одна из самых продвинутых реализаций goal decomposition. Рекомендации: (1) добавить CORPGEN-подобное experiential learning — хранить паттерны успешных ISC-наборов, (2) внедрить трёхуровневую временную декомпозицию (strategic/tactical/operational), (3) формализовать anti-vibe-coding через обязательные spec-файлы для крупных задач.

---

## 3. Управление контекстом и качеством сессий

### 3.1 ACON: Agent Context Optimization (2025)
- **Двухэтапная оптимизация:** Utility Maximization (сохранить полезное) + Compression Maximization (сжать остальное)
- **Анализ парных траекторий:** когда полный контекст работает, а сжатый — нет, LLM анализирует причины и обновляет guidelines
- **Результат:** снижение peak tokens на 26-54% при сохранении >95% точности
- **Дистилляция в маленькие модели** для снижения overhead
- [ACON](https://arxiv.org/abs/2510.00615)

### 3.2 LangChain Context Engineering: 4 стратегии
- **Write:** сохранение контекста вне context window (scratchpad, notes)
- **Select:** извлечение релевантного контекста для текущей задачи
- **Compress:** конденсация информации без потери критического смысла
- **Isolate:** разделение контекста между sub-agents — **Anthropic's multi-agent researcher: много агентов с изолированными контекстами >> один агент**
- [LangChain Blog](https://blog.langchain.com/context-engineering-for-agents/) | [GitHub](https://github.com/langchain-ai/context_engineering)

### 3.3 Context Rot и Lost in the Middle
- **При 32,000 токенов:** 11 из 12 моделей падают ниже 50% от short-context performance
- **GPT-4:** 15.4% деградация при расширении с 4,000 до 128,000 токенов
- **"Lost in the Middle":** длинные контексты с trial-and-error логами отвлекают модель
- [Redis Blog](https://redis.io/blog/context-window-overflow/)

### 3.4 Focus Agent (2025-2026)
- **Биологическая инспирация:** агент автономно решает когда консолидировать learnings в persistent "Knowledge" block
- **Активный withdrawal** сырой истории взаимодействий
- **Результат:** 22.7% экономия токенов при сохранении accuracy

### 3.5 Deep Agents (LangChain, Март 2026)
- **Три техники сжатия с разной частотой:** offloading крупных tool results в файловую систему, offloading крупных tool inputs при превышении порога контекста
- **Context bloat** — фундаментальная проблема: subagents изолируют контекст от основного агента
- [LangChain Deep Agents](https://blog.langchain.com/context-management-for-deepagents/)

**Релевантность для PAI:** /compact уже реализует compression, но не использует ACON-подобную оптимизацию guidelines. Рекомендации: (1) внедрить Write+Select из LangChain — формализовать scratchpad/Knowledge block, (2) добавить ACON-подобный анализ «что потеряно при compression», (3) усилить Isolate — использовать subagents для context-heavy задач, (4) автоматический offload tool results в файловую систему при превышении порога.

---

## 4. Мульти-агентная оркестрация

### 4.1 Anthropic Multi-Agent Research System
- **Opus 4 lead + Sonnet 4 subagents = +90.2%** vs single-agent Opus 4
- **LeadResearcher:** анализирует запрос, разрабатывает стратегию, spawn subagents для параллельного исследования
- **Каждый Subagent:** независимый web search, interleaved thinking, возврат findings
- **CitationAgent:** обработка документов и отчёта для цитирования
- **Принцип:** каждый subagent получает objective, output format, guidance on tools, clear task boundaries
- [Anthropic Engineering](https://www.anthropic.com/engineering/multi-agent-research-system)

### 4.2 Сравнение фреймворков (2026)
| Framework | Паттерн | Сильные стороны | Слабые стороны |
|-----------|---------|----------------|----------------|
| **LangGraph** | Directed graph + conditional edges | Production-grade state management, checkpointing, time travel | Крутая кривая обучения |
| **CrewAI** | Role-based crews | Простой старт (20 строк), DSL | Нет checkpointing, limited agent-to-agent comms |
| **AG2 (AutoGen)** | Event-driven GroupChat | Async-first, pluggable strategies | Дорогой: 4 агента x 5 раундов = 20 LLM calls minimum |
| **OpenAI Swarm** | Lightweight handoffs | Минимальная абстракция | Experimental, не для production |

### 4.3 Production Patterns
- Teams начинающие с CrewAI часто мигрируют на LangGraph для production
- **Event-driven > polling:** Kafka + Flink + MCP + A2A для масштабируемых real-time agents
- **Key insight:** координация через shared task list + claim system предотвращает duplicate work

**Релевантность для PAI:** PAI уже реализует multi-agent orchestration через teams/tasks/subagents. Рекомендации: (1) изучить LangGraph checkpointing с time-travel для recovery сессий, (2) формализовать claim system для предотвращения duplicate work, (3) рассмотреть event-driven архитектуру вместо polling для inter-agent communication.

---

## 5. Оценка и самооценка агентов

### 5.1 Agent-as-a-Judge (2025-2026)
- **Агент-судья** имеет те же capabilities что и оцениваемый агент: tool use, memory, multi-step reasoning
- **Оценивает всю траекторию,** не только финальный результат
- **Intermediate steps:** direct assessment reasoning и search actions на каждом шаге
- **90% agreement с human experts** (vs 70% для LLM-as-a-Judge)
- [ICML 2025 Paper](https://icml.cc/virtual/2025/poster/45485) | [Survey](https://arxiv.org/abs/2601.05111)

### 5.2 Ключевые бенчмарки (2026)
- **SWE-bench Verified:** human-validated subset для реалистичной оценки coding agents
- **AgentBench:** 8 environment (OS, DB, KG, games, web) — планирование, reasoning, tool use
- **Cline Bench:** repository-based development environments (ноябрь 2025)
- **Terminal-Bench:** командная строка, multi-step workflows
- **OSWorld Verified:** снижение labeling noise, разделение grounding vs planning errors

### 5.3 Тренд: Разделение типов ошибок
- **Grounding errors** (неправильное взаимодействие с окружением) vs **Planning errors** (неправильная стратегия)
- **Top reliability issue:** агенты отмечают features как complete без testing

**Релевантность для PAI:** ISC-верификация PAI — уже шаг в направлении Agent-as-a-Judge. Рекомендации: (1) формализовать Agent-as-a-Judge — запускать отдельного агента для оценки ISC completion, (2) разделить grounding vs planning errors в post-mortem анализе, (3) добавить intermediate step evaluation в Algorithm.

---

## 6. Память и управление знаниями

### 6.1 CoALA: Cognitive Architectures for Language Agents
- **Фундаментальная модель:** Working Memory + Long-Term Memory (Episodic + Semantic + Procedural)
- **Action space:** Internal (retrieval, reasoning, learning) + External (grounding)
- **Decision loop:** Planning (reasoning + retrieval -> propose -> evaluate -> select) -> Execution
- [CoALA](https://arxiv.org/abs/2309.02427)

### 6.2 Трёхтипная память (Mem0, IBM, 2026)
- **Episodic:** что произошло (trajectories: states, actions, outcomes) — case-based reasoning
- **Semantic:** что я знаю (факты, знания о мире) — knowledge graphs
- **Procedural:** как делать (skills, habits, workflows) — executable code/instructions

### 6.3 MemEvolve, Hindsight, Agentic Memory (2025-2026)
- **MemEvolve:** мета-эволюция memory систем
- **Hindsight 20/20:** динамическая процедурная память, retain-recall-reflect
- **Agentic Memory:** unified long-term + short-term management для LLM agents

### 6.4 Reflexion Pattern
- **После провала задачи:** агент пишет natural language post-mortem, prepend к промпту при следующей попытке
- **Без gradient updates, reward model** — просто текстовый файл self-critiques
- **Систематическая коррекция ошибок** через текстовую память

### 6.5 ICLR 2026 Workshop: MemAgents
- **Целая workshop по памяти для LLM-агентов** на ICLR 2026
- Тема: mechanisms, evaluation, emerging frontiers

**Релевантность для PAI:** FRAMES уже реализует элементы procedural + semantic memory. Рекомендации: (1) формализовать трёхтипную память CoALA: episodic (events.jsonl), semantic (WISDOM), procedural (skills) — PAI уже близок, но не формализован, (2) внедрить Reflexion-подобный post-mortem для failed tasks, (3) добавить Q-value scoring из MemRL для memory retrieval.

---

## 7. Передовые инструменты и проекты Q1 2026

### 7.1 Claude Code
- **Agent Skills** (декабрь 2025) — открытый стандарт SKILL.md через agentskills.io
- **Advanced Tool Use:** Tool Search Tool (85% экономия токенов), Programmatic Tool Calling, Tool Use Examples
- **Multi-agent:** Opus lead + Sonnet subagents = +90.2%
- **MCP** как de-facto стандарт подключения агентов к tools и data
- [Claude Code Docs](https://code.claude.com/docs/en/skills) | [Anthropic Engineering](https://www.anthropic.com/engineering/advanced-tool-use)

### 7.2 Google Antigravity (Ноябрь 2025)
- **Agent-first IDE:** fork VS Code, два режима — Editor view + Manager view
- **Manager view:** оркестрация множества агентов параллельно через workspaces
- **AgentKit 2.0:** 16 специализированных агентов, 40+ domain-specific skills, 11 pre-configured commands
- **Learning as core primitive:** агенты сохраняют полезный контекст в knowledge base
- **Artifacts для верификации:** task lists, implementation plans, screenshots, browser recordings
- **Бесплатный для индивидуалов**
- [Google Antigravity](https://antigravity.google/) | [AgentKit 2.0](https://www.geeky-gadgets.com/google-antigravity-agentkit-2026/)

### 7.3 Cursor
- **$29.3B валюация** (ноябрь 2025) — market leader
- **Composer model** — обучена специально для coding agents, 4x быстрее аналогов
- **До 8 параллельных агентов** с автоматическим judging решений
- [NxCode Comparison](https://www.nxcode.io/resources/news/cursor-vs-windsurf-vs-claude-code-2026)

### 7.4 Windsurf (Cognition AI)
- **Wave 13:** Arena Mode (blind A/B сравнение моделей), Plan Mode, Parallel Multi-Agent через Git Worktrees
- **Arena Mode:** два Cascade агента с hidden identities — пользователь голосует за лучший
- **Personal + Global Leaderboards** из голосов
- [Windsurf Wave 13](https://windsurf.com/blog/windsurf-wave-13)

### 7.5 Kiro (Amazon, 2025-2026)
- **Spec-driven development:** requirements.md -> design.md -> код
- **Автономный агент** работает днями
- **Agent hooks** — event-driven триггеры
- [Kiro](https://kiro.dev/)

### 7.6 7 серьёзных конкурентов (Март 2026)
Claude Code, Google Antigravity, OpenAI Codex, Cursor, Kiro, GitHub Copilot, Windsurf

---

## 8. Personal AI Infrastructure

### 8.1 Miessler PAI v2.4 (Январь 2026)
- **10 файлов персонализации:** MISSION, GOALS, PROJECTS, BELIEFS, MODELS, STRATEGIES, NARRATIVES, LEARNED, CHALLENGES, IDEAS
- **Modular packs** — self-contained AI-installable capability bundles
- **Algorithm, Memory System, Hook System** — все обновлены для v2.4
- **Fabric:** 242+ crowdsourced patterns для типовых AI-задач
- [Miessler PAI](https://danielmiessler.com/blog/personal-ai-infrastructure) | [GitHub](https://github.com/danielmiessler/Personal_AI_Infrastructure)

### 8.2 Personal AI Maturity Model (PAIMM)
- Framework для оценки зрелости персональной AI-инфраструктуры
- [PAIMM](https://danielmiessler.com/blog/personal-ai-maturity-model)

### 8.3 Digital Twin тренд (2026)
- **Read AI Digital Twin:** отвечает на emails, планирует meetings
- **OpenClaw:** open-source AI digital assistant, agent runtime на машине
- **Developer Digital Twin:** автономное создание кода, тестов, документации, git commits

### 8.4 Leon: Open-Source Personal Assistant
- [Leon](https://getleon.ai/) — open-source personal assistant

**Релевантность для PAI:** Наша PAI значительно превосходит Miessler PAI по архитектуре (Algorithm, ISC, hooks, multi-agent, FRAMES). Основные преимущества: (1) живая система vs статические файлы, (2) multi-model routing, (3) event-driven hooks, (4) skill system. Рекомендация: формализовать PAIMM-подобную self-assessment для отслеживания собственной зрелости.

---

## 9. Контринтуитивные и недооценённые техники

### 9.1 Formal Verification + AI = "Vericoding"
- **LLM генерирует формально верифицированный код** (Lean, HOL, Python/SymPy)
- **Стартапы:** Harmonic's Aristotle, Logical Intelligence, DeepSeek-Prover-V2
- **Прогноз Martin Kleppmann:** AI сделает formal verification мейнстримом
- [Kleppmann Blog](https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html)

### 9.2 Neurosymbolic Verification
- **Code-as-Proof:** замена freeform neural output формально специфицируемыми объектами
- **ARc framework:** >99% soundness на unseen datasets — недостижимо чисто нейронными методами
- **Символическая дистилляция:** модели 100x меньше GPT-3 с превосходным common sense

### 9.3 Workshop ICLR 2026: Learning with Guarantees
- Пересечение neurosymbolic AI, logical reasoning, formal verification
- Интеграция learning-based methods с formal guarantees

### 9.4 Constraint Programming для Task Planning
- Формальные constraint solvers для декомпозиции задач вместо LLM-based planning
- Гарантированная оптимальность решений при правильной формализации

**Релевантность для PAI:** Наименее исследованная, но потенциально самая ценная область. Рекомендации: (1) рассмотреть ISC как формальные constraints с symbolic verification, (2) внедрить Code-as-Proof для критических операций, (3) отслеживать DeepSeek-Prover-V2 для Lean-based verification.

---

## Топ-6 конкретных архитектурных рекомендаций для PAI

### R1: ACE-подобный Reflector/Curator цикл
**Что:** Формализовать трёхролевую систему (Generator/Reflector/Curator) в Algorithm
**Почему:** +10.6% на benchmarks без fine-tuning. PAI's Algorithm уже Generator. Нужен explicit Reflector (LEARN-фиксация) и Curator (FRAMES update)
**Как:** После каждого completed work item — автоматический Reflector pass, затем Curator delta-edit в FRAMES

### R2: MemRL Q-value scoring для memory retrieval
**Что:** Вместо чистого semantic matching — двухфазный retrieval с utility scoring
**Почему:** MemRL показал что semantic relevance недостаточна — нужна оценка полезности (utility)
**Как:** Хранить success/failure outcomes для каждого memory retrieval, обновлять Q-values, использовать при будущем retrieval

### R3: ACON-подобная adaptive context compression
**Что:** Анализировать причины failure после compression и обновлять compression guidelines
**Почему:** Текущий /compact не адаптируется. ACON показал 26-54% снижение tokens при >95% accuracy
**Как:** После каждого /compact — если качество упало, анализировать что потеряно и обновить правила compression

### R4: Agent-as-a-Judge для ISC верификации
**Что:** Отдельный агент оценивает ISC completion вместо self-assessment
**Почему:** 90% agreement с human experts (vs 70% для self-judge). Агенты markают features complete без testing
**Как:** При ISC verification — spawn отдельного evaluation agent с tool use capabilities для независимой проверки

### R5: Context Isolation через обязательные subagents для тяжёлых задач
**Что:** Автоматический spawn subagents когда ожидаемый контекст превышает порог
**Почему:** Anthropic: multi-agent с изолированными контекстами +90.2% vs single agent
**Как:** В Algorithm добавить complexity check — если задача > N ISC или > M файлов, обязательно через subagents с изолированным контекстом

### R6: Experiential Learning (CORPGEN pattern)
**Что:** Хранить записи о выполненных задачах и переиспользовать для структурно похожих
**Почему:** CORPGEN: experiential learning — главный фактор улучшения (8.7% -> 15.2%), больше чем все остальные механизмы
**Как:** Расширить events.jsonl структурированными записями: task_type, approach, outcome, learnings. При новой задаче — retrieval похожих records

---

## Ключевые источники

### Академические работы
- [OpenSage (Feb 2026)](https://arxiv.org/abs/2602.16891) — Self-programming ADK
- [CORPGEN (Feb 2026)](https://arxiv.org/abs/2602.14229) — Multi-horizon hierarchical planning
- [MemRL (Jan 2026)](https://arxiv.org/abs/2601.03192) — Self-evolving agents + episodic memory
- [ACE (Oct 2025)](https://arxiv.org/abs/2510.04618) — Agentic Context Engineering
- [ACON (Oct 2025)](https://arxiv.org/abs/2510.00615) — Context compression optimization
- [Agent-as-a-Judge Survey (Jan 2026)](https://arxiv.org/abs/2601.05111)
- [Memory in the Age of AI Agents (Dec 2025)](https://arxiv.org/abs/2512.13564)
- [CoALA (2023)](https://arxiv.org/abs/2309.02427) — Cognitive Architecture foundational paper

### Industry sources
- [Anthropic: Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Anthropic: Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)
- [Anthropic: Advanced Tool Use](https://www.anthropic.com/engineering/advanced-tool-use)
- [Agent Skills Standard](https://agentskills.io/specification)
- [LangChain: Context Engineering](https://blog.langchain.com/context-engineering-for-agents/)
- [LangChain: Deep Agents](https://blog.langchain.com/deep-agents/)
- [Miessler PAI v2.4](https://danielmiessler.com/blog/personal-ai-infrastructure-december-2025)
- [Martin Kleppmann: AI + Formal Verification](https://martin.kleppmann.com/2025/12/08/ai-formal-verification.html)

### Products & Tools
- [Google Antigravity](https://antigravity.google/) — Agent-first IDE
- [Kiro](https://kiro.dev/) — Spec-driven development
- [OpenHands](https://openhands.dev/) — Open platform for coding agents
- [Windsurf Wave 13](https://windsurf.com/blog/windsurf-wave-13) — Arena Mode + Parallel Agents

---

## Метрики исследования

- **Направлений поиска:** 9 (3 типа x 3 angle)
- **Общее число запросов:** 27+
- **Покрытие:** академические работы, GitHub, блоги, industry reports, product documentation
- **Период фокуса:** Январь-Март 2026 (с историческим контекстом 2023-2025)
- **Уровень уверенности:** 85-95% (множественное подтверждение из разных источников)
