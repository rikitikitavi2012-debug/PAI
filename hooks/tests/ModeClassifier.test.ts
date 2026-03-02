import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

describe('ModeClassifier', () => {
  const hook = 'hooks/ModeClassifier.hook.ts';
  const baseInput = { session_id: 'test-mc-001', hook_event_name: 'UserPromptSubmit' };

  // ── MINIMAL classifications ──

  test('classifies Russian greeting as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'Привет!' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
    expect(result.stderr).toContain('MINIMAL');
  });

  test('classifies English greeting as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'Hello' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });

  test('classifies numeric rating as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: '9' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });

  test('classifies rating with comment as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: '8/10 — хорошо' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });

  test('classifies thanks as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'Спасибо!' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });

  test('classifies ack as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'ок' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });

  test('classifies short feedback as MINIMAL', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'Отлично!' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('MINIMAL');
  });

  // ── ALGORITHM classifications ──

  test('classifies task request as ALGORITHM', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'Добавь кнопку на дашборд' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ALGORITHM');
  });

  test('classifies long prompt as ALGORITHM', async () => {
    const prompt = 'Мне нужно провести аудит всех хуков в системе и создать тесты для каждого из них чтобы убедиться что всё работает корректно';
    const result = await runHook(hook, { ...baseInput, prompt });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ALGORITHM');
  });

  test('classifies ack with task continuation as ALGORITHM', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'ок, продолжай' });
    expect(result.exitCode).toBe(0);
    expect(result.json?.additionalContext).toContain('ALGORITHM');
  });

  // ── Edge cases ──

  test('handles empty prompt gracefully', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: '' });
    expect(result.exitCode).toBe(0);
    expect(result.json).toBeTruthy();
  });

  test('handles missing prompt field', async () => {
    const result = await runHook(hook, { session_id: 'test' });
    expect(result.exitCode).toBe(0);
  });

  test('executes under 200ms', async () => {
    const result = await runHook(hook, { ...baseInput, prompt: 'test' });
    expect(result.duration).toBeLessThan(200);
  });
});
