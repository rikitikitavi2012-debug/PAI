#!/usr/bin/env bun
/**
 * ModeClassifier.hook.ts — Deterministic mode classification (UserPromptSubmit)
 *
 * PURPOSE:
 * PAI v4.0 regression: Algorithm mode activates only ~9% of the time.
 * Root cause: CLAUDE.md template attraction bias causes LLM to pattern-match
 * to NATIVE format over semantic instructions (MIT 2025 research confirmed).
 *
 * This hook removes LLM from mode classification entirely.
 * Deterministic regex routes:
 *   - Greetings / ratings / thanks / acks (EN + RU) → MINIMAL
 *   - Everything else                               → ALGORITHM (enforced)
 *
 * The Algorithm's Complexity Gate (in OBSERVE phase) handles intelligent
 * downshifting to NATIVE when task context confirms simplicity.
 *
 * TRIGGER: UserPromptSubmit (position 0 — must run before other hooks)
 *
 * INPUT: stdin JSON { session_id, prompt, hook_event_name }
 *
 * OUTPUT:
 *   - JSON { additionalContext } → injected as system-reminder before AI sees prompt
 *   - exit(0): Always — never blocks prompt, never crashes
 *
 * PERFORMANCE: < 20ms — pure regex, zero API calls, zero file I/O
 *
 * AUTHOR: PAI 4.0.1 — based on jlacour-git #828 analysis, extended for RU/Cyrillic
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserPromptInput {
  session_id?: string;
  prompt?: string;
  user_prompt?: string;
  hook_event_name?: string;
}

type Mode = 'MINIMAL' | 'ALGORITHM';

interface Classification {
  mode: Mode;
  reason: string;
}

// ── Pattern Definitions ───────────────────────────────────────────────────────
//
// ALL patterns are anchored (^...$) and match the ENTIRE trimmed prompt.
// This is critical: "ок" → MINIMAL, but "ок, сделай X" → ALGORITHM (no match).

/** English greetings */
const GREETING_EN = /^(hi|hello|hey|howdy|good\s+(morning|evening|night|afternoon)|gm|gn|sup|yo|hiya|greetings)\s*[!.?]*$/i;

/** Russian greetings (comprehensive) */
const GREETING_RU = /^(привет|приветик|здравствуй(те)?|добро(е|го)\s+(утро|день|вечер|ночи|суток)|добрый\s+(день|вечер|утро)|доброго\s+времени\s+суток|салют|хай|хей|даров|ку|хэй|здорово|здрасте|здрасьте)\s*[!.?!]*$/i;

/**
 * Numeric ratings — matches:
 *   "9", "10", "9/10", "10/10", "8.5/10"
 *   "9/10 — хорошо", "8 - good work", "10 — отлично!"
 *   "9/10: great", "7/10 норм"
 * Does NOT match: "сделай 9 шагов" (no leading digit anchor with task context)
 */
const RATING_PATTERN = /^\d{1,2}([.,]\d)?(\s*\/\s*10)?\s*([–\-—:]\s*.{0,80})?$/;

/** English thanks */
const THANKS_EN = /^(thanks|thank\s+you|thx|ty|cheers|tks|tnx|many\s+thanks|much\s+appreciated)\s*[!.?]*$/i;

/** Russian thanks */
const THANKS_RU = /^(спасибо|спасибочки|спасибки|спс|благодарю|благодарен|благодарна|пасиба|сяб|мерси|сенкью|сэнкью)\s*[!.?!]*$/i;

/**
 * English acknowledgments — short confirmations only.
 * Pattern is strict to avoid catching task prefixes like "ok, now do X".
 */
const ACK_EN = /^(ok|okay|got\s+it|understood|sure|fine|great|perfect|done|noted|cool|nice|awesome|yep|yeah|nope|no|yes|k)\s*[!.?]*$/i;

/**
 * Russian acknowledgments — strict single-word/short confirmations.
 * "ок" matches, "ок, продолжай" does NOT (comma breaks the anchor).
 */
const ACK_RU = /^(ок|окей|хорошо|понял|поняла|понятно|ясно|ладно|договорились|принял|приняла|норм|нормально|ага|угу|хм|ясно|чётко|четко|ок\.?|вс[её])\s*[!.?!]*$/i;

/** Short positive feedback without task content */
const FEEDBACK_SHORT = /^(отлично|супер|класс|круто|хорошо|прекрасно|замечательно|excellent|perfect|great|good|nice|awesome|brilliant|fantastic|well\s+done|молодец|красавчик|огонь|топ|огонь|зачёт|зачет)\s*[!.?!]*$/i;

// ── Classification Logic ──────────────────────────────────────────────────────

const MINIMAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: GREETING_EN,    label: 'greeting-en'    },
  { pattern: GREETING_RU,    label: 'greeting-ru'    },
  { pattern: RATING_PATTERN, label: 'rating'         },
  { pattern: THANKS_EN,      label: 'thanks-en'      },
  { pattern: THANKS_RU,      label: 'thanks-ru'      },
  { pattern: ACK_EN,         label: 'ack-en'         },
  { pattern: ACK_RU,         label: 'ack-ru'         },
  { pattern: FEEDBACK_SHORT, label: 'feedback-short' },
];

/** Maximum prompt length for MINIMAL consideration (chars, after trim) */
const MINIMAL_MAX_LENGTH = 100;

function classify(prompt: string): Classification {
  const trimmed = prompt.trim();

  // Empty prompt — no classification needed
  if (!trimmed) {
    return { mode: 'MINIMAL', reason: 'empty-prompt' };
  }

  // Long prompts are always ALGORITHM — no greeting/ack is > 100 chars
  if (trimmed.length > MINIMAL_MAX_LENGTH) {
    return { mode: 'ALGORITHM', reason: 'length-exceeds-threshold' };
  }

  // Test against MINIMAL patterns
  for (const { pattern, label } of MINIMAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { mode: 'MINIMAL', reason: label };
    }
  }

  // Default: ALGORITHM
  return { mode: 'ALGORITHM', reason: 'no-minimal-pattern-matched' };
}

// ── Context Injection ─────────────────────────────────────────────────────────

function buildMinimalContext(): string {
  return [
    `MODE CLASSIFICATION (ModeClassifier.hook.ts):`,
    ``,
    `This prompt has been classified as MINIMAL by deterministic pattern analysis.`,
    `You MUST use MINIMAL mode. Do NOT use ALGORITHM or NATIVE mode.`,
    ``,
    `MINIMAL format:`,
    `═══ PAI ═══════════════════════════`,
    `📃 CONTENT: [if any content to show]`,
    `🔧 CHANGE: [8-word bullets on what changed, if any]`,
    `✅ VERIFY: [8-word bullets on how verified, if any]`,
    `🗣️ Navi: [4-8 word acknowledgment]`,
  ].join('\n');
}

function buildAlgorithmContext(): string {
  return [
    `MODE CLASSIFICATION (ModeClassifier.hook.ts):`,
    ``,
    `This prompt has been classified as ALGORITHM mode by deterministic pattern analysis.`,
    ``,
    `You MUST use ALGORITHM mode. Do NOT use NATIVE mode for this request.`,
    `Your FIRST output MUST be the ALGORITHM entry header:`,
    `  ♻︎ Entering the PAI ALGORITHM… (v3.5.0) ═════════════`,
    `  🗒️ TASK: [8 word description]`,
    ``,
    `Then proceed through all 7 phases: OBSERVE → THINK → PLAN → BUILD → EXECUTE → VERIFY → LEARN.`,
    `The Complexity Gate in the OBSERVE phase will downshift to NATIVE if the task is genuinely simple.`,
    ``,
    `MANDATORY FIRST ACTION in OBSERVE: load PAI/Algorithm/v3.5.0.md with the Read tool.`,
  ].join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Parse stdin — graceful failure is mandatory
  let input: UserPromptInput = {};
  try {
    const raw = await Bun.stdin.text();
    if (raw.trim()) {
      input = JSON.parse(raw);
    }
  } catch {
    // Malformed input — exit cleanly, don't block prompt
    console.error('[ModeClassifier] ⚠ Failed to parse input — passthrough');
    process.exit(0);
  }

  const prompt = (input.prompt ?? input.user_prompt ?? '').trim();

  // Classify
  const { mode, reason } = classify(prompt);

  const preview = prompt.length > 60 ? prompt.slice(0, 57) + '…' : prompt;
  console.error(`[ModeClassifier] → ${mode} (${reason}) | "${preview}"`);

  // Inject additionalContext
  const context = mode === 'MINIMAL'
    ? buildMinimalContext()
    : buildAlgorithmContext();

  console.log(JSON.stringify({ additionalContext: context }));
  process.exit(0);
}

main().catch(() => process.exit(0));
