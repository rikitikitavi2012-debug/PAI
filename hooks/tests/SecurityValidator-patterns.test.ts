import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Parse patterns.yaml without external dependencies like js-yaml
function parsePatterns() {
  const yamlPath = join(process.cwd(), 'PAI/USER/PAISECURITYSYSTEM/patterns.yaml');
  const content = readFileSync(yamlPath, 'utf-8');

  const patterns: string[] = [];
  const lines = content.split('\n');

  // Extract all `pattern: "..."` or `pattern: '...'` or `pattern: ...`
  // We need to match the entire string value, it could contain escaped quotes inside
  const patternRegex = /pattern:\s*(?:"(.*)"|'(.*)'|(.*))\s*$/;
  for (const line of lines) {
    const match = line.match(patternRegex);
    if (match) {
      // Match[1] is double quoted, Match[2] is single quoted, Match[3] is unquoted
      let rawPattern = match[1] ?? match[2] ?? match[3];

      if (match[1] !== undefined) {
        // In YAML strings wrapped in double quotes, \\ is just \
        let unescaped = rawPattern.replace(/\\\\/g, '\\');
        // Replace any escaped double quotes \" with "
        unescaped = unescaped.replace(/\\"/g, '"');
        patterns.push(unescaped);
      } else {
        patterns.push(rawPattern);
      }
    }
  }

  // Extract paths under the `paths:` section
  const pathPatterns: string[] = [];
  let inPathsSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we entered the `paths:` section
    if (line.match(/^paths:/)) {
      inPathsSection = true;
      continue;
    }

    // Check if we entered another top-level section (no leading spaces)
    if (inPathsSection && line.match(/^[a-z]+:/) && !line.startsWith(' ')) {
      inPathsSection = false;
      continue;
    }

    if (inPathsSection) {
      // Check for an array item (paths) which can be double/single/unquoted
      const pathMatch = line.match(/^\s*-\s*(?:"(.*)"|'(.*)'|(.*))\s*$/);
      if (pathMatch) {
        let rawPath = pathMatch[1] ?? pathMatch[2] ?? pathMatch[3];
        pathPatterns.push(rawPath);
      }
    }
  }

  return { patterns, pathPatterns };
}

describe('SecurityValidator Patterns YAML Validation', () => {
  const { patterns, pathPatterns } = parsePatterns();

  test('All files successfully parsed and contain patterns', () => {
    expect(patterns.length).toBeGreaterThan(0);
    expect(pathPatterns.length).toBeGreaterThan(0);
  });

  // Scenario 1: Every pattern compiles as new RegExp(pattern, 'i') without throwing
  test('Every pattern compiles as new RegExp(pattern, "i") without throwing', () => {
    for (const pattern of patterns) {
      try {
        new RegExp(pattern, 'i');
      } catch (e) {
        throw new Error(`Failed to compile pattern: "${pattern}". Error: ${e}`);
      }
    }
  });

  // Scenario 2: No patterns use PCRE-only syntax in unsupported engines
  test('No patterns use PCRE-only syntax like (?i), (?P<name>), (?<=...)', () => {
    for (const pattern of patterns) {
      // (?i) or (?P<name>) are generally problematic in JS
      expect(pattern).not.toMatch(/\(\?i\)/);
      expect(pattern).not.toMatch(/\(\?P</);

      // Lookbehind (?<=...) is supported in newer JS but better to verify
      // based on instructions, checking for (?<= as PCRE-only syntax check.
      // The prompt suggests we should check for these as they caused PreToolUse errors.
      expect(pattern).not.toMatch(/\(\?<=/);
      expect(pattern).not.toMatch(/\(\?<!/);
    }
  });

  // Scenario 3: Bash blocked patterns match their documented examples
  test('Bash blocked patterns match their documented examples', () => {
    // Replicate exactly how it works in SecurityValidator.hook.ts
    function matchesPattern(command: string, pattern: string): boolean {
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(command);
      } catch {
        return command.toLowerCase().includes(pattern.toLowerCase());
      }
    }

    // Specific examples derived from patterns.yaml
    const documentedExamples = [
      {
        command: 'rm -rf /',
        patternMatch: 'rm\\s+-rf\\s+/'
      },
      {
        command: 'rm -rf ~',
        patternMatch: 'rm\\s+-rf\\s+~'
      },
      {
        command: 'rm -rf $HOME',
        patternMatch: 'rm\\s+-rf\\s+\\$HOME'
      },
      {
        command: 'rm -rf ~/.claude',
        patternMatch: 'rm\\s+-rf\\s+~/\\.claude'
      },
      {
        command: 'gh repo delete',
        patternMatch: 'gh\\s+repo\\s+delete'
      },
      {
        command: 'diskutil erase',
        patternMatch: 'diskutil\\s+erase'
      },
      {
        command: 'chmod -R 777 /',
        patternMatch: 'chmod\\s+-R\\s+777\\s+/'
      }
    ];

    for (const example of documentedExamples) {
      // First ensure the pattern exists in our parsed patterns
      expect(patterns).toContain(example.patternMatch);
      // Then ensure the command matches the pattern
      expect(matchesPattern(example.command, example.patternMatch)).toBe(true);
    }
  });

  // Scenario 4: File path patterns with globs expand correctly
  test('File path patterns with globs expand correctly', () => {
    // Replicate matchesPathPattern logic exactly from SecurityValidator.hook.ts
    function expandPath(path: string): string {
      if (path.startsWith('~')) {
        return path.replace('~', homedir());
      }
      return path;
    }

    function matchesPathPattern(filePath: string, pattern: string): boolean {
      const expandedPattern = expandPath(pattern);
      const expandedPath = expandPath(filePath);

      if (pattern.includes('*')) {
        let regexPattern = expandedPattern
          .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
          .replace(/\*/g, '<<<SINGLESTAR>>>')
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/<<<DOUBLESTAR>>>/g, '.*')
          .replace(/<<<SINGLESTAR>>>/g, '[^/]*');

        try {
          const regex = new RegExp(`^${regexPattern}$`);
          return regex.test(expandedPath);
        } catch {
          return false;
        }
      }

      return expandedPath === expandedPattern ||
             expandedPath.startsWith(expandedPattern.endsWith('/') ? expandedPattern : expandedPattern + '/');
    }

    const testCases = [
      {
        path: '~/.ssh/id_rsa',
        patternMatch: '~/.ssh/id_*',
        expected: true
      },
      {
        path: '~/.ssh/config',
        patternMatch: '~/.ssh/config',
        expected: true
      },
      {
        path: '~/.aws/credentials',
        patternMatch: '~/.aws/credentials',
        expected: true
      },
      {
        path: '/etc/passwd',
        patternMatch: '/etc/**',
        expected: true
      },
      {
        path: '/usr/local/bin/node',
        patternMatch: '/usr/**',
        expected: true
      },
      {
        path: '~/.claude/settings.json',
        patternMatch: '~/.claude/settings.json',
        expected: true
      },
      {
        path: '/home/user/project/.env',
        patternMatch: '**/.env',
        expected: true
      },
      {
        path: '/var/www/credentials.json',
        patternMatch: '**/credentials.json',
        expected: true
      }
    ];

    for (const testCase of testCases) {
      // Check that the pattern actually exists in the parsed paths
      expect(pathPatterns).toContain(testCase.patternMatch);
      // Verify the matching logic correctly expands and matches
      expect(matchesPathPattern(testCase.path, testCase.patternMatch)).toBe(testCase.expected);
    }
  });
});
