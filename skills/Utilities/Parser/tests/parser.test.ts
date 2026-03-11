import { describe, it, expect, spyOn, mock, afterEach } from 'bun:test';
import * as fs from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  UUID_REGEX,
  ISO_8601_REGEX,
  type ContentSchema,
  type ContentType,
  type MentionType,
  type PersonRole,
  type Sentiment,
  type AudienceSegment,
  type TrendingPotential,
  type ProcessingMethod,
} from '../Schema/schema.ts';

import {
  validateContentSchema,
  assertValid,
  ValidationError,
} from '../Lib/validators.ts';

import {
  loadEntityIndex,
  saveEntityIndex,
  getOrCreatePerson,
  getOrCreateCompany,
  getOrCreateLink,
  getOrCreateSource,
  isUrlAlreadyParsed,
  getExistingContentId,
  processContentEntities,
} from '../Utils/collision-detection.ts';

// We'll also test parser.ts by spawning it.
import { spawnSync } from 'child_process';


// --- Tests for Schema/schema.ts ---
describe('Schema regexes', () => {
  it('should validate valid UUIDs', () => {
    const validUuid = uuidv4();
    expect(UUID_REGEX.test(validUuid)).toBe(true);
  });

  it('should invalidate invalid UUIDs', () => {
    expect(UUID_REGEX.test('not-a-uuid')).toBe(false);
    expect(UUID_REGEX.test('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // Too short
  });

  it('should validate valid ISO 8601 strings', () => {
    const validIso = new Date().toISOString();
    expect(ISO_8601_REGEX.test(validIso)).toBe(true);
    expect(ISO_8601_REGEX.test('2023-10-27T10:00:00Z')).toBe(true);
    expect(ISO_8601_REGEX.test('2023-10-27T10:00:00.123Z')).toBe(true);
  });

  it('should invalidate invalid ISO 8601 strings', () => {
    expect(ISO_8601_REGEX.test('2023-10-27')).toBe(false); // Missing time
    expect(ISO_8601_REGEX.test('not-a-date')).toBe(false);
  });
});


// --- Tests for Lib/validators.ts ---
describe('Validators', () => {
  const getValidSchema = (): ContentSchema => ({
    content: {
      id: uuidv4(),
      type: 'article',
      title: 'Valid Title',
      summary: { short: 'Short', medium: 'Medium', long: 'Long' },
      content: { full_text: 'Full text', transcript: null, excerpts: [] },
      metadata: {
        source_url: 'https://example.com',
        canonical_url: null,
        published_date: null,
        accessed_date: new Date().toISOString(),
        language: 'en',
        word_count: 100,
        read_time_minutes: 1,
        author_platform: 'blog',
      },
    },
    people: [],
    companies: [],
    topics: {
      primary_category: 'tech',
      secondary_categories: [],
      tags: ['tag1', 'tag2', 'tag3', 'tag4'],
      keywords: ['kw1', 'kw2', 'kw3', 'kw4', 'kw5'],
      themes: [],
      newsletter_sections: [],
    },
    links: [],
    sources: [],
    newsletter_metadata: {
      issue_number: null,
      section: null,
      position_in_section: null,
      editorial_note: null,
      include_in_newsletter: true,
      scheduled_date: null,
    },
    analysis: {
      sentiment: 'neutral',
      importance_score: 5,
      novelty_score: 5,
      controversy_score: 5,
      relevance_to_audience: ['general_tech'],
      key_insights: [],
      related_content_ids: [],
      trending_potential: 'medium',
    },
    extraction_metadata: {
      processed_date: new Date().toISOString(),
      processing_method: 'hybrid',
      confidence_score: 0.9,
      warnings: [],
      version: '1.0.0',
    },
  });

  it('should return valid for a fully valid schema', () => {
    const schema = getValidSchema();
    const result = validateContentSchema(schema);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should invalidate non-objects', () => {
    const result1 = validateContentSchema(null);
    expect(result1.valid).toBe(false);

    const result2 = validateContentSchema('string');
    expect(result2.valid).toBe(false);
  });

  it('should flag missing required top-level fields', () => {
    const schema = getValidSchema();
    delete (schema as any).people;
    const result = validateContentSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'people')).toBe(true);
  });

  it('should validate content section thoroughly', () => {
    const schema = getValidSchema();
    schema.content.id = 'invalid-uuid';
    schema.content.type = 'invalid-type' as any;
    schema.content.title = '';

    const result = validateContentSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'content.id')).toBe(true);
    expect(result.errors.some(e => e.field === 'content.type')).toBe(true);
    expect(result.errors.some(e => e.field === 'content.title')).toBe(true);
  });

  it('should validate people section thoroughly', () => {
    const schema = getValidSchema();
    schema.people = [
      {
        name: '',
        role: 'invalid' as any,
        importance: 'invalid' as any,
      } as any
    ];

    const result = validateContentSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'people[0].name')).toBe(true);
    expect(result.errors.some(e => e.field === 'people[0].role')).toBe(true);
    expect(result.errors.some(e => e.field === 'people[0].importance')).toBe(true);
    expect(result.warnings.some(w => w.includes('missing context'))).toBe(true);
  });

  it('should validate companies section thoroughly', () => {
    const schema = getValidSchema();
    schema.companies = [
      {
        name: '',
        mentioned_as: 'invalid' as any,
        sentiment: 'invalid' as any,
      } as any
    ];

    const result = validateContentSchema(schema);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'companies[0].name')).toBe(true);
    expect(result.errors.some(e => e.field === 'companies[0].mentioned_as')).toBe(true);
    expect(result.errors.some(e => e.field === 'companies[0].sentiment')).toBe(true);
  });

  it('should assert valid without throwing for valid schema', () => {
    expect(() => assertValid(getValidSchema())).not.toThrow();
  });

  it('should assert valid throws ValidationError for invalid schema', () => {
    const schema = getValidSchema();
    schema.content.title = ''; // Break schema
    expect(() => assertValid(schema)).toThrow(ValidationError);
  });
});


// --- Tests for Utils/collision-detection.ts ---
describe('Collision Detection', () => {
  afterEach(() => {
    mock.restore();
  });

  const mockIndex = () => ({
    version: '1.0.0',
    last_updated: new Date().toISOString(),
    people: {},
    companies: {},
    links: {},
    sources: {},
  });

  it('loadEntityIndex should return empty index if file missing', async () => {
    const spy = spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));

    const index = await loadEntityIndex();
    expect(index.version).toBe('1.0.0');
    expect(index.people).toEqual({});

    spy.mockRestore();
  });

  it('loadEntityIndex should return parsed json if file exists', async () => {
    const expected = mockIndex();
    const spy = spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(expected));

    const index = await loadEntityIndex();
    expect(index.version).toBe('1.0.0');

    spy.mockRestore();
  });

  it('saveEntityIndex should write and rename file', async () => {
    const writeFileSpy = spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    const renameSpy = spyOn(fs, 'rename').mockResolvedValue(undefined);

    const index = mockIndex();
    await saveEntityIndex(index);

    expect(writeFileSpy).toHaveBeenCalled();
    expect(renameSpy).toHaveBeenCalled();

    writeFileSpy.mockRestore();
    renameSpy.mockRestore();
  });

  it('getOrCreatePerson should create a new person if not exists', () => {
    const index = mockIndex();
    const id = getOrCreatePerson({ name: 'John Doe' }, index, 'content-1');

    expect(UUID_REGEX.test(id)).toBe(true);
    expect(index.people['john doe']).toBeDefined();
    expect(index.people['john doe'].occurrences).toBe(1);
    expect(index.people['john doe'].content_ids).toEqual(['content-1']);
  });

  it('getOrCreatePerson should return existing id and update occurrences', () => {
    const index = mockIndex();
    const id1 = getOrCreatePerson({ name: 'John Doe' }, index, 'content-1');
    const id2 = getOrCreatePerson({ name: 'JOHN doe ' }, index, 'content-2'); // Normalization test

    expect(id1).toBe(id2);
    expect(index.people['john doe'].occurrences).toBe(2);
    expect(index.people['john doe'].content_ids).toEqual(['content-1', 'content-2']);
  });

  it('getOrCreateCompany should use domain or name as canonical id', () => {
    const index = mockIndex();
    const idDomain = getOrCreateCompany({ name: 'Google', domain: 'google.com' }, index, 'content-1');
    const idName = getOrCreateCompany({ name: 'OpenAI', domain: null }, index, 'content-1');

    expect(index.companies['google.com']).toBeDefined();
    expect(index.companies['openai']).toBeDefined();

    const idDomain2 = getOrCreateCompany({ name: 'Alphabet', domain: 'Google.com' }, index, 'content-2');
    expect(idDomain2).toBe(idDomain);
  });

  it('getOrCreateLink should normalize urls', () => {
    const index = mockIndex();
    const id1 = getOrCreateLink({ url: 'https://example.com/' }, index, 'content-1');
    const id2 = getOrCreateLink({ url: 'https://example.com' }, index, 'content-2');

    expect(id1).toBe(id2);
    expect(index.links['https://example.com'].occurrences).toBe(2);
  });

  it('getOrCreateSource should compute canonical id from url or author/publication', () => {
    const index = mockIndex();

    const idUrl = getOrCreateSource({ url: 'https://test.com', author: null, publication: null }, index, 'content-1');
    expect(index.sources['https://test.com']).toBeDefined();

    const idAuthPub = getOrCreateSource({ url: null, author: 'Jane', publication: 'News' }, index, 'content-1');
    expect(index.sources['jane|news']).toBeDefined();
  });

  it('isUrlAlreadyParsed and getExistingContentId should work correctly', () => {
    const index = mockIndex();
    getOrCreateLink({ url: 'https://seen.com' }, index, 'content-123');

    expect(!!isUrlAlreadyParsed('https://seen.com', index)).toBe(true);
    expect(!!isUrlAlreadyParsed('https://unseen.com', index)).toBe(false);

    expect(getExistingContentId('https://seen.com', index)).toBe('content-123');
    expect(getExistingContentId('https://unseen.com', index)).toBeNull();
  });

  it('processContentEntities should process all entities and save index', async () => {
    const readFileSpy = spyOn(fs, 'readFile').mockRejectedValue(new Error('ENOENT'));
    const writeFileSpy = spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    const renameSpy = spyOn(fs, 'rename').mockResolvedValue(undefined);

    const data = {
      people: [{ name: 'Test Person' }],
      companies: [{ name: 'Test Co', domain: null }],
      links: [{ url: 'https://link.com' }],
      sources: [{ url: 'https://source.com', author: null, publication: null }]
    };

    const result = await processContentEntities('content-1', data);

    expect(result.people[0].id).toBeDefined();
    expect(result.companies[0].id).toBeDefined();
    expect(result.links[0].id).toBeDefined();
    expect(result.sources[0].id).toBeDefined();

    expect(writeFileSpy).toHaveBeenCalled();

    readFileSpy.mockRestore();
    writeFileSpy.mockRestore();
    renameSpy.mockRestore();
  });
});

// --- Tests for Lib/parser.ts (CLI Behavior) ---
describe('Parser CLI', () => {
  const parserPath = join(process.cwd(), 'skills/Utilities/Parser/Lib/parser.ts');

  it('should print usage and exit 1 if no arguments', () => {
    const result = spawnSync('bun', ['run', parserPath]);
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Usage: bun run parser.ts <URL>');
  });

  it('should detect youtube url as video', () => {
    // Need to use Bun.spawn and wait, but since we mock fs let's just use spawnSync
    // we want to test output. We will run it in a temp dir to not write to actual dir.
    const result = spawnSync('bun', ['run', parserPath, 'https://youtube.com/watch?v=123']);

    // As parser.ts has placeholder logic, it completes successfully.
    // It should output 'Type: video'

    const stdout = result.stdout.toString();
    expect(stdout).toContain('Type: video');

  });

  it('should detect twitter url as tweet_thread', () => {
    const result = spawnSync('bun', ['run', parserPath, 'https://twitter.com/user/status/123']);

    const stdout = result.stdout.toString();
    expect(stdout).toContain('Type: tweet_thread');
  });

  it('should detect arxiv url as pdf', () => {
    const result = spawnSync('bun', ['run', parserPath, 'https://arxiv.org/pdf/123.pdf']);

    const stdout = result.stdout.toString();
    expect(stdout).toContain('Type: pdf');
  });

  it('should detect substack url as newsletter', () => {
    const result = spawnSync('bun', ['run', parserPath, 'https://user.substack.com/p/post']);

    const stdout = result.stdout.toString();
    expect(stdout).toContain('Type: newsletter');
  });

  it('should detect general url as article', () => {
    const result = spawnSync('bun', ['run', parserPath, 'https://example.com/article']);

    const stdout = result.stdout.toString();
    expect(stdout).toContain('Type: article');
  });
});

// Patch global for validators testing
(globalThis as any).UUID_REGEX = UUID_REGEX;
