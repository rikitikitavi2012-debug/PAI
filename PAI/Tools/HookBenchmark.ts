#!/usr/bin/env bun
/**
 * Hook Benchmark Wrapper for Autoresearch
 *
 * Outputs single metric value for experiments.tsv
 *
 * Usage:
 *   bun HookBenchmark.ts --average          # UserPromptSubmit total (default)
 *   bun HookBenchmark.ts --average --metric ups_blocking  # Blocking only
 *   bun HookBenchmark.ts --average --metric ptu_max       # Max PreToolUse
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const PAI_DIR = process.env.PAI_DIR || '/home/ser/.claude';
const BENCH_SCRIPT = resolve(PAI_DIR, 'hooks/tests/benchmark-hooks.ts');

type MetricType = 'ups_total' | 'ups_blocking' | 'ptu_max' | 'all';

const metricType: MetricType = (process.argv.includes('--metric')
  ? process.argv[process.argv.indexOf('--metric') + 1]
  : 'ups_total') as MetricType;

async function runBenchmark(): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bun', [BENCH_SCRIPT, '--runs', '3'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PAI_DIR },
      timeout: 120000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Benchmark failed: ${stderr}`));
        return;
      }
      resolve(stdout);
    });

    proc.on('error', (err) => reject(err));
  });
}

function parseBenchmarkOutput(output: string): {
  upsTotal: number;
  upsBlocking: number;
  ptuMax: number;
} {
  // Parse UserPromptSubmit total from:
  // "TOTAL                            1646.4ms  ← user waits..."
  const upsMatch = output.match(/TOTAL\s+([\d.]+)ms\s+← user waits/);
  const upsTotal = upsMatch ? parseFloat(upsMatch[1]) : 0;

  // Parse blocking total from:
  // "| UserPromptSubmit   |     5 |            1646.4 |         956.6 |"
  const upsBlockingMatch = output.match(/UserPromptSubmit\s+\|\s+\d+\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);
  const upsBlocking = upsBlockingMatch ? parseFloat(upsBlockingMatch[1]) : 0;

  // Parse max PreToolUse from individual entries
  // "SecurityValidator (Read)                68.6ms  (blocks tool"
  const ptuMatches = output.matchAll(/blocks tool until done\)/g);
  const ptuValues: number[] = [];
  const ptuLines = output.split('\n').filter(l => l.includes('blocks tool until done'));
  for (const line of ptuLines) {
    const match = line.match(/([\d.]+)ms/);
    if (match) ptuValues.push(parseFloat(match[1]));
  }
  const ptuMax = ptuValues.length > 0 ? Math.max(...ptuValues) : 0;

  return { upsTotal, upsBlocking, ptuMax };
}

async function main() {
  try {
    const output = await runBenchmark();
    const metrics = parseBenchmarkOutput(output);

    if (process.argv.includes('--all') || metricType === 'all') {
      console.log(JSON.stringify(metrics, null, 2));
    } else {
      switch (metricType) {
        case 'ups_total':
          console.log(metrics.upsTotal.toFixed(1));
          break;
        case 'ups_blocking':
          console.log(metrics.upsBlocking.toFixed(1));
          break;
        case 'ptu_max':
          console.log(metrics.ptuMax.toFixed(1));
          break;
        default:
          console.log(metrics.upsTotal.toFixed(1));
      }
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
