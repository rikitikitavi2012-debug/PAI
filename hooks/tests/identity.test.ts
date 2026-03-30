import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test';
import {
  getIdentity,
  getPrincipal,
  getPrincipalName,
  getVoiceId,
  getAlgorithmVoice,
  clearCache,
  getDefaultIdentity,
  getDefaultPrincipal
} from '../lib/identity';
import * as fs from 'fs';
import * as path from 'path';

// Mock path resolution to return a predictable string
mock.module('../lib/paths', () => ({
  getPaiDir: () => '/mock/pai/dir'
}));

// Mock fs module
const mockExistsSync = mock(() => true);
const mockReadFileSync = mock(() => JSON.stringify({}));

mock.module('fs', () => ({
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync
}));

describe('Identity Loader', () => {
  beforeEach(() => {
    clearCache();
    mockExistsSync.mockClear();
    mockReadFileSync.mockClear();
  });

  afterEach(() => {
    clearCache();
  });

  it('1. getIdentity() returns an object with name, fullName, displayName, color', () => {
    const mockSettings = {
      daidentity: {
        name: 'TestDA',
        fullName: 'Test Digital Assistant',
        displayName: 'TEST',
        color: '#FF0000',
        voices: {
          main: {
            voiceId: 'test-voice-id-123'
          }
        }
      }
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockSettings));

    const identity = getIdentity();

    expect(identity).toBeDefined();
    expect(identity.name).toBe('TestDA');
    expect(identity.fullName).toBe('Test Digital Assistant');
    expect(identity.displayName).toBe('TEST');
    expect(identity.color).toBe('#FF0000');
    expect(identity.mainDAVoiceID).toBe('test-voice-id-123');
  });

  it('2. getPrincipal() returns an object with name, timezone', () => {
    const mockSettings = {
      principal: {
        name: 'TestUser',
        timezone: 'Europe/Berlin',
        pronunciation: 'Test User'
      }
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockSettings));

    const principal = getPrincipal();

    expect(principal).toBeDefined();
    expect(principal.name).toBe('TestUser');
    expect(principal.timezone).toBe('Europe/Berlin');
    expect(principal.pronunciation).toBe('Test User');
  });

  it('3. getPrincipalName() returns a string with the name', () => {
    const mockSettings = {
      principal: {
        name: 'JohnDoe'
      }
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockSettings));

    const name = getPrincipalName();

    expect(name).toBe('JohnDoe');
  });

  it('4. getVoiceId() returns voice ID from daidentity.voices.main', () => {
    const mockSettings = {
      daidentity: {
        voices: {
          main: {
            voiceId: 'main-voice-456'
          }
        }
      }
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockSettings));

    const voiceId = getVoiceId();

    expect(voiceId).toBe('main-voice-456');
  });

  it('5. getAlgorithmVoice() returns voice from daidentity.voices.algorithm', () => {
    const mockSettings = {
      daidentity: {
        voices: {
          algorithm: {
            voiceId: 'algo-voice-789',
            voiceName: 'Algo Voice',
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.5,
            speed: 1.0,
            use_speaker_boost: true
          }
        }
      }
    };
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(mockSettings));

    const algoVoice = getAlgorithmVoice();

    expect(algoVoice).toBeDefined();
    expect(algoVoice?.voiceId).toBe('algo-voice-789');
    expect(algoVoice?.voiceName).toBe('Algo Voice');
    expect(algoVoice?.stability).toBe(0.5);
  });

  it('6. Missing settings.json -> returns default values without crashing', () => {
    mockExistsSync.mockReturnValue(false);

    // Should not throw
    const identity = getIdentity();
    const principal = getPrincipal();
    const algoVoice = getAlgorithmVoice();

    const defaultIdentity = getDefaultIdentity();
    const defaultPrincipal = getDefaultPrincipal();

    // Verify identity defaults
    expect(identity.name).toBe(defaultIdentity.name);
    expect(identity.fullName).toBe(defaultIdentity.fullName);
    expect(identity.displayName).toBe(defaultIdentity.displayName);
    expect(identity.color).toBe(defaultIdentity.color);
    expect(identity.mainDAVoiceID).toBe(defaultIdentity.mainDAVoiceID);

    // Verify principal defaults
    expect(principal.name).toBe(defaultPrincipal.name);
    expect(principal.timezone).toBe(defaultPrincipal.timezone);
    expect(principal.pronunciation).toBe(defaultPrincipal.pronunciation);

    // Verify algorithm voice returns null when settings are missing
    expect(algoVoice).toBeNull();
  });
});
