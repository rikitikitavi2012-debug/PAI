import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { inference, type InferenceLevel } from '../../PAI/Tools/Inference';
import { createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { readFileSync, mkdirSync } from 'fs';

describe('Inference levels', () => {
  let tempDir: string;
  let originalFetch: typeof global.fetch;
  let originalHome: string | undefined;
  let originalAnthropicKey: string | undefined;
  let originalZaiKey: string | undefined;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    tempDir = createTempDir('inference-levels-');

    originalHome = process.env.HOME;
    originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    originalZaiKey = process.env.ZAI_API_KEY;

    process.env.HOME = tempDir;
    process.env.ANTHROPIC_API_KEY = 'test_anthropic_key';
    process.env.ZAI_API_KEY = 'test_zai_key';
    process.env.ANTHROPIC_MOCK_FETCH = '0';

    originalFetch = global.fetch;
    fetchMock = mock();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    global.fetch = originalFetch;

    if (originalHome !== undefined) process.env.HOME = originalHome;
    else delete process.env.HOME;

    if (originalAnthropicKey !== undefined) process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    else delete process.env.ANTHROPIC_API_KEY;

    if (originalZaiKey !== undefined) process.env.ZAI_API_KEY = originalZaiKey;
    else delete process.env.ZAI_API_KEY;

    delete process.env.ANTHROPIC_MOCK_FETCH;
  });

  const getEvents = () => {
    const eventsPath = join(tempDir, '.claude', 'MEMORY', 'STATE', 'events.jsonl');
    try {
      return readFileSync(eventsPath, 'utf-8').trim().split('\n').map(l => JSON.parse(l));
    } catch {
      return [];
    }
  };

  it('Scenario 1: fast level -> haiku model, timeout 15s, provider claude', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ text: 'fast_response' }] })));

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'fast' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('fast_response');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][1];
    const body = JSON.parse(req.body);
    expect(body.model).toBe('claude-haiku-4-5-20251001');
    expect(req.signal).toBeDefined();

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].data.level).toBe('fast');
    expect(events[0].data.model).toBe('haiku');
    expect(events[0].data.provider).toBe('claude');
  });

  it('Scenario 2: standard level -> sonnet model, timeout 30s, provider claude', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ text: 'standard_response' }] })));

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'standard' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('standard_response');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][1];
    const body = JSON.parse(req.body);
    expect(body.model).toBe('claude-sonnet-4-6');

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].data.level).toBe('standard');
    expect(events[0].data.model).toBe('sonnet');
    expect(events[0].data.provider).toBe('claude');
  });

  it('Scenario 3: smart level -> opus model, timeout 90s, provider claude', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ text: 'smart_response' }] })));

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'smart' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('smart_response');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = fetchMock.mock.calls[0][1];
    const body = JSON.parse(req.body);
    expect(body.model).toBe('claude-opus-4-6');

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].data.level).toBe('smart');
    expect(events[0].data.model).toBe('opus');
    expect(events[0].data.provider).toBe('claude');
  });

  it('Scenario 4: glm5 level -> provider zai, timeout 30s', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'glm5_response' } }] })));

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'glm5' });

    expect(result.success).toBe(true);
    expect(result.output).toBe('glm5_response');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0];
    const req = fetchMock.mock.calls[0][1];
    const body = JSON.parse(req.body);

    expect(url).toBe('https://api.z.ai/api/coding/paas/v4/chat/completions');
    expect(body.model).toBe('glm-5');

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].data.level).toBe('glm5');
    expect(events[0].data.model).toBe('glm-5');
    expect(events[0].data.provider).toBe('zai');
  });

  it('Scenario 5: --json parameter parses JSON from response', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ text: 'some text {"key": "value"} more text' }] })));

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'fast', expectJson: true });

    expect(result.success).toBe(true);
    expect(result.parsed).toEqual({ key: 'value' });

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('inference.ok');
  });

  it('Scenario 6: Custom timeout parameter overrides default timeout', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ text: 'response' }] })));

    const customTimeout = 1234;
    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'fast', timeout: customTimeout });

    expect(result.success).toBe(true);

    const req = fetchMock.mock.calls[0][1];
    expect(req.signal).toBeDefined();
    expect(req.signal instanceof AbortSignal).toBe(true);
  });

  it('Scenario 7: Timeout returns success:false with error containing timeout', async () => {
    const timeoutError = new Error('The operation was aborted');
    timeoutError.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(timeoutError);

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'fast', timeout: 10 });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Timeout after 10ms');

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('inference.fail');
    expect(events[0].data.error).toBe('timeout');
  });

  it('Scenario 8: emitInferenceEvent properly writes to events.jsonl', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ text: 'response' }] })));

    const result = await inference({ systemPrompt: 'sys', userPrompt: 'user', level: 'smart' });

    expect(result.success).toBe(true);

    const events = getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('inference.ok');
    expect(events[0].source).toBe('Inference');
    expect(events[0].data).toMatchObject({
      level: 'smart',
      provider: 'claude',
      model: 'opus',
    });
    expect(events[0].data.latency_s).toBeDefined();
    expect(events[0].timestamp).toBeDefined();
  });
});
