#!/usr/bin/env bun
/**
 * FailureRotation.ts - Rotate and compress FAILURES learning data
 *
 * PURPOSE:
 * Prevents FAILURES directory from growing unboundedly.
 * - Compresses uncompressed transcript.jsonl files older than 7 days
 * - Deletes transcript files (gz or raw) older than 60 days
 * - Preserves CONTEXT.md + sentiment.json forever (behavioral rules)
 *
 * USAGE:
 *   bun FailureRotation.ts              # Normal rotation
 *   bun FailureRotation.ts --dry-run    # Show what would happen
 *   bun FailureRotation.ts --compress-all  # Compress ALL uncompressed transcripts now
 */

import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const PAI_DIR = process.env.PAI_DIR || join(process.env.HOME!, '.claude');
const FAILURES_DIR = join(PAI_DIR, 'MEMORY', 'LEARNING', 'FAILURES');

const COMPRESS_AGE_DAYS = 7;   // Compress transcripts older than this
const DELETE_AGE_DAYS = 60;    // Delete transcripts older than this (keep CONTEXT.md)

interface RotationResult {
  compressed: number;
  deleted: number;
  bytesFreed: number;
  errors: string[];
}

function getAgeDays(path: string): number {
  try {
    const stat = statSync(path);
    return (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
  } catch {
    return 0;
  }
}

export function rotateFailures(dryRun = false, compressAll = false): RotationResult {
  const result: RotationResult = { compressed: 0, deleted: 0, bytesFreed: 0, errors: [] };

  if (!existsSync(FAILURES_DIR)) {
    result.errors.push('FAILURES directory not found');
    return result;
  }

  try {
    const months = readdirSync(FAILURES_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{4}-\d{2}$/.test(d.name))
      .map(d => d.name);

    for (const month of months) {
      const monthPath = join(FAILURES_DIR, month);

      try {
        const failureDirs = readdirSync(monthPath, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => d.name);

        for (const dir of failureDirs) {
          const dirPath = join(monthPath, dir);

          // Check for uncompressed transcript.jsonl
          const rawPath = join(dirPath, 'transcript.jsonl');
          const gzPath = join(dirPath, 'transcript.jsonl.gz');

          if (existsSync(rawPath)) {
            const ageDays = getAgeDays(rawPath);
            const size = statSync(rawPath).size;

            if (ageDays > DELETE_AGE_DAYS) {
              // Delete old transcript
              if (!dryRun) {
                try { unlinkSync(rawPath); } catch (e) { result.errors.push(`delete ${rawPath}: ${e}`); }
              }
              result.deleted++;
              result.bytesFreed += size;
              console.error(`🗑️ ${dryRun ? '[DRY] ' : ''}Deleted transcript (${Math.round(size / 1024)}KB, ${Math.round(ageDays)}d old): ${dir}`);
            } else if (ageDays > COMPRESS_AGE_DAYS || compressAll) {
              // Compress old transcript
              if (!dryRun) {
                const gz = spawnSync('gzip', ['-9', rawPath], { timeout: 30000 });
                if (gz.status !== 0) {
                  result.errors.push(`gzip ${rawPath}: ${gz.stderr?.toString()}`);
                  continue;
                }
              }
              const estimatedSaving = Math.round(size * 0.6); // ~60% compression
              result.compressed++;
              result.bytesFreed += estimatedSaving;
              console.error(`🗜️ ${dryRun ? '[DRY] ' : ''}Compressed transcript (${Math.round(size / 1024)}KB → ~${Math.round(size * 0.4 / 1024)}KB): ${dir}`);
            }
          }

          // Check for old .gz files past delete threshold
          if (existsSync(gzPath) && !existsSync(rawPath)) {
            const ageDays = getAgeDays(gzPath);
            if (ageDays > DELETE_AGE_DAYS) {
              const size = statSync(gzPath).size;
              if (!dryRun) {
                try { unlinkSync(gzPath); } catch (e) { result.errors.push(`delete ${gzPath}: ${e}`); }
              }
              result.deleted++;
              result.bytesFreed += size;
              console.error(`🗑️ ${dryRun ? '[DRY] ' : ''}Deleted old compressed transcript (${Math.round(size / 1024)}KB, ${Math.round(ageDays)}d old): ${dir}`);
            }
          }

          // Also clean up tool-calls.json older than 60 days (redundant to CONTEXT.md)
          const toolCallsPath = join(dirPath, 'tool-calls.json');
          if (existsSync(toolCallsPath)) {
            const ageDays = getAgeDays(toolCallsPath);
            if (ageDays > DELETE_AGE_DAYS) {
              const size = statSync(toolCallsPath).size;
              if (!dryRun) {
                try { unlinkSync(toolCallsPath); } catch (e) { result.errors.push(`delete ${toolCallsPath}: ${e}`); }
              }
              result.deleted++;
              result.bytesFreed += size;
            }
          }
        }
      } catch (e) {
        result.errors.push(`scan ${monthPath}: ${e}`);
      }
    }
  } catch (e) {
    result.errors.push(`scan ${FAILURES_DIR}: ${e}`);
  }

  return result;
}

// CLI
if (import.meta.main) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const compressAll = args.includes('--compress-all');

  console.error(`[FailureRotation] Starting ${dryRun ? '(DRY RUN) ' : ''}${compressAll ? '(COMPRESS ALL) ' : ''}...`);

  const result = rotateFailures(dryRun, compressAll);

  console.error(`\n[FailureRotation] Summary:`);
  console.error(`  Compressed: ${result.compressed}`);
  console.error(`  Deleted: ${result.deleted}`);
  console.error(`  Freed: ${Math.round(result.bytesFreed / 1024 / 1024)} MB`);
  if (result.errors.length > 0) {
    console.error(`  Errors: ${result.errors.length}`);
    result.errors.forEach(e => console.error(`    - ${e}`));
  }

  // Output JSON for programmatic use
  console.log(JSON.stringify(result));
}
