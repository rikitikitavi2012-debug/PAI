import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { resolve, join } from 'path';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { renderTemplate as renderTemplateA } from '../Tools/RenderTemplate';
import { validateTemplate as validateTemplateA } from '../Tools/ValidateTemplate';
import { renderTemplate as renderTemplateB } from '../Templates/Tools/RenderTemplate';
import { validateTemplate as validateTemplateB } from '../Templates/Tools/ValidateTemplate';

const tempDir = join(import.meta.dir, 'temp_test_data');

beforeAll(() => {
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// Since RenderTemplate.ts and ValidateTemplate.ts resolve path relative to their directory via `dirname(dirname(import.meta.path))`,
// we must make sure the test files mimic that structure by putting templates in the `skills/Utilities/Prompting/Templates` directory
// or using absolute paths to bypass the `resolveTemplatePath` function logic.
// `resolveTemplatePath` says: "If absolute, use as-is"
const absoluteTempDir = resolve(tempDir);

function createTempFile(name: string, content: string) {
  const filePath = join(absoluteTempDir, name);
  writeFileSync(filePath, content);
  return filePath;
}

describe('RenderTemplate', () => {
  const runRenderTests = (renderFunc: typeof renderTemplateA, prefix: string) => {
    describe(`[${prefix}] Rendering Tests`, () => {
      it('should render simple variables', () => {
        const hbsPath = createTempFile(`${prefix}_simple.hbs`, 'Hello {{name}}!');
        const dataPath = createTempFile(`${prefix}_simple.json`, JSON.stringify({ name: 'World' }));
        const result = renderFunc({ templatePath: hbsPath, dataPath: dataPath });
        expect(result).toBe('Hello World!');
      });

      it('should apply uppercase and lowercase helpers', () => {
        const hbsPath = createTempFile(`${prefix}_case.hbs`, '{{uppercase val1}}, {{lowercase val2}}');
        const dataPath = createTempFile(`${prefix}_case.json`, JSON.stringify({ val1: 'hello', val2: 'WORLD' }));
        const result = renderFunc({ templatePath: hbsPath, dataPath: dataPath });
        expect(result).toBe('HELLO, world');
      });

      it('should apply join and default helpers', () => {
        const hbsPath = createTempFile(`${prefix}_join.hbs`, 'Items: {{join items ", "}}. Status: {{default status "Unknown"}}');
        const dataPath = createTempFile(`${prefix}_join.json`, JSON.stringify({ items: ['A', 'B', 'C'] }));
        const result = renderFunc({ templatePath: hbsPath, dataPath: dataPath });
        expect(result).toBe('Items: A, B, C. Status: Unknown');
      });

      it('should evaluate conditional helpers (eq, gt, lt)', () => {
        const hbsPath = createTempFile(`${prefix}_cond.hbs`,
          '{{#if (eq a b)}}equal{{else}}not equal{{/if}} | ' +
          '{{#if (gt x y)}}greater{{else}}less or eq{{/if}} | ' +
          '{{#if (lt y x)}}less{{else}}greater or eq{{/if}}'
        );
        const dataPath = createTempFile(`${prefix}_cond.json`, JSON.stringify({ a: 1, b: 1, x: 10, y: 5 }));
        const result = renderFunc({ templatePath: hbsPath, dataPath: dataPath });
        expect(result).toBe('equal | greater | less');
      });

      it('should format numbers and truncate strings', () => {
        const hbsPath = createTempFile(`${prefix}_format.hbs`, 'Num: {{formatNumber num}}, Text: {{truncate text 5}}');
        const dataPath = createTempFile(`${prefix}_format.json`, JSON.stringify({ num: 1000000, text: 'This is a long text' }));
        const result = renderFunc({ templatePath: hbsPath, dataPath: dataPath });
        // Depending on locale, might be "1,000,000", but it handles formatting
        expect(result).toContain('Num: 1,000,000');
        expect(result).toContain('Text: This ...');
      });

      it('should handle missing template or data gracefully (throw Error)', () => {
        expect(() => {
          renderFunc({ templatePath: '/invalid/path/test.hbs', dataPath: createTempFile('t.json', '{}') });
        }).toThrow('Template not found');

        expect(() => {
          renderFunc({ templatePath: createTempFile('t2.hbs', ''), dataPath: '/invalid/path/data.json' });
        }).toThrow('Data file not found');
      });

      it('should support YAML format', () => {
        const hbsPath = createTempFile(`${prefix}_yaml.hbs`, 'Name: {{name}}, Age: {{age}}');
        const dataPath = createTempFile(`${prefix}_yaml.yaml`, 'name: Alice\nage: 30');
        const result = renderFunc({ templatePath: hbsPath, dataPath: dataPath });
        expect(result).toBe('Name: Alice, Age: 30');
      });
    });
  };

  runRenderTests(renderTemplateA, 'A');
  runRenderTests(renderTemplateB, 'B');
});

describe('ValidateTemplate', () => {
  const runValidateTests = (validateFunc: typeof validateTemplateA, prefix: string) => {
    describe(`[${prefix}] Validation Tests`, () => {
      it('should return valid true for correct templates', () => {
        const hbsPath = createTempFile(`${prefix}_valid.hbs`, 'Hello {{name}}! {{#if true}}Ok{{/if}}');
        const result = validateFunc({ templatePath: hbsPath });
        expect(result.valid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.variables).toContain('name');
      });

      it('should identify unbalanced blocks', () => {
        const hbsPath = createTempFile(`${prefix}_unbalanced.hbs`, '{{#if true}}Ok{{/each}}');
        const result = validateFunc({ templatePath: hbsPath });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Mismatched block'))).toBe(true);
      });

      it('should detect unclosed blocks', () => {
        const hbsPath = createTempFile(`${prefix}_unclosed.hbs`, '{{#each items}}<li>{{name}}</li>');
        const result = validateFunc({ templatePath: hbsPath });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Unclosed block'))).toBe(true);
      });

      it('should report warnings for missing variables without strict mode', () => {
        const hbsPath = createTempFile(`${prefix}_missing.hbs`, 'Hello {{name}}! Age: {{age}}');
        const dataPath = createTempFile(`${prefix}_missing.json`, JSON.stringify({ name: 'Bob' }));
        const result = validateFunc({ templatePath: hbsPath, dataPath: dataPath });
        expect(result.valid).toBe(true);
        expect(result.warnings.some(w => w.includes('Variable "age" not found'))).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should report errors for missing variables with strict mode', () => {
        const hbsPath = createTempFile(`${prefix}_missing_strict.hbs`, 'Hello {{name}}! Age: {{age}}');
        const dataPath = createTempFile(`${prefix}_missing_strict.json`, JSON.stringify({ name: 'Bob' }));
        const result = validateFunc({ templatePath: hbsPath, dataPath: dataPath, strict: true });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Missing variable "age" not found'))).toBe(true);
      });

      it('should extract metadata correctly', () => {
        const hbsPath = createTempFile(`${prefix}_meta.hbs`, '{{uppercase text}} {{> myPartial}} {{#each items}}{{this.id}}{{/each}}');
        const result = validateFunc({ templatePath: hbsPath });
        expect(result.helpers).toContain('uppercase');
        expect(result.partials).toContain('myPartial');
        expect(result.variables).toContain('items');
      });

      it('should return valid false when template path is missing', () => {
        const result = validateFunc({ templatePath: '/invalid/template/path.hbs' });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Template not found'))).toBe(true);
      });
    });
  };

  runValidateTests(validateTemplateA, 'A');
  runValidateTests(validateTemplateB, 'B');
});
