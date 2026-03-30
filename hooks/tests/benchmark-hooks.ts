#!/usr/bin/env bun
/**
 * Hook Performance Benchmark
 *
 * Measures real cold-start latency of every registered PAI hook.
 * Runs each hook with minimal valid input and captures wall-clock time.
 *
 * Usage: bun hooks/tests/benchmark-hooks.ts [--runs N] [--warmup]
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const PAI_DIR = process.env.PAI_DIR || '/home/ser/.claude';
const HOOKS_DIR = resolve(PAI_DIR, 'hooks');
const NUM_RUNS = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--runs') || '3');
const WARMUP = process.argv.includes('--warmup');

// ── Hook Registry (from settings.json) ──────────────────────────────

interface HookEntry {
  name: string;
  file: string;
  event: string;
  matcher?: string;
  blocking: boolean;
}

const HOOKS: HookEntry[] = [
  // SessionStart
  { name: 'KittyEnvPersist', file: 'KittyEnvPersist.hook.ts', event: 'SessionStart', blocking: false },
  { name: 'StartupGreeting', file: 'StartupGreeting.hook.ts', event: 'SessionStart', blocking: false },
  { name: 'LoadContext', file: 'LoadContext.hook.ts', event: 'SessionStart', blocking: false },
  { name: 'BuildCLAUDE', file: 'handlers/BuildCLAUDE.ts', event: 'SessionStart', blocking: false },
  { name: 'PostCompactRecovery', file: 'PostCompactRecovery.hook.ts', event: 'SessionStart', matcher: 'compact', blocking: false },

  // UserPromptSubmit (most latency-sensitive — fires on every message)
  { name: 'ModeClassifier', file: 'ModeClassifier.hook.ts', event: 'UserPromptSubmit', blocking: true },
  { name: 'RatingCapture', file: 'RatingCapture.hook.ts', event: 'UserPromptSubmit', blocking: true },
  { name: 'AutoWorkCreation', file: 'AutoWorkCreation.hook.ts', event: 'UserPromptSubmit', blocking: true },
  { name: 'UpdateTabTitle', file: 'UpdateTabTitle.hook.ts', event: 'UserPromptSubmit', blocking: false },
  { name: 'SessionAutoName', file: 'SessionAutoName.hook.ts', event: 'UserPromptSubmit', blocking: false },

  // PreToolUse (blocking — on every tool call)
  { name: 'SecurityValidator (Bash)', file: 'SecurityValidator.hook.ts', event: 'PreToolUse', matcher: 'Bash', blocking: true },
  { name: 'SecurityValidator (Write)', file: 'SecurityValidator.hook.ts', event: 'PreToolUse', matcher: 'Write', blocking: true },
  { name: 'SecurityValidator (Read)', file: 'SecurityValidator.hook.ts', event: 'PreToolUse', matcher: 'Read', blocking: true },
  { name: 'SetQuestionTab', file: 'SetQuestionTab.hook.ts', event: 'PreToolUse', matcher: 'AskUserQuestion', blocking: true },
  { name: 'AgentExecutionGuard', file: 'AgentExecutionGuard.hook.ts', event: 'PreToolUse', matcher: 'Task', blocking: true },
  { name: 'SkillGuard', file: 'SkillGuard.hook.ts', event: 'PreToolUse', matcher: 'Skill', blocking: true },

  // PostToolUse
  { name: 'QuestionAnswered', file: 'QuestionAnswered.hook.ts', event: 'PostToolUse', matcher: 'AskUserQuestion', blocking: false },
  { name: 'AlgorithmTracker (Bash)', file: 'AlgorithmTracker.hook.ts', event: 'PostToolUse', matcher: 'Bash', blocking: false },
  { name: 'PRDSync (Write)', file: 'PRDSync.hook.ts', event: 'PostToolUse', matcher: 'Write', blocking: false },
  { name: 'PRDSync (Edit)', file: 'PRDSync.hook.ts', event: 'PostToolUse', matcher: 'Edit', blocking: false },

  // Stop
  { name: 'LastResponseCache', file: 'LastResponseCache.hook.ts', event: 'Stop', blocking: false },
  { name: 'ResponseTabReset', file: 'ResponseTabReset.hook.ts', event: 'Stop', blocking: false },
  { name: 'VoiceCompletion', file: 'VoiceCompletion.hook.ts', event: 'Stop', blocking: false },
  { name: 'DocIntegrity', file: 'DocIntegrity.hook.ts', event: 'Stop', blocking: false },
  { name: 'RelationshipMemory', file: 'RelationshipMemory.hook.ts', event: 'Stop', blocking: false },

  // SessionEnd
  { name: 'WorkCompletionLearning', file: 'WorkCompletionLearning.hook.ts', event: 'SessionEnd', blocking: false },
  { name: 'WisdomSync', file: 'WisdomSync.hook.ts', event: 'SessionEnd', blocking: false },
  { name: 'SessionCleanup', file: 'SessionCleanup.hook.ts', event: 'SessionEnd', blocking: false },
  { name: 'UpdateCounts', file: 'UpdateCounts.hook.ts', event: 'SessionEnd', blocking: false },
  { name: 'IntegrityCheck', file: 'IntegrityCheck.hook.ts', event: 'SessionEnd', blocking: false },

  // PreCompact
  { name: 'PreCompact', file: 'PreCompact.hook.ts', event: 'PreCompact', blocking: false },

  // ConfigChange
  { name: 'SecurityValidator (Config)', file: 'SecurityValidator.hook.ts', event: 'ConfigChange', blocking: false },

  // SubagentStart / SubagentStop / TaskCompleted (EventLogger)
  { name: 'EventLogger (SubagentStart)', file: 'EventLogger.hook.ts', event: 'SubagentStart', blocking: false },
  { name: 'EventLogger (SubagentStop)', file: 'EventLogger.hook.ts', event: 'SubagentStop', blocking: false },
  { name: 'EventLogger (TaskCompleted)', file: 'EventLogger.hook.ts', event: 'TaskCompleted', blocking: false },

  // WorktreeCreate / WorktreeRemove
  { name: 'WorktreeCreate', file: 'WorktreeCreate.hook.ts', event: 'WorktreeCreate', blocking: true },
  { name: 'WorktreeRemove', file: 'WorktreeRemove.hook.ts', event: 'WorktreeRemove', blocking: true },
];

// ── Input generators for each event type ────────────────────────────

function generateInput(hook: HookEntry): string {
  const base = {
    session_id: 'perf-bench-001',
    hook_event_name: hook.event,
    transcript_so_far: '',
  };

  switch (hook.event) {
    case 'SessionStart':
      return JSON.stringify({ ...base });

    case 'UserPromptSubmit':
      return JSON.stringify({
        ...base,
        prompt: 'Measure hook performance baseline',
        user_prompt: 'Measure hook performance baseline',
      });

    case 'PreToolUse':
      if (hook.matcher === 'Bash') {
        return JSON.stringify({
          ...base,
          tool_name: 'Bash',
          tool_input: { command: 'echo hello' },
        });
      } else if (hook.matcher === 'Write') {
        return JSON.stringify({
          ...base,
          tool_name: 'Write',
          tool_input: { file_path: '/tmp/test.txt', content: 'test' },
        });
      } else if (hook.matcher === 'Read') {
        return JSON.stringify({
          ...base,
          tool_name: 'Read',
          tool_input: { file_path: '/tmp/test.txt' },
        });
      } else if (hook.matcher === 'Edit') {
        return JSON.stringify({
          ...base,
          tool_name: 'Edit',
          tool_input: { file_path: '/tmp/test.txt', old_string: 'a', new_string: 'b' },
        });
      } else if (hook.matcher === 'AskUserQuestion') {
        return JSON.stringify({
          ...base,
          tool_name: 'AskUserQuestion',
          tool_input: { question: 'test?' },
        });
      } else if (hook.matcher === 'Task') {
        return JSON.stringify({
          ...base,
          tool_name: 'Task',
          tool_input: { description: 'test task' },
        });
      } else if (hook.matcher === 'Skill') {
        return JSON.stringify({
          ...base,
          tool_name: 'Skill',
          tool_input: { skill: 'test' },
        });
      }
      return JSON.stringify({ ...base, tool_name: hook.matcher || 'Bash', tool_input: {} });

    case 'PostToolUse':
      if (hook.matcher === 'AskUserQuestion') {
        return JSON.stringify({
          ...base,
          tool_name: 'AskUserQuestion',
          tool_input: { question: 'test?' },
          tool_output: 'yes',
        });
      } else if (hook.matcher === 'Bash') {
        return JSON.stringify({
          ...base,
          tool_name: 'Bash',
          tool_input: { command: 'echo hello' },
          tool_output: 'hello',
        });
      } else if (hook.matcher === 'Write' || hook.matcher === 'Edit') {
        return JSON.stringify({
          ...base,
          tool_name: hook.matcher,
          tool_input: { file_path: '/tmp/test.txt' },
          tool_output: 'ok',
        });
      } else if (hook.matcher === 'TaskCreate' || hook.matcher === 'TaskUpdate' || hook.matcher === 'Task') {
        return JSON.stringify({
          ...base,
          tool_name: hook.matcher,
          tool_input: { description: 'test' },
          tool_output: 'ok',
        });
      }
      return JSON.stringify({ ...base, tool_name: hook.matcher || 'Bash', tool_input: {}, tool_output: '' });

    case 'Stop':
      return JSON.stringify({
        ...base,
        stop_hook_active: true,
        transcript_so_far: 'User: test\nAssistant: test response.',
      });

    case 'SessionEnd':
      return JSON.stringify({
        ...base,
        transcript_so_far: 'User: test\nAssistant: test response.',
      });

    case 'PreCompact':
      return JSON.stringify({
        ...base,
        transcript_so_far: 'User: test\nAssistant: test response.',
      });

    case 'ConfigChange':
      return JSON.stringify({
        ...base,
        config_changes: { hooks: {} },
      });

    case 'SubagentStart':
    case 'SubagentStop':
      return JSON.stringify({
        ...base,
        agent_name: 'test-agent',
        agent_type: 'engineer',
      });

    case 'TaskCompleted':
      return JSON.stringify({
        ...base,
        task_id: 'test-task-001',
        task_result: 'success',
      });

    case 'WorktreeCreate':
      return JSON.stringify({
        ...base,
        worktree_name: 'perf-bench-test',
        // Don't actually create a worktree - just measure parse/startup time
      });

    case 'WorktreeRemove':
      return JSON.stringify({
        ...base,
        worktree_path: '/tmp/nonexistent-worktree',
      });

    default:
      return JSON.stringify(base);
  }
}

// ── Runner ──────────────────────────────────────────────────────────

interface BenchResult {
  hook: HookEntry;
  latencies: number[];
  median: number;
  min: number;
  max: number;
  p95: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  error?: string;
}

async function runHook(hook: HookEntry, input: string, timeoutMs = 10000): Promise<{ latency: number; exitCode: number; stdout: string; stderr: string }> {
  const hookPath = resolve(HOOKS_DIR, hook.file);
  const start = performance.now();

  return new Promise((res) => {
    const proc = spawn('bun', [hookPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PAI_DIR, NODE_ENV: 'benchmark' },
      timeout: timeoutMs,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const latency = performance.now() - start;
      res({ latency, exitCode: code ?? 1, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    proc.on('error', (err) => {
      const latency = performance.now() - start;
      res({ latency, exitCode: -1, stdout: '', stderr: err.message });
    });

    // Write input and close stdin
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil(sorted.length * p / 100) - 1;
  return sorted[Math.max(0, idx)];
}

async function benchmarkHook(hook: HookEntry): Promise<BenchResult> {
  const input = generateInput(hook);
  const latencies: number[] = [];
  let lastExitCode = 0;
  let lastStdout = '';
  let lastStderr = '';

  // Optional warmup run
  if (WARMUP) {
    await runHook(hook, input, 15000);
  }

  for (let i = 0; i < NUM_RUNS; i++) {
    const result = await runHook(hook, input, 15000);
    latencies.push(result.latency);
    lastExitCode = result.exitCode;
    lastStdout = result.stdout;
    lastStderr = result.stderr;
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    hook,
    latencies,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p95: percentile(sorted, 95),
    exitCode: lastExitCode,
    stdout: lastStdout.slice(0, 200),
    stderr: lastStderr.slice(0, 200),
  };
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n=== PAI Hook Performance Benchmark ===`);
  console.log(`Runs per hook: ${NUM_RUNS} | Warmup: ${WARMUP ? 'yes' : 'no'}`);
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  // Skip WorktreeCreate/Remove — they have real side effects
  const skipHooks = ['WorktreeCreate', 'WorktreeRemove'];
  const hooksToRun = HOOKS.filter(h => !skipHooks.includes(h.name));

  console.log(`Benchmarking ${hooksToRun.length} hooks (skipping ${skipHooks.join(', ')})...\n`);

  const results: BenchResult[] = [];

  for (const hook of hooksToRun) {
    process.stdout.write(`  ${hook.name.padEnd(35)} `);
    const result = await benchmarkHook(hook);
    results.push(result);
    const status = result.exitCode === 0 ? 'OK' : result.exitCode === 2 ? 'BLOCK' : `exit(${result.exitCode})`;
    console.log(`${result.median.toFixed(0).padStart(6)}ms median  [${status}]`);
  }

  // Sort by median latency descending
  results.sort((a, b) => b.median - a.median);

  // ── Print Results Table ──
  console.log('\n\n=== RESULTS (sorted by median latency, descending) ===\n');
  console.log('| # | Hook | Event | Matcher | Blocking | Median (ms) | Min (ms) | Max (ms) | P95 (ms) | Exit | Notes |');
  console.log('|---|------|-------|---------|----------|-------------|----------|----------|----------|------|-------|');

  results.forEach((r, i) => {
    const notes: string[] = [];
    if (r.median > 500) notes.push('SLOW');
    if (r.median > 200 && r.hook.blocking) notes.push('BLOCKING-HOT');
    if (r.exitCode !== 0) notes.push(`exit=${r.exitCode}`);
    if (r.stderr && r.exitCode !== 0) notes.push(r.stderr.slice(0, 60).replace(/\n/g, ' '));

    console.log(
      `| ${(i + 1).toString().padStart(2)} ` +
      `| ${r.hook.name.padEnd(35)} ` +
      `| ${r.hook.event.padEnd(18)} ` +
      `| ${(r.hook.matcher || '-').padEnd(16)} ` +
      `| ${r.hook.blocking ? 'YES' : 'no'} `.padEnd(11) +
      `| ${r.median.toFixed(1).padStart(11)} ` +
      `| ${r.min.toFixed(1).padStart(8)} ` +
      `| ${r.max.toFixed(1).padStart(8)} ` +
      `| ${r.p95.toFixed(1).padStart(8)} ` +
      `| ${r.exitCode.toString().padStart(4)} ` +
      `| ${notes.join(', ')} |`
    );
  });

  // ── Summary Statistics ──
  console.log('\n\n=== SUMMARY ===\n');

  const allMedians = results.map(r => r.median);
  const totalMedian = allMedians.reduce((a, b) => a + b, 0);
  const blockingResults = results.filter(r => r.hook.blocking);
  const blockingTotal = blockingResults.reduce((a, b) => a + b.median, 0);

  console.log(`Total hooks measured:     ${results.length}`);
  console.log(`Total median latency:     ${totalMedian.toFixed(0)}ms (sum of all hooks)`);
  console.log(`Blocking hooks:           ${blockingResults.length} (total: ${blockingTotal.toFixed(0)}ms)`);
  console.log(`Non-blocking hooks:       ${results.length - blockingResults.length}`);
  console.log(`Fastest hook:             ${results[results.length - 1]?.hook.name} (${results[results.length - 1]?.median.toFixed(1)}ms)`);
  console.log(`Slowest hook:             ${results[0]?.hook.name} (${results[0]?.median.toFixed(1)}ms)`);

  // ── Per-Event Aggregation ──
  console.log('\n\n=== PER-EVENT LATENCY (user-perceived) ===\n');
  console.log('| Event | Hooks | Total Median (ms) | Blocking (ms) | Max Single (ms) | Impact |');
  console.log('|-------|-------|-------------------|---------------|-----------------|--------|');

  const events = [...new Set(results.map(r => r.hook.event))];
  const eventStats = events.map(event => {
    const eventHooks = results.filter(r => r.hook.event === event);
    const totalMs = eventHooks.reduce((a, b) => a + b.median, 0);
    const blockingMs = eventHooks.filter(h => h.hook.blocking).reduce((a, b) => a + b.median, 0);
    const maxSingle = Math.max(...eventHooks.map(h => h.median));
    let impact = 'LOW';
    if (event === 'UserPromptSubmit' || event === 'PreToolUse') impact = totalMs > 200 ? 'CRITICAL' : totalMs > 100 ? 'HIGH' : 'MEDIUM';
    else if (event === 'Stop') impact = totalMs > 500 ? 'HIGH' : 'MEDIUM';
    return { event, count: eventHooks.length, totalMs, blockingMs, maxSingle, impact };
  }).sort((a, b) => b.totalMs - a.totalMs);

  for (const s of eventStats) {
    console.log(
      `| ${s.event.padEnd(18)} ` +
      `| ${s.count.toString().padStart(5)} ` +
      `| ${s.totalMs.toFixed(1).padStart(17)} ` +
      `| ${s.blockingMs.toFixed(1).padStart(13)} ` +
      `| ${s.maxSingle.toFixed(1).padStart(15)} ` +
      `| ${s.impact.padEnd(8)} |`
    );
  }

  // ── UserPromptSubmit specific (critical path) ──
  console.log('\n\n=== CRITICAL PATH: UserPromptSubmit (fires on EVERY user message) ===\n');
  const upsHooks = results.filter(r => r.hook.event === 'UserPromptSubmit').sort((a, b) => b.median - a.median);
  let cumulative = 0;
  for (const r of upsHooks) {
    cumulative += r.median;
    console.log(`  ${r.hook.name.padEnd(30)} ${r.median.toFixed(1).padStart(8)}ms  (cumulative: ${cumulative.toFixed(0)}ms)`);
  }
  console.log(`  ${'TOTAL'.padEnd(30)} ${cumulative.toFixed(1).padStart(8)}ms  ← user waits this long before AI sees prompt`);

  // ── PreToolUse specific (blocking on every tool) ──
  console.log('\n\n=== CRITICAL PATH: PreToolUse (fires on EVERY tool call, BLOCKING) ===\n');
  const ptuHooks = results.filter(r => r.hook.event === 'PreToolUse').sort((a, b) => b.median - a.median);
  // Note: only the matched hook fires, not all of them
  for (const r of ptuHooks) {
    console.log(`  ${r.hook.name.padEnd(35)} ${r.median.toFixed(1).padStart(8)}ms  (blocks tool until done)`);
  }
  console.log(`  Note: Only the matcher-matched hook fires per tool call, not all of them.`);
}

main().catch(console.error);
