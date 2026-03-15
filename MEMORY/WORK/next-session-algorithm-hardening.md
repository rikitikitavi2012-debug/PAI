# Промпт для следующей сессии: Algorithm v4.0-alpha Hardening

Скопировать целиком как первое сообщение в новой сессии.

---

## Задача: Algorithm v4.0-alpha Hardening — исправить 9 багов + consistency audit

Предыдущая сессия оценила алгоритм на 7.5/10 после первого реального прогона.
Облачный Claude провёл независимый аудит v4.0-alpha.md + Algorithm-Autoresearch.md и нашёл 9 проблем.
Цель: исправить все 9, проверить consistency, поднять до 9.5/10.

### 9 находок Cloud Claude Review (приоритезированы)

**Critical:**
1. **Multiple [Q] criteria conflict** — experiments.tsv имеет одну колонку metric, но PRD может иметь 2+ [Q] критерия. Нет guidance: последовательно или параллельно? Что если оптимизация одного ухудшает другой?
   FIX: Autoresearch sub-loop оптимизирует ОДИН [Q] за раз. При множественных — последовательно. Каждый [Q] → свой experiments.tsv секция. Предыдущие [Q] результаты → доп. regression gates.

2. **L3 STOP не считает re-entry** — Stagnation STOP инкрементит think_reentries. L3 Structural STOP — нет. Должен.
   FIX: одна строка — "ALL STOP events (Stagnation AND L3) increment think_reentries and respect the 2 re-entry limit."

**Medium:**
3. **Дорогие regression gates** — при 20 [B] критериях проверка на каждой итерации = часы.
   FIX: разделить на fast gates (<5s: grep, lint) каждую итерацию и slow gates (>5s: full tests) каждые 5 итераций или после keep.

4. **Нет таймаута verify command** — может зависнуть.
   FIX: "If verify command doesn't return in 60s → kill, log status=timeout in experiments.tsv, treat as crash."

5. **Recovery mid-iteration** — compaction во время MODIFY = uncommitted changes.
   FIX: "After recovery: check git status. Uncommitted changes → commit (resume VERIFY) or discard (resume IDEATE). Never resume mid-MODIFY."

**Low:**
6. **Нет partial success** — stops at 78% with target 90%, no guidance.
   FIX: после re-entry limit → пометить [Q] как PARTIAL в PRD, зафиксировать best value, LEARN Track 3 анализирует.

7. **Amplify не определён** — "try bolder changes" vague.
   FIX: normal = один элемент, amplified = несколько элементов или структурные, reduced = точечные правки.

8. **Субъективный Cycle Selector** — "<3 approaches" is agent-subjective.
   FIX: механический критерий: "If verify command exists AND produces numeric output AND target defined → Autoresearch."

9. **ISC floor для простых задач** — 8 для "rename variable" overkill.
   FIX: escape hatch → "If genuinely simple and 8 cannot be decomposed, downgrade to NATIVE with justification."

### Consistency Audit (обязательно)

После фиксов — проверить:
1. CLAUDE.md.template ↔ v4.0-alpha.md — все фазы, voice phrases, critical rules совпадают
2. v4.0-alpha.md ↔ Algorithm-Autoresearch.md — cross-references, терминология, priorities
3. algorithm-phases.yaml ↔ v4.0-alpha.md — Russian voice phrases match
4. settings.json hooks ↔ THEHOOKSYSTEM.md — все хуки документированы
5. Нет противоречий между Complexity Gate (CLAUDE.md) и ISC Count Gate (v4.0-alpha.md)

### Ограничения
- Только правки v4.0-alpha.md и Algorithm-Autoresearch.md (+ CLAUDE.md.template если нужно)
- НЕ трогать v3.6.0.md и v3.5.0.md
- Cross-model review (Gemini + A0) обязателен после финализации
- Коммитить атомарно: 1 баг = 1 коммит

### Метрика успеха
- Все 9 фиксов applied
- Consistency audit passed (0 contradictions)
- bun test — все Algorithm тесты зелёные
- Cross-model review — 0 critical findings

### Контекст
- Algorithm v4.0-alpha: PAI/Algorithm/v4.0-alpha.md
- Autoresearch: PAI/Algorithm/Algorithm-Autoresearch.md
- CLAUDE.md template: PAI/CLAUDE.md.template (или handlers/BuildCLAUDE.ts)
- Cloud Claude review: MEMORY/WORK/20260315-230000_learn-phase-persistence/cloud-claude-review.md
- Karpathy autoresearch inspiration: MEMORY/RESEARCH/2026-03/2026-03-15_autoresearch-repos-comparison/
- Upstream strategy: НИКОГДА не merge upstream, только cherry-pick (MEMORY/feedback_upstream_strategy.md)
