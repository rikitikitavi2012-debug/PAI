#!/usr/bin/env bun
/**
 * ============================================================================
 * INFERENCE - Unified inference tool with three run levels
 * ============================================================================
 *
 * PURPOSE:
 * Single inference tool with configurable speed/capability trade-offs:
 * - Fast: Haiku - quick tasks, simple generation, basic classification
 * - Standard: Sonnet - balanced reasoning, typical analysis
 * - Smart: Opus - deep reasoning, strategic decisions, complex analysis
 *
 * USAGE:
 *   bun Inference.ts --level fast <system_prompt> <user_prompt>
 *   bun Inference.ts --level standard <system_prompt> <user_prompt>
 *   bun Inference.ts --level smart <system_prompt> <user_prompt>
 *   bun Inference.ts --level gemini <system_prompt> <user_prompt>
 *   bun Inference.ts --json --level fast <system_prompt> <user_prompt>
 *
 * OPTIONS:
 *   --level <fast|standard|smart|gemini>  Run level (default: standard)
 *   --json                                Expect and parse JSON response
 *   --timeout <ms>                        Custom timeout (default varies by level)
 *
 * DEFAULTS BY LEVEL:
 *   fast:     model=haiku,        timeout=15s,  provider=claude
 *   standard: model=sonnet,       timeout=30s,  provider=claude
 *   smart:    model=opus,         timeout=90s,  provider=claude
 *   gemini:   model=gemini-pro,   timeout=30s,  provider=gemini-cli
 *
 * BILLING: Claude levels use ANTHROPIC_API_KEY (direct API). Gemini uses GOOGLE_API_KEY (free 1000/day, Pro 5x).
 *
 * ============================================================================
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join, dirname } from "path";

/** Emit inference event to events.jsonl (fire-and-forget, never throws)
 * result: 'ok' | 'fail' (real API/network error) | 'parse_fail' (API answered but format wrong) */
function emitInferenceEvent(level: InferenceLevel, provider: string, model: string, result: 'ok' | 'fail' | 'parse_fail', latencyMs: number, error?: string): void {
  try {
    const eventsPath = join(process.env.HOME || '', '.claude', 'MEMORY', 'STATE', 'events.jsonl');
    const dir = dirname(eventsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const event = {
      type: `inference.${result}`,
      source: 'Inference',
      data: { level, provider, model, latency_s: (latencyMs / 1000).toFixed(1), ...(error ? { error } : {}) },
      timestamp: new Date().toISOString(),
      session_id: process.env.CLAUDE_SESSION_ID || 'unknown',
    };
    appendFileSync(eventsPath, JSON.stringify(event) + '\n', 'utf-8');
  } catch { /* observability, not critical path */ }
}

export type InferenceLevel = 'fast' | 'standard' | 'smart' | 'gemini' | 'glm5';

export interface InferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  level?: InferenceLevel;
  expectJson?: boolean;
  timeout?: number;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  parsed?: unknown;
  error?: string;
  latencyMs: number;
  level: InferenceLevel;
}

// Anthropic API model IDs
const CLAUDE_MODEL_MAP: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
};

// Cache for invalid Anthropic key (401/403) — skip Claude for rest of session
let claudeKeyInvalid = false;

// Level configurations
const LEVEL_CONFIG: Record<InferenceLevel, { model: string; defaultTimeout: number; provider: 'claude' | 'gemini' | 'zai'; zaiModel?: string }> = {
  fast: { model: 'haiku', defaultTimeout: 15000, provider: 'claude', zaiModel: 'glm-5-turbo' },
  standard: { model: 'sonnet', defaultTimeout: 30000, provider: 'claude', zaiModel: 'glm-5' },
  smart: { model: 'opus', defaultTimeout: 90000, provider: 'claude', zaiModel: 'glm-5.1' },
  gemini: { model: 'gemini-pro', defaultTimeout: 30000, provider: 'gemini' },
  glm5: { model: 'glm-5', defaultTimeout: 30000, provider: 'zai' },
};

/** Load API key from env or .env file
 * For ANTHROPIC_API_KEY: prefer file over env (env may be ZAI proxy key for glm-5.1 session)
 * For other keys: prefer env over file (standard behavior)
 */
function loadApiKey(envVar: string): string {
  // For ANTHROPIC_API_KEY, check file FIRST (env may be ZAI proxy key)
  if (envVar === 'ANTHROPIC_API_KEY') {
    try {
      const envContent = readFileSync(join(process.env.HOME || '', '.config', 'PAI', '.env'), 'utf-8');
      const match = envContent.match(/^ANTHROPIC_API_KEY=(.+)$/m);
      if (match) return match[1].trim();
    } catch {}
  }
  // Standard behavior: env first, then file
  let key = process.env[envVar] || '';
  if (!key) {
    try {
      const envContent = readFileSync(join(process.env.HOME || '', '.config', 'PAI', '.env'), 'utf-8');
      const match = envContent.match(new RegExp(`^${envVar}=(.+)$`, 'm'));
      if (match) key = match[1].trim();
    } catch {}
  }
  return key;
}

/**
 * Run inference via Z.AI (GLM-5) OpenAI-compatible API
 */
async function inferenceZai(options: InferenceOptions, level: InferenceLevel, timeout: number): Promise<InferenceResult> {
  const startTime = Date.now();
  const config = LEVEL_CONFIG[level];

  const apiKey = loadApiKey('ZAI_API_KEY');
  if (!apiKey) {
    return { success: false, output: '', error: 'No ZAI_API_KEY found', latencyMs: Date.now() - startTime, level };
  }

  // Use level-specific Z.AI model (glm-5-turbo for fast, glm-5 for standard, glm-5.1 for smart)
  const model = config.zaiModel || config.model;
  const baseUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  const messages: Array<{role: string; content: string}> = [];
  if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
  messages.push({ role: 'user', content: options.userPrompt });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2000,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, output: '', error: `Z.AI API ${response.status}: ${errText}`, latencyMs, level };
    }

    const data = await response.json() as any;
    const choice = data.choices?.[0]?.message;
    // GLM-5 uses reasoning_content for thinking, content for answer
    const output = (choice?.content || choice?.reasoning_content || '').trim();

    if (options.expectJson) {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return { success: true, output, parsed: JSON.parse(jsonMatch[0]), latencyMs, level };
        } catch {
          return { success: false, output, error: 'Failed to parse JSON from GLM-5', latencyMs, level };
        }
      }
      return { success: false, output, error: 'No JSON found in GLM-5 response', latencyMs, level };
    }

    return { success: true, output, latencyMs, level };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return { success: false, output: '', error: `Z.AI timeout after ${timeout}ms`, latencyMs, level };
    }
    return { success: false, output: '', error: err.message, latencyMs, level };
  }
}

/**
 * Run inference via Gemini CLI
 */
async function inferenceGemini(options: InferenceOptions, level: InferenceLevel, timeout: number): Promise<InferenceResult> {
  const startTime = Date.now();

  const apiKey = loadApiKey('GOOGLE_API_KEY') || loadApiKey('GEMINI_API_KEY');
  if (!apiKey) {
    return { success: false, output: '', error: 'No GOOGLE_API_KEY found', latencyMs: Date.now() - startTime, level };
  }

  const model = 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  if (options.systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: `System: ${options.systemPrompt}\n\nUser: ${options.userPrompt}` }] });
  } else {
    contents.push({ role: 'user', parts: [{ text: options.userPrompt }] });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, output: '', error: `Gemini API ${response.status}: ${errorText.slice(0, 200)}`, latencyMs, level };
    }

    const data = await response.json() as any;
    const output = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

    if (!output) {
      return { success: false, output: '', error: 'Empty Gemini response', latencyMs, level };
    }

    if (options.expectJson) {
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return { success: true, output, parsed: JSON.parse(jsonMatch[0]), latencyMs, level };
        } catch {
          return { success: false, output, error: 'Failed to parse JSON from Gemini', latencyMs, level };
        }
      }
      return { success: false, output, error: 'No JSON found in Gemini response', latencyMs, level };
    }

    return { success: true, output, latencyMs, level };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    if (err.name === 'AbortError') {
      return { success: false, output: '', error: `Gemini timeout after ${timeout}ms`, latencyMs, level };
    }
    return { success: false, output: '', error: err.message, latencyMs, level };
  }
}

/**
 * Run inference with configurable level
 */
export async function inference(options: InferenceOptions): Promise<InferenceResult> {
  const level = options.level || 'standard';
  const config = LEVEL_CONFIG[level];
  const timeout = options.timeout || config.defaultTimeout;

  // Route to alternative providers
  if (config.provider === 'gemini') {
    const result = await inferenceGemini(options, level, timeout);
    emitInferenceEvent(level, 'gemini', config.model, result.success ? 'ok' : 'fail', result.latencyMs, result.error);
    return result;
  }
  if (config.provider === 'zai') {
    const result = await inferenceZai(options, level, timeout);
    emitInferenceEvent(level, 'zai', config.model, result.success ? 'ok' : 'fail', result.latencyMs, result.error);
    return result;
  }

  // Direct Anthropic API fetch (no subprocess overhead)
  const startTime = Date.now();
  const apiKey = loadApiKey('ANTHROPIC_API_KEY');

  // Skip Claude if key was already rejected (cached 401/403)
  if (claudeKeyInvalid || !apiKey) {
    if (!apiKey) console.error('[Inference] No ANTHROPIC_API_KEY, falling back to Z.AI');
    if (claudeKeyInvalid) console.error('[Inference] Claude key invalid (cached), using Z.AI');
    const zaiResult = await inferenceZai(options, level, timeout);
    emitInferenceEvent(level, 'zai', 'glm-5', zaiResult.success ? 'ok' : 'fail', zaiResult.latencyMs, zaiResult.error);
    return zaiResult;
  }

  const modelId = CLAUDE_MODEL_MAP[config.model] || config.model;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let response: Response;
    if (process.env.ANTHROPIC_MOCK_FETCH === '1') {
      const mockText = options.expectJson ? '{"status": "mocked claude json"}' : 'mocked claude response';
      response = new Response(JSON.stringify({
        content: [{ text: mockText }]
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    } else {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 4096,
          system: options.systemPrompt,
          messages: [{ role: 'user', content: options.userPrompt }]
        }),
        signal: controller.signal
      });
    }

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errText = await response.text();
      emitInferenceEvent(level, 'claude', config.model, 'fail', latencyMs, `http_${response.status}`);

      // Fallback to Z.AI on auth errors (401, 403) or rate limits (429)
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        // Cache auth failures to skip Claude for rest of session
        if (response.status === 401 || response.status === 403) {
          claudeKeyInvalid = true;
          console.error('[Inference] Claude key marked invalid, will use Z.AI for session');
        }
        console.error(`[Inference] Claude ${response.status}, falling back to Z.AI`);
        const zaiResult = await inferenceZai(options, level, timeout);
        emitInferenceEvent(level, 'zai', 'glm-5', zaiResult.success ? 'ok' : 'fail', zaiResult.latencyMs, zaiResult.error);
        return zaiResult;
      }

      return { success: false, output: '', error: `Anthropic API ${response.status}: ${errText.slice(0, 200)}`, latencyMs, level };
    }

    const data = await response.json() as any;
    const output = (data.content?.[0]?.text || '').trim();

    if (!output) {
      emitInferenceEvent(level, 'claude', config.model, 'parse_fail', latencyMs, 'empty_response');
      return { success: false, output: '', error: 'Empty Anthropic response', latencyMs, level };
    }

    if (options.expectJson) {
      // Try array first (e.g. DocCrossRef returns [...]), then object {...}
      const jsonMatch = output.match(/\[[\s\S]*\]/) || output.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          emitInferenceEvent(level, 'claude', config.model, 'ok', latencyMs);
          return { success: true, output, parsed, latencyMs, level };
        } catch {
          emitInferenceEvent(level, 'claude', config.model, 'parse_fail', latencyMs, 'json_invalid');
          return { success: false, output, error: 'Failed to parse JSON response', latencyMs, level };
        }
      }
      emitInferenceEvent(level, 'claude', config.model, 'parse_fail', latencyMs, 'no_json');
      return { success: false, output, error: 'No JSON found in response', latencyMs, level };
    }

    emitInferenceEvent(level, 'claude', config.model, 'ok', latencyMs);
    return { success: true, output, latencyMs, level };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    emitInferenceEvent(level, 'claude', config.model, 'fail', latencyMs, err.name === 'AbortError' ? 'timeout' : 'network');
    if (err.name === 'AbortError') {
      return { success: false, output: '', error: `Timeout after ${timeout}ms`, latencyMs, level };
    }
    return { success: false, output: '', error: err.message, latencyMs, level };
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  let expectJson = false;
  let timeout: number | undefined;
  let level: InferenceLevel = 'standard';
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      expectJson = true;
    } else if (args[i] === '--level' && args[i + 1]) {
      const requestedLevel = args[i + 1].toLowerCase();
      if (['fast', 'standard', 'smart', 'gemini', 'glm5'].includes(requestedLevel)) {
        level = requestedLevel as InferenceLevel;
      } else {
        console.error(`Invalid level: ${args[i + 1]}. Use fast, standard, or smart.`);
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      i++;
    } else {
      positionalArgs.push(args[i]);
    }
  }

  if (positionalArgs.length < 2) {
    console.error('Usage: bun Inference.ts [--level fast|standard|smart|gemini|glm5] [--json] [--timeout <ms>] <system_prompt> <user_prompt>');
    process.exit(1);
  }

  const [systemPrompt, userPrompt] = positionalArgs;

  const result = await inference({
    systemPrompt,
    userPrompt,
    level,
    expectJson,
    timeout,
  });

  if (result.success) {
    if (expectJson && result.parsed) {
      console.log(JSON.stringify(result.parsed));
    } else {
      console.log(result.output);
    }
  } else {
    console.error(`Error: ${result.error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(console.error);
}
