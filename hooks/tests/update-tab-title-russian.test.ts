import { expect, test, describe } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

describe('UpdateTabTitle.hook.ts SYSTEM_PROMPT', () => {
  const hookPath = path.join(process.cwd(), 'hooks', 'UpdateTabTitle.hook.ts');
  const fileContent = fs.readFileSync(hookPath, 'utf-8');

  // Extract the SYSTEM_PROMPT string using regex
  const systemPromptMatch = fileContent.match(/const SYSTEM_PROMPT = `([\s\S]*?)`;/);

  if (!systemPromptMatch) {
    throw new Error('Could not find SYSTEM_PROMPT in UpdateTabTitle.hook.ts');
  }

  const systemPrompt = systemPromptMatch[1];

  test('contains Russian text (Cyrillic characters)', () => {
    // Check for presence of Cyrillic characters
    expect(systemPrompt).toMatch(/[А-Яа-яЁё]/);
  });

  test('does NOT contain "Create a 2-4 word" (old English version)', () => {
    expect(systemPrompt).not.toContain('Create a 2-4 word');
  });

  test('contains "ПРАВИЛА" or "Создай" (Russian instruction keywords)', () => {
    const hasRulesOrCreate = systemPrompt.includes('ПРАВИЛА') || systemPrompt.includes('Создай');
    expect(hasRulesOrCreate).toBe(true);
  });

  test('example section uses Russian examples ("Чиню", "Проверяю", "Обновляю")', () => {
    expect(systemPrompt).toContain('Чиню');
    expect(systemPrompt).toContain('Проверяю');
    expect(systemPrompt).toContain('Обновляю');
  });

  test('instructs to respond in Russian ("русском" or "РУССКОМ")', () => {
    const hasRussianInstruction = systemPrompt.toLowerCase().includes('русском');
    expect(hasRussianInstruction).toBe(true);
  });
});
