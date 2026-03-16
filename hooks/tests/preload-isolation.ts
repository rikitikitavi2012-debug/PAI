/**
 * preload-isolation.ts — Test isolation preload
 *
 * Loaded before every test file via bunfig.toml [test].preload.
 * Saves and restores PAI_DIR to prevent cross-test pollution.
 *
 * The #1 cause of "passes individually, fails in batch" is tests
 * mutating process.env.PAI_DIR and not restoring it.
 */

import { afterAll, beforeAll } from 'bun:test';

const originalPaiDir = process.env.PAI_DIR;
const originalHome = process.env.HOME;

afterAll(() => {
  // Restore env after each test file completes
  if (originalPaiDir !== undefined) {
    process.env.PAI_DIR = originalPaiDir;
  } else {
    delete process.env.PAI_DIR;
  }
  if (originalHome !== undefined) {
    process.env.HOME = originalHome;
  }
});
