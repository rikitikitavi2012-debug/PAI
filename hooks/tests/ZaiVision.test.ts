import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { createTempDir, cleanupTempDir } from './harness';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

const TOOL_PATH = 'PAI/Tools/ZaiVision.ts';

/** Spawn ZaiVision.ts with custom env, return stdout/stderr/exitCode */
async function runZaiVision(args: string[], env?: Record<string, string>) {
  const proc = Bun.spawn(['bun', TOOL_PATH, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, ...env },
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  await proc.exited;
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: proc.exitCode };
}

describe('ZaiVision CLI Tool', () => {
  let tempDir: string;
  let testImagePath: string;

  beforeAll(() => {
    tempDir = createTempDir('zaivision-test-');
    testImagePath = join(tempDir, 'test.png');

    // Create a tiny valid PNG (1x1 pixel, red) via ImageMagick
    const result = Bun.spawnSync(['convert', '-size', '1x1', 'xc:red', testImagePath]);
    if (result.exitCode !== 0) {
      // Fallback: write minimal PNG bytes directly
      // Minimal 1x1 red PNG (67 bytes)
      const png = Buffer.from(
        '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de' +
        '0000000c4944415408d763f8cfc000000002000160e7274a0000000049454e44ae426082',
        'hex'
      );
      writeFileSync(testImagePath, png);
    }

    // Create mock .env
    mkdirSync(join(tempDir, '.config', 'PAI'), { recursive: true });
    writeFileSync(join(tempDir, '.config', 'PAI', '.env'), 'ZAI_API_KEY=test_mock_key\n');
  });

  afterAll(() => {
    cleanupTempDir(tempDir);
  });

  // ── Help ────────────────────────────────────────────────────

  describe('--help', () => {
    it('shows usage with --help flag', async () => {
      const r = await runZaiVision(['--help']);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toContain('ZaiVision');
      expect(r.stdout).toContain('screenshot');
      expect(r.stdout).toContain('analyze');
      expect(r.stdout).toContain('diff');
      expect(r.stdout).toContain('check');
    });

    it('shows usage with -h flag', async () => {
      const r = await runZaiVision(['-h']);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toContain('ZaiVision');
    });

    it('shows usage when no args provided', async () => {
      const r = await runZaiVision([]);
      expect(r.exitCode).toBe(0);
      expect(r.stdout).toContain('ZaiVision');
    });
  });

  // ── Unknown command ─────────────────────────────────────────

  describe('unknown command', () => {
    it('exits 1 with error for unknown command', async () => {
      const r = await runZaiVision(['foobar']);
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('Unknown command: foobar');
    });
  });

  // ── Analyze: argument validation ────────────────────────────

  describe('analyze', () => {
    it('exits 1 when no image path provided', async () => {
      const r = await runZaiVision(['analyze']);
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('Usage');
    });

    it('exits 1 when image file does not exist', async () => {
      const r = await runZaiVision(['analyze', '/tmp/nonexistent-image-zzz.png'], {
        HOME: tempDir,
      });
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('not found');
    });
  });

  // ── Diff: argument validation ───────────────────────────────

  describe('diff', () => {
    it('exits 1 when no args provided', async () => {
      const r = await runZaiVision(['diff']);
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('Usage');
    });

    it('exits 1 when only one image provided', async () => {
      const r = await runZaiVision(['diff', testImagePath]);
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('Usage');
    });
  });

  // ── API key loading ─────────────────────────────────────────

  describe('API key loading', () => {
    it('loads ZAI_API_KEY from environment variable', async () => {
      // analyze with a valid image but no real API → will fail on fetch, not on key loading
      const r = await runZaiVision(['analyze', testImagePath, 'test'], {
        ZAI_API_KEY: 'env_test_key',
        Z_AI_API_KEY: '',
      });
      // Should fail on API call, NOT on missing key
      expect(r.stderr).not.toContain('No ZAI_API_KEY');
    });

    it('falls back to Z_AI_API_KEY env var', async () => {
      const r = await runZaiVision(['analyze', testImagePath, 'test'], {
        ZAI_API_KEY: '',
        Z_AI_API_KEY: 'fallback_key',
      });
      expect(r.stderr).not.toContain('No ZAI_API_KEY');
    });

    it('loads key from .env file when env vars empty', async () => {
      const r = await runZaiVision(['analyze', testImagePath, 'test'], {
        HOME: tempDir,
        ZAI_API_KEY: '',
        Z_AI_API_KEY: '',
      });
      // Should find key in tempDir/.config/PAI/.env
      expect(r.stderr).not.toContain('No ZAI_API_KEY');
    });

    it('exits 1 when no API key found anywhere', async () => {
      const emptyDir = createTempDir('zaivision-nokey-');
      const r = await runZaiVision(['analyze', testImagePath, 'test'], {
        HOME: emptyDir,
        ZAI_API_KEY: '',
        Z_AI_API_KEY: '',
      });
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('No ZAI_API_KEY');
      cleanupTempDir(emptyDir);
    });
  });

  // ── Image size validation ───────────────────────────────────

  describe('image size validation', () => {
    it('rejects images larger than 5MB', async () => {
      const bigImagePath = join(tempDir, 'big.png');
      // Create a 6MB file (not a real PNG but will trigger size check before API call)
      const buf = Buffer.alloc(6 * 1024 * 1024, 0xff);
      writeFileSync(bigImagePath, buf);

      const r = await runZaiVision(['analyze', bigImagePath, 'test'], {
        ZAI_API_KEY: 'test_key',
      });
      expect(r.exitCode).toBe(1);
      expect(r.stderr).toContain('too large');
    });

    it('accepts images under 5MB', async () => {
      // testImagePath is tiny (< 1KB) — should pass size check
      const r = await runZaiVision(['analyze', testImagePath, 'test'], {
        ZAI_API_KEY: 'test_key',
      });
      // Will fail on API (no real server) but should pass size validation
      expect(r.stderr).not.toContain('too large');
    });
  });
});
