import { describe, test, expect } from 'bun:test';
import { join } from 'path';

const hooksToTest = [
  'SecurityValidator',
  'LearnGate',
  'SetQuestionTab',
  'AgentExecutionGuard',
  'SkillGuard'
];

describe('PreToolUse hooks fail-open behavior on empty stdin', () => {
  for (const hookName of hooksToTest) {
    test(`${hookName} should handle empty stdin gracefully`, () => {
      const hookPath = join(import.meta.dir, '..', `${hookName}.hook.ts`);

      const proc = Bun.spawnSync(['bun', hookPath], {
        stdin: new Blob(['']),
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          PAI_DIR: join(import.meta.dir, '..', '..')
        }
      });

      const stdoutText = proc.stdout.toString().trim();
      const stderrText = proc.stderr.toString().trim();

      // 1. Проверить что exit code = 0
      expect(proc.exitCode).toBe(0);

      // 2. Проверить что stderr пустой (нет ошибок)
      expect(stderrText).toBe('');

      // 3. Проверить что stdout содержит валидный JSON
      let parsedOutput;
      try {
        parsedOutput = JSON.parse(stdoutText);
      } catch (e) {
        throw new Error(`Output is not valid JSON: '${stdoutText}'`);
      }

      // 4. Проверить что stdout содержит 'continue' (fail-open)
      const jsonStr = JSON.stringify(parsedOutput);
      expect(jsonStr).toContain('continue');
    });
  }
});
