import { test, expect, describe } from 'bun:test';
import { runHook } from './harness';

const hook = 'hooks/ISCQualityGate.hook.ts';
const prd = 'MEMORY/WORK/20260315-test/PRD.md';
const isc = (id: number, text: string) => `- [ ] ISC-${id}: ${text}`;

const write = (path: string, content: string) => ({
  tool_name: 'Write', tool_input: { file_path: path, content },
});

describe('ISCQualityGate', () => {
  test('non-PRD file → continue', async () => {
    const r = await runHook(hook, write('/tmp/foo.ts', 'code'));
    expect(r.json).toEqual({ continue: true });
  });

  test('empty stdin → continue', async () => {
    const r = await runHook(hook, {} as any);
    expect(r.json).toEqual({ continue: true });
  });

  test('all behavioral criteria → continue', async () => {
    const content = [
      isc(1, 'User sees dashboard with real-time metrics after login'),
      isc(2, 'System returns 404 with helpful message for missing resources'),
      isc(3, 'Search results appear within two seconds of query submission'),
    ].join('\n');
    const r = await runHook(hook, write(prd, content));
    expect(r.json).toEqual({ continue: true });
  });

  test('>30% trivial → block with trivial ISC IDs', async () => {
    const content = [
      isc(1, 'User sees dashboard with real-time metrics after login'),
      isc(2, 'file exists'),                       // trivial: <5 words
      isc(3, 'no errors'),                         // trivial: <5 words + pattern
    ].join('\n');
    const r = await runHook(hook, write(prd, content));
    expect(r.json?.decision).toBe('block');
    expect(r.json?.reason).toContain('ISC-2');
    expect(r.json?.reason).toContain('ISC-3');
  });

  test('exactly 30% trivial → continue (threshold is >30%)', async () => {
    const good = (i: number) => isc(i, `Criterion ${i} validates full behavioral workflow end to end`);
    const content = [good(1),good(2),good(3),good(4),good(5),good(6),good(7),
      isc(8,'bad'),isc(9,'bad'),isc(10,'bad'), // 3/10 = 30% exactly
    ].join('\n');
    const r = await runHook(hook, write(prd, content));
    expect(r.json).toEqual({ continue: true });
  });

  test('Russian trivial patterns detected via regex', async () => {
    // \b in JS regex does not match Cyrillic word boundaries, so
    // only English-phrased patterns and <5-word criteria trigger.
    const content = [
      isc(1, 'User sees dashboard with real-time metrics after login'),
      isc(2, 'The config file exists after install completes now'),  // 'exists' match
      isc(3, 'Output has no errors when input is well-formed data'), // 'no errors' match
    ].join('\n');
    const r = await runHook(hook, write(prd, content));
    expect(r.json?.decision).toBe('block');
    expect(r.json?.reason).toContain('ISC-2');
    expect(r.json?.reason).toContain('ISC-3');
  });
});
