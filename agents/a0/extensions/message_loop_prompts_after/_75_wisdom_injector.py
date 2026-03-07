import re
from python.helpers.extension import Extension
from agent import LoopData


# Ivan's Wisdom rules mapped to trigger patterns
# Each entry: (list_of_trigger_patterns, wisdom_code, wisdom_text)
WISDOM_RULES = [
    (
        ["идеальн", "perfect", "лучший вариант", "best solution", "оптимальн"],
        "W1",
        "MVP лучше идеала — сделанное лучше идеального. Отдай работающий вариант, итерируй потом.",
    ),
    (
        ["проект 1", "проект 2", "параллельно", "одновременно", "ещё один проект", "side project"],
        "W5",
        "Один проект за раз — энергия не распыляется. Предупреди о распылении фокуса.",
    ),
    (
        ["нанять", "аутсорс", "outsource", "купить решение", "buy solution", "hire"],
        "W7",
        "Экспертизу нельзя купить, код — можно. Фокус на то что нельзя делегировать.",
    ),
    (
        ["учебник", "курс", "tutorial", "course", "сначала изуч", "теори"],
        "W3",
        "Учись руками, не книгами — делай проект, разберёшься по ходу.",
    ),
    (
        ["рискн", "всё поставить", "all-in", "большая ставка", "big bet"],
        "FR6",
        "Асимметричный риск: ограниченный downside, открытый upside. Не рискуй всем ради одного исхода.",
    ),
    (
        ["сразу всё", "полная переделка", "rewrite", "с нуля", "from scratch", "big bang"],
        "FR7",
        "Ступенчатость — большие изменения через маленькие шаги. Не прыгай — поднимайся по ступеням.",
    ),
    (
        ["зачем он", "почему они", "мотивация", "motivation", "why would"],
        "FR2",
        "Фрейм стимулов — 'Что он получает от этого?' Ищи мотивацию за поведением.",
    ),
]

# Data key to track which wisdoms were already shown
DATA_KEY_SHOWN = "_wisdom_injector_shown"

# Only check on first iteration of new user message
MAX_ITERATION = 1


class WisdomInjector(Extension):
    """Contextually injects relevant Ivan's Wisdom (W1-W9, FR2/FR6/FR7)
    when conversation topics match known decision patterns.

    This reinforces the principal's decision-making framework
    by surfacing the right wisdom at the right time.
    """

    async def execute(self, loop_data: LoopData = LoopData(), **kwargs):
        # Only apply to main agent
        if self.agent.number != 0:
            return

        # Only on first iterations to avoid repeated nudges
        if loop_data.iteration > MAX_ITERATION:
            return

        # Get user message text
        if not loop_data.user_message:
            return

        content = loop_data.user_message.content
        if not isinstance(content, str):
            content = str(content)
        content_lower = content.lower()

        # Also scan recent AI messages for context
        recent_text = content_lower
        messages = self.agent.history.messages
        if messages:
            for msg in messages[-3:]:
                msg_content = msg.content if isinstance(msg.content, str) else str(msg.content)
                recent_text += "\n" + msg_content.lower()

        # Track which wisdoms already shown in this conversation
        shown = self.agent.get_data(DATA_KEY_SHOWN) or set()

        # Find matching wisdoms
        matched = []
        for triggers, code, text in WISDOM_RULES:
            if code in shown:
                continue
            for trigger in triggers:
                if trigger in recent_text:
                    matched.append((code, text))
                    shown.add(code)
                    break  # one match per rule is enough

        if not matched:
            return

        # Build nudge text (max 2 wisdoms at a time to avoid noise)
        wisdoms = matched[:2]
        nudge_parts = ["## \U0001f9e0 Ivan's Wisdom (contextual)"]
        for code, text in wisdoms:
            nudge_parts.append(f"- **{code}**: {text}")

        nudge = "\n".join(nudge_parts)
        loop_data.extras_temporary["wisdom_injector"] = nudge

        # Save shown set
        self.agent.set_data(DATA_KEY_SHOWN, shown)
