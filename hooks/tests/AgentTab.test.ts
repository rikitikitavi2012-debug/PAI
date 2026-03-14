import { it, expect, describe, beforeEach, afterEach } from 'bun:test';
import { runHook, createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

describe('AgentTab', () => {
  const hook = 'hooks/AgentTab.hook.ts';
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir('pai-agenttab-');
    // Мокаем скрипт agent-live.sh, чтобы хук проходил проверку existsSync и доходил до вызова kitty
    const kittyScriptDir = join(tempDir, '.config/kitty/scripts');
    mkdirSync(kittyScriptDir, { recursive: true });
    writeFileSync(join(kittyScriptDir, 'agent-live.sh'), '#!/bin/bash\necho mock');
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('Хук завершается без ошибок при SubagentStart событии', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_id: 'test-agent-start',
      agent_type: 'Explorer',
      description: 'Search files'
    }, { HOME: tempDir });
    expect(result.exitCode).toBe(0);
  });

  it('Хук завершается без ошибок при SubagentStop событии', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStop',
      agent_id: 'test-agent-stop'
    }, { HOME: tempDir });
    expect(result.exitCode).toBe(0);
  });

  it('Хук корректно обрабатывает пустой input', async () => {
    const result = await runHook(hook, {}, { HOME: tempDir });
    expect(result.exitCode).toBe(0);
  });

  it('Хук завершается быстро (< 500ms)', async () => {
    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_id: 'test-agent-perf',
      agent_type: 'PerformanceTest'
    }, { HOME: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.duration).toBeLessThan(500);
  });

  it('Хук не падает при отсутствии Kitty (graceful degradation)', async () => {
    // Подменяем PATH на пустую директорию, чтобы kitty не был найден,
    // если он ищется через PATH. В любом случае spawnSync вернет ошибку, которую хук не должен пробросить с крэшем.
    const emptyPathDir = join(tempDir, 'empty-bin');
    mkdirSync(emptyPathDir, { recursive: true });

    // Ensure bun is available in the new PATH by symlinking it
    try {
      const bunPath = process.argv[0]; // Gets the path to the current bun executable
      writeFileSync(join(emptyPathDir, 'bun'), `#!/bin/bash\nexec ${bunPath} "$@"\n`, { mode: 0o755 });
    } catch {}

    const result = await runHook(hook, {
      hook_event_name: 'SubagentStart',
      agent_id: 'test-agent-graceful',
      agent_type: 'NoKittyTest'
    }, { HOME: tempDir, PATH: emptyPathDir });

    expect(result.exitCode).toBe(0);
  });
});
