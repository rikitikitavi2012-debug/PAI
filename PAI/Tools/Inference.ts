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
 * BILLING: Claude levels use CLI subscription. Gemini uses GOOGLE_API_KEY (free 1000/day, Pro 5x).
 *
 * ============================================================================
 */

import { spawn } from "child_process";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

/** Emit inference event to events.jsonl (fire-and-forget, never throws) */
function emitInferenceEvent(level: InferenceLevel, provider: string, model: string, success: boolean, latencyMs: number): void {
  try {
    const eventsPath = join(process.env.HOME || '', '.claude', 'MEMORY', 'STATE', 'events.jsonl');
    const dir = dirname(eventsPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const event = {
      type: `inference.${success ? 'ok' : 'fail'}`,
      source: 'Inference',
      data: { level, provider, model, latency_s: (latencyMs / 1000).toFixed(1) },
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

// Level configurations
const LEVEL_CONFIG: Record<InferenceLevel, { model: string; defaultTimeout: number; provider: 'claude' | 'gemini' | 'zai' }> = {
  fast: { model: 'haiku', defaultTimeout: 15000, provider: 'claude' },
  standard: { model: 'sonnet', defaultTimeout: 30000, provider: 'claude' },
  smart: { model: 'opus', defaultTimeout: 90000, provider: 'claude' },
  gemini: { model: 'gemini-pro', defaultTimeout: 30000, provider: 'gemini' },
  glm5: { model: 'glm-5', defaultTimeout: 30000, provider: 'zai' },
};

/**
 * Run inference via Z.AI (GLM-5) OpenAI-compatible API
 */
async function inferenceZai(options: InferenceOptions, level: InferenceLevel, timeout: number): Promise<InferenceResult> {
  const startTime = Date.now();
  const config = LEVEL_CONFIG[level];

  // Load ZAI_API_KEY from PAI .env
  const envPath = `${process.env.HOME}/.config/PAI/.env`;
  let apiKey = process.env.ZAI_API_KEY || '';
  if (!apiKey) {
    try {
      const envContent = require('fs').readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^ZAI_API_KEY=(.+)$/m);
      if (match) apiKey = match[1].trim();
    } catch {}
  }

  if (!apiKey) {
    return { success: false, output: '', error: 'No ZAI_API_KEY found', latencyMs: Date.now() - startTime, level };
  }

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
        model: config.model,
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

  // Load GOOGLE_API_KEY from PAI .env
  const envPath = `${process.env.HOME}/.config/PAI/.env`;
  let apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '';
  if (!apiKey) {
    try {
      const envContent = require('fs').readFileSync(envPath, 'utf-8');
      const match = envContent.match(/^GOOGLE_API_KEY=(.+)$/m);
      if (match) apiKey = match[1].trim();
    } catch {}
  }

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
    emitInferenceEvent(level, 'gemini', config.model, result.success, result.latencyMs);
    return result;
  }
  if (config.provider === 'zai') {
    const result = await inferenceZai(options, level, timeout);
    emitInferenceEvent(level, 'zai', config.model, result.success, result.latencyMs);
    return result;
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    // Build environment WITHOUT ANTHROPIC_API_KEY to force subscription auth
    // Also unset CLAUDECODE so nested `claude` invocations don't trigger the
    // nested-session guard (hooks run inside Claude Code's environment).
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.CLAUDECODE;

    const args = [
      '--print',
      '--model', config.model,
      '--tools', '',  // Disable tools for faster response
      '--output-format', 'text',
      '--setting-sources', '',  // Disable hooks to prevent recursion
      '--system-prompt', options.systemPrompt,
    ];

    let stdout = '';
    let stderr = '';

    const proc = spawn('claude', args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Write prompt via stdin to avoid ARG_MAX limits on large inputs
    proc.stdin.write(options.userPrompt);
    proc.stdin.end();

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle timeout
    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      const latencyMs = Date.now() - startTime;
      emitInferenceEvent(level, 'claude', config.model, false, latencyMs);
      resolve({
        success: false,
        output: '',
        error: `Timeout after ${timeout}ms`,
        latencyMs,
        level,
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (code !== 0) {
        emitInferenceEvent(level, 'claude', config.model, false, latencyMs);
        resolve({
          success: false,
          output: stdout,
          error: stderr || `Process exited with code ${code}`,
          latencyMs,
          level,
        });
        return;
      }

      const output = stdout.trim();

      // Parse JSON if requested
      if (options.expectJson) {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            emitInferenceEvent(level, 'claude', config.model, true, latencyMs);
            resolve({
              success: true,
              output,
              parsed,
              latencyMs,
              level,
            });
            return;
          } catch {
            emitInferenceEvent(level, 'claude', config.model, false, latencyMs);
            resolve({
              success: false,
              output,
              error: 'Failed to parse JSON response',
              latencyMs,
              level,
            });
            return;
          }
        }
        emitInferenceEvent(level, 'claude', config.model, false, latencyMs);
        resolve({
          success: false,
          output,
          error: 'No JSON found in response',
          latencyMs,
          level,
        });
        return;
      }

      emitInferenceEvent(level, 'claude', config.model, true, latencyMs);
      resolve({
        success: true,
        output,
        latencyMs,
        level,
      });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      emitInferenceEvent(level, 'claude', config.model, false, latencyMs);
      resolve({
        success: false,
        output: '',
        error: err.message,
        latencyMs,
        level,
      });
    });
  });
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
