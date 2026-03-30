/**
 * preload-isolation.ts — Test isolation preload
 *
 * Loaded before every test file via bunfig.toml [test].preload.
 * Saves and restores ALL env vars + CWD to prevent cross-test pollution.
 *
 * The #1 cause of "passes individually, fails in batch" is tests
 * mutating process.env or CWD and not restoring it.
 */

import { afterAll, beforeAll } from 'bun:test';

const originalEnv = { ...process.env };
const originalCwd = process.cwd();

afterAll(() => {
  // Restore all env vars after each test file completes
  // Remove vars that were added during tests
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  // Restore vars that were modified or deleted during tests
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
  // Restore CWD
  try {
    process.chdir(originalCwd);
  } catch {
    // CWD may not exist if test cleaned up tmp dirs
  }
});
