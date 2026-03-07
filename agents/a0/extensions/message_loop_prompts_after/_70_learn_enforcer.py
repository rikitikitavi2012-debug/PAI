import re
from python.helpers.extension import Extension
from agent import LoopData


# Markers indicating task completion
COMPLETION_MARKERS = [
    "готово", "done", "выполнено", "завершено", "completed",
    "задача выполнена", "task completed", "task done",
    "\u2705",  # ✅ emoji
]

# Markers indicating flywheel/learn step was performed
LEARN_MARKERS = [
    "learn", "узнал", "flywheel", "сохран", "memorize",
    "memory_save", "что сработало", "что сломалось",
    "урок", "lesson", "вывод", "takeaway",
]

# How many recent messages to scan
SCAN_WINDOW = 8

# Data key to avoid repeated nudges in the same conversation
DATA_KEY_NUDGED = "_learn_enforcer_nudged"


class LearnEnforcer(Extension):
    """Nudges the agent to complete the Flywheel LEARN step after task completion.

    Scans recent conversation history for task-completion markers.
    If a completion is detected but no LEARN/Flywheel markers are found,
    injects a gentle reminder into the prompt extras.
    """

    async def execute(self, loop_data: LoopData = LoopData(), **kwargs):
        # Only apply to the main agent (agent0), not subordinates
        if self.agent.number != 0:
            return

        # If we already nudged in this conversation cycle, skip
        if self.agent.get_data(DATA_KEY_NUDGED):
            return

        # Get recent messages from history
        messages = self.agent.history.messages
        if not messages:
            return

        # Take last N messages
        recent = messages[-SCAN_WINDOW:]

        # Build combined text from recent messages (lowercased for matching)
        recent_text = ""
        for msg in recent:
            content = msg.content if isinstance(msg.content, str) else str(msg.content)
            recent_text += content.lower() + "\n"

        # Check for completion markers
        has_completion = any(
            marker in recent_text for marker in COMPLETION_MARKERS
        )

        if not has_completion:
            return

        # Check for learn markers
        has_learn = any(
            marker in recent_text for marker in LEARN_MARKERS
        )

        if has_learn:
            # Learn step already done, mark as nudged to avoid future checks
            self.agent.set_data(DATA_KEY_NUDGED, True)
            return

        # Completion detected but no LEARN step — inject nudge
        nudge = (
            "## \U0001f501 Flywheel Reminder\n"
            "Task appears completed but the **LEARN** step is missing.\n"
            "Before responding, consider:\n"
            "- **What worked?** What approach/tool was effective?\n"
            "- **What broke?** Any unexpected issues?\n"
            "- **What to remember?** Save useful insights with `memory_save`.\n\n"
            "Complete the Flywheel: DO \u2192 LEARN \u2192 FIX\n"
        )

        loop_data.extras_temporary["learn_enforcer_nudge"] = nudge

        # Mark as nudged so we don't repeat
        self.agent.set_data(DATA_KEY_NUDGED, True)
