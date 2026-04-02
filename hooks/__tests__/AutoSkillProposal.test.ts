import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';

// We need to set the environment variable BEFORE importing the hook
process.env.PAI_DIR = '/mock/pai/dir';
process.env.HOME = '/mock/home';

// Mock inference
mock.module('../../PAI/Tools/Inference', () => ({
  inference: mock(() => Promise.resolve({ success: true, parsed: { should_create: true, confidence: 0.8, reason: 'test', skill: { name: 'test', description: 'test', triggers: ['test'], workflow_hint: 'test' } } })),
}));

// Mock TranscriptParser
mock.module('../../PAI/Tools/TranscriptParser', () => ({
  parseTranscript: mock(() => ({ raw: 'mock transcript content' })),
}));

// Mock hook-io
mock.module('../lib/hook-io', () => ({
  readHookInput: mock(() => Promise.resolve({ session_id: 'test_session', transcript_path: '/mock/transcript' })),
  parseTranscriptFromInput: mock(() => Promise.resolve({ raw: 'mock transcript content' })),
}));

import {
  countToolCalls,
  checkDuplicate,
  toTitleCase,
  checkRateLimit,
  main,
} from '../AutoSkillProposal.hook';

describe('AutoSkillProposal.hook', () => {
  beforeEach(() => {
    // Basic setup
  });

  afterEach(() => {
    mock.restore();
  });

  describe('countToolCalls()', () => {
    it('counts unique JSON format tools', () => {
      const transcript = `
      "name": "Bash"
      "name": "Bash"
      "name": "WriteFile"
      `;
      expect(countToolCalls(transcript)).toBe(2);
    });

    it('counts unique XML format tools', () => {
      const transcript = `
      <function=Bash>
      <function=Bash>
      <function=WriteFile>
      `;
      expect(countToolCalls(transcript)).toBe(2);
    });

    it('handles mixed format', () => {
      const transcript = `
      "name": "Bash"
      <function=WriteFile>
      "name": "ReadFile"
      <function=Bash>
      `;
      expect(countToolCalls(transcript)).toBe(3);
    });

    it('filters out common JSON fields', () => {
      const transcript = `
      "type": "function"
      "id": "123"
      "role": "user"
      "content": "test"
      "model": "claude"
      "session": "456"
      "name": "Bash"
      `;
      expect(countToolCalls(transcript)).toBe(1);
    });

    it('returns 0 for empty input', () => {
      expect(countToolCalls('')).toBe(0);
    });
  });

  describe('checkDuplicate()', () => {
    it('returns true for 60% overlap', () => {
      const triggers = ['a', 'b', 'c', 'd', 'e'];
      const existingSkills = {
        skills: {
          test: { triggers: ['a', 'b', 'c', 'x', 'y'] }
        }
      };
      // overlap is 3. Math.min(5, 5) * 0.5 = 2.5
      expect(checkDuplicate(triggers, existingSkills)).toBe(true);
    });

    it('returns false for 40% overlap', () => {
      const triggers = ['a', 'b', 'c', 'd', 'e'];
      const existingSkills = {
        skills: {
          test: { triggers: ['a', 'b', 'x', 'y', 'z'] }
        }
      };
      // overlap is 2. Math.min(5, 5) * 0.5 = 2.5
      expect(checkDuplicate(triggers, existingSkills)).toBe(false);
    });

    it('returns false for empty triggers', () => {
      const existingSkills = {
        skills: {
          test: { triggers: ['a', 'b'] }
        }
      };
      expect(checkDuplicate([], existingSkills)).toBe(false);
    });

    it('returns false for no existing skills', () => {
      const triggers = ['a', 'b'];
      expect(checkDuplicate(triggers, {})).toBe(false);
    });
  });

  describe('toTitleCase()', () => {
    it('converts dash-separated strings', () => {
      expect(toTitleCase('debug-workflow')).toBe('DebugWorkflow');
    });

    it('converts underscore-separated strings', () => {
      expect(toTitleCase('create_skill')).toBe('CreateSkill');
    });

    it('converts space-separated strings', () => {
      expect(toTitleCase('API Handler')).toBe('ApiHandler');
    });
  });

  describe('checkRateLimit()', () => {
    let existsSyncMock: ReturnType<typeof spyOn>;
    let readFileSyncMock: ReturnType<typeof spyOn>;

    beforeEach(() => {
      existsSyncMock = spyOn(fs, 'existsSync');
      readFileSyncMock = spyOn(fs, 'readFileSync');
    });

    afterEach(() => {
      existsSyncMock.mockRestore();
      readFileSyncMock.mockRestore();
    });

    it('returns true if no state file', () => {
      existsSyncMock.mockReturnValue(false);
      expect(checkRateLimit('session1')).toBe(true);
    });

    it('returns false if same session ID', () => {
      existsSyncMock.mockReturnValue(true);
      readFileSyncMock.mockReturnValue(JSON.stringify({ lastSessionId: 'session1', lastProposalTime: new Date().toISOString() }));
      expect(checkRateLimit('session1')).toBe(false);
    });

    it('returns false if within cooldown', () => {
      existsSyncMock.mockReturnValue(true);
      const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 mins ago
      readFileSyncMock.mockReturnValue(JSON.stringify({ lastSessionId: 'session1', lastProposalTime: recentTime }));
      expect(checkRateLimit('session2')).toBe(false);
    });

    it('returns true if after cooldown', () => {
      existsSyncMock.mockReturnValue(true);
      const oldTime = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 mins ago
      readFileSyncMock.mockReturnValue(JSON.stringify({ lastSessionId: 'session1', lastProposalTime: oldTime }));
      expect(checkRateLimit('session2')).toBe(true);
    });
  });

  describe('Integration: Main function', () => {
    let exitMock: ReturnType<typeof spyOn>;
    let errorMock: ReturnType<typeof spyOn>;
    let hookIoModule: any;
    let transcriptModule: any;
    let inferenceModule: any;

    beforeEach(async () => {
      exitMock = spyOn(process, 'exit').mockImplementation((code?: number | string | null | undefined) => {
        throw new Error(`process.exit called with ${code}`);
      });
      errorMock = spyOn(console, 'error').mockImplementation(() => {});
      hookIoModule = await import('../lib/hook-io');
      transcriptModule = await import('../../PAI/Tools/TranscriptParser');
      inferenceModule = await import('../../PAI/Tools/Inference');

      spyOn(fs, 'existsSync').mockReturnValue(false); // No rate limit file
    });

    afterEach(() => {
      exitMock.mockRestore();
      errorMock.mockRestore();
    });

    it('exits with code 0 and logs "No input" for empty stdin', async () => {
      spyOn(hookIoModule, 'readHookInput').mockResolvedValue(null);
      try {
        await main();
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with 0');
      }
      expect(exitMock).toHaveBeenCalledWith(0);
      expect(errorMock).toHaveBeenCalledWith('[AutoSkillProposal] No input received');
    });

    it('exits with code 0 and logs "too short" for short transcript', async () => {
      spyOn(hookIoModule, 'readHookInput').mockResolvedValue({ session_id: 'test', transcript_path: 'test' });
      spyOn(transcriptModule, 'parseTranscript').mockReturnValue({ raw: 'short' });
      try {
        await main();
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with 0');
      }
      expect(exitMock).toHaveBeenCalledWith(0);
      expect(errorMock).toHaveBeenCalledWith('[AutoSkillProposal] Transcript too short, skipping');
    });

    it('exits with code 0 and logs "too simple" for few tools', async () => {
      spyOn(hookIoModule, 'readHookInput').mockResolvedValue({ session_id: 'test', transcript_path: 'test' });
      // > 200 chars but 0 tool calls
      const longTranscript = 'a'.repeat(250);
      spyOn(transcriptModule, 'parseTranscript').mockReturnValue({ raw: longTranscript });
      try {
        await main();
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with 0');
      }
      expect(exitMock).toHaveBeenCalledWith(0);
      expect(errorMock.mock.calls.some(call => call[0].includes('Session too simple'))).toBe(true);
    });

    it('exits with code 0 and logs reason if confidence < 0.7', async () => {
      spyOn(hookIoModule, 'readHookInput').mockResolvedValue({ session_id: 'test', transcript_path: 'test' });

      // Make transcript long enough and have > 5 tools
      const longTranscriptWithTools = 'a'.repeat(250) +
        '<function=A><function=B><function=C><function=D><function=E>';
      spyOn(transcriptModule, 'parseTranscript').mockReturnValue({ raw: longTranscriptWithTools });

      spyOn(inferenceModule, 'inference').mockResolvedValue({
        success: true,
        parsed: {
          should_create: true,
          confidence: 0.5,
          reason: 'low confidence',
          skill: { name: 'test', description: 'test', triggers: ['test'], workflow_hint: 'test' }
        }
      });

      try {
        await main();
      } catch (e: any) {
        expect(e.message).toBe('process.exit called with 0');
      }
      expect(exitMock).toHaveBeenCalledWith(0);
      expect(errorMock.mock.calls.some(call => call[0].includes('Skipping: low confidence'))).toBe(true);
    });
  });
});
