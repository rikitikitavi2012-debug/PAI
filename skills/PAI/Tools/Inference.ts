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
 *   bun Inference.ts --json --level fast <system_prompt> <user_prompt>
 *
 * OPTIONS:
 *   --level <fast|standard|smart>  Run level (default: standard)
 *   --json                         Expect and parse JSON response
 *   --timeout <ms>                 Custom timeout (default varies by level)
 *
 * DEFAULTS BY LEVEL:
 *   fast:     model=haiku,   timeout=15s
 *   standard: model=sonnet,  timeout=30s
 *   smart:    model=opus,    timeout=90s
 *
 * STRATEGY:
 * 1. If ANTHROPIC_API_KEY available → direct API call (2-5s latency)
 * 2. Fallback → claude --print subprocess (14-90s latency)
 *
 * ============================================================================
 */

import { spawn } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export type InferenceLevel = 'fast' | 'standard' | 'smart';

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
const LEVEL_CONFIG: Record<InferenceLevel, { model: string; apiModel: string; defaultTimeout: number }> = {
  fast: { model: 'haiku', apiModel: 'claude-haiku-4-5-20251001', defaultTimeout: 15000 },
  standard: { model: 'sonnet', apiModel: 'claude-sonnet-4-6', defaultTimeout: 30000 },
  smart: { model: 'opus', apiModel: 'claude-opus-4-6', defaultTimeout: 90000 },
};

const API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

// ── API Key Loading ──

function loadApiKey(): string | null {
  // 1. Check environment variable
  if (process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  // 2. Check ~/.env file
  const envFile = join(process.env.HOME!, '.env');
  if (existsSync(envFile)) {
    try {
      const content = readFileSync(envFile, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed) continue;
        const match = trimmed.match(/^ANTHROPIC_API_KEY\s*=\s*(.+)$/);
        if (match) {
          return match[1].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {}
  }

  return null;
}

// ── Direct API Inference ──

async function inferenceDirectAPI(
  options: InferenceOptions,
  apiKey: string,
  config: typeof LEVEL_CONFIG[InferenceLevel],
  timeout: number,
): Promise<InferenceResult> {
  const level = options.level || 'standard';
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
      },
      body: JSON.stringify({
        model: config.apiModel,
        max_tokens: 4096,
        system: options.systemPrompt,
        messages: [
          { role: 'user', content: options.userPrompt },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        output: '',
        error: `API ${response.status}: ${errorBody.slice(0, 200)}`,
        latencyMs,
        level,
      };
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
    };

    const output = data.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    // Parse JSON if requested
    if (options.expectJson) {
      // Try both object and array matches — use whichever parses successfully
      // Greedy regex can capture invalid substrings when JSON objects contain arrays,
      // so we try parsing each candidate rather than assuming one is correct.
      const objectMatch = output.match(/\{[\s\S]*\}/);
      const arrayMatch = output.match(/\[[\s\S]*\]/);

      for (const candidate of [objectMatch?.[0], arrayMatch?.[0]]) {
        if (!candidate) continue;
        try {
          const parsed = JSON.parse(candidate);
          return { success: true, output, parsed, latencyMs, level };
        } catch { /* try next candidate */ }
      }
      return { success: false, output, error: 'Failed to parse JSON response', latencyMs, level };
    }

    return { success: true, output, latencyMs, level };

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('abort')) {
      return { success: false, output: '', error: `Timeout after ${timeout}ms`, latencyMs, level };
    }

    return { success: false, output: '', error: message, latencyMs, level };
  }
}

// ── Subprocess Inference (fallback) ──

function inferenceSubprocess(
  options: InferenceOptions,
  config: typeof LEVEL_CONFIG[InferenceLevel],
  timeout: number,
): Promise<InferenceResult> {
  const level = options.level || 'standard';
  const startTime = Date.now();

  return new Promise((resolve) => {
    const env = { ...process.env };
    delete env.ANTHROPIC_API_KEY;
    delete env.CLAUDECODE;

    const args = [
      '--print',
      '--model', config.model,
      '--tools', '',
      '--output-format', 'text',
      '--setting-sources', '',
      '--system-prompt', options.systemPrompt,
    ];

    let stdout = '';
    let stderr = '';

    const proc = spawn('claude', args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    proc.stdin.write(options.userPrompt);
    proc.stdin.end();

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    const timeoutId = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({
        success: false, output: '',
        error: `Timeout after ${timeout}ms`,
        latencyMs: Date.now() - startTime, level,
      });
    }, timeout);

    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;

      if (code !== 0) {
        resolve({ success: false, output: stdout, error: stderr || `Process exited with code ${code}`, latencyMs, level });
        return;
      }

      const output = stdout.trim();

      if (options.expectJson) {
        const objectMatch = output.match(/\{[\s\S]*\}/);
        const arrayMatch = output.match(/\[[\s\S]*\]/);

        for (const candidate of [objectMatch?.[0], arrayMatch?.[0]]) {
          if (!candidate) continue;
          try {
            const parsed = JSON.parse(candidate);
            resolve({ success: true, output, parsed, latencyMs, level });
            return;
          } catch { /* try next candidate */ }
        }
        resolve({ success: false, output, error: 'Failed to parse JSON response', latencyMs, level });
        return;
      }

      resolve({ success: true, output, latencyMs, level });
    });

    proc.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({ success: false, output: '', error: err.message, latencyMs: Date.now() - startTime, level });
    });
  });
}

// ── Public API ──

/**
 * Run inference with configurable level.
 * Uses direct API when ANTHROPIC_API_KEY is available, falls back to claude --print.
 */
export async function inference(options: InferenceOptions): Promise<InferenceResult> {
  const level = options.level || 'standard';
  const config = LEVEL_CONFIG[level];
  const timeout = options.timeout || config.defaultTimeout;

  // Try direct API first
  const apiKey = loadApiKey();
  if (apiKey) {
    return inferenceDirectAPI(options, apiKey, config, timeout);
  }

  // Fallback to subprocess
  return inferenceSubprocess(options, config, timeout);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  let expectJson = false;
  let timeout: number | undefined;
  let level: InferenceLevel = 'standard';
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      expectJson = true;
    } else if (args[i] === '--level' && args[i + 1]) {
      const requestedLevel = args[i + 1].toLowerCase();
      if (['fast', 'standard', 'smart'].includes(requestedLevel)) {
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
    console.error('Usage: bun Inference.ts [--level fast|standard|smart] [--json] [--timeout <ms>] <system_prompt> <user_prompt>');
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
