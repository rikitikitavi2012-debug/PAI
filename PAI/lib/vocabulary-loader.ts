import { readFileSync, existsSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { getPaiDir } from '../../hooks/lib/paths';

// Types
export interface AlgorithmPhasesConfig {
  algorithm_entry: string;
  algorithm_entry_russian?: string;
  phases: Record<string, {
    english: string;
    russian: string;
    emoji: string;
    english_alt?: string;
  }>;
  /** Autoresearch 8-phase sub-loop keywords (matched in voice curls during EXECUTE) */
  sub_phases?: string[];
  effort_levels: string[];
}

export interface RatingVocabularyConfig {
  positive_praise_words: string[];
  positive_phrases: string[];
}

export interface WisdomDomainsConfig {
  domains: Record<string, string[]>;
}

// Fallbacks
const FALLBACK_PHASES: AlgorithmPhasesConfig = {
  algorithm_entry: "entering the pai algorithm",
  algorithm_entry_russian: "вхожу в алгоритм",
  phases: {
    OBSERVE: { english: "entering the observe phase", russian: "вхожу в фазу наблюдения", emoji: "👀" },
    THINK: { english: "entering the think phase", russian: "вхожу в фазу мышления", emoji: "🧠" },
    PLAN: { english: "entering the plan phase", russian: "вхожу в фазу планирования", emoji: "📋" },
    BUILD: { english: "entering the build phase", russian: "вхожу в фазу сборки", emoji: "🔨" },
    EXECUTE: { english: "entering the execute phase", russian: "вхожу в фазу выполнения", emoji: "▶️" },
    VERIFY: { english: "entering the verify phase", russian: "вхожу в фазу проверки", emoji: "✅", english_alt: "entering the verify phase." },
    LEARN: { english: "entering the learn phase", russian: "вхожу в фазу обучения", emoji: "🎓" }
  },
  sub_phases: ["review", "ideate", "modify", "commit", "verify", "decide", "log", "repeat"],
  effort_levels: ["TRIVIAL", "QUICK", "STANDARD", "THOROUGH"]
};

const FALLBACK_RATING: RatingVocabularyConfig = {
  positive_praise_words: [
    'excellent', 'amazing', 'brilliant', 'fantastic', 'wonderful', 'beautiful',
    'incredible', 'awesome', 'perfect', 'great', 'nice', 'superb', 'outstanding',
    'magnificent', 'stellar', 'phenomenal', 'remarkable', 'terrific', 'splendid',
  ],
  positive_phrases: [
    'great job', 'good job', 'nice work', 'well done', 'nice job', 'good work',
    'love it', 'nailed it', 'looks great', 'looks good', 'thats great', 'that works',
  ]
};

const FALLBACK_WISDOM: WisdomDomainsConfig = {
  domains: {
    communication: ['response', 'format', 'output', 'tone', 'style', 'greeting', 'language', 'russian', 'english'],
    development: ['code', 'bug', 'fix', 'refactor', 'hook', 'skill', 'tool', 'build', 'test', 'deploy', 'git', 'file', 'path'],
    workflow: ['task', 'workflow', 'process', 'mvp', 'agent', 'delegate', 'parallel', 'batch', 'automat'],
    system: ['system', 'architecture', 'memory', 'config', 'settings', 'pai', 'infrastructure', 'pipeline'],
    learning: ['learn', 'rating', 'feedback', 'pattern', 'wisdom', 'improve', 'mistake']
  }
};

// Caches
let phasesCache: AlgorithmPhasesConfig | null = null;
let ratingCache: RatingVocabularyConfig | null = null;
let wisdomCache: WisdomDomainsConfig | null = null;

function isCacheValid(yamlPath: string, cachePath: string): boolean {
  try {
    if (!existsSync(cachePath)) return false;
    const yamlMtime = statSync(yamlPath).mtimeMs;
    const cacheMtime = statSync(cachePath).mtimeMs;
    return cacheMtime > yamlMtime;
  } catch {
    return false;
  }
}

async function loadConfig<T>(filename: string, fallback: T, memoryCache: { value: T | null }): Promise<T> {
  if (memoryCache.value) return memoryCache.value;

  const paiDir = getPaiDir();
  const yamlPath = join(paiDir, 'PAI', 'config', filename);
  const cachePath = yamlPath.replace('.yaml', '.cache.json');

  if (!existsSync(yamlPath)) {
    return fallback;
  }

  try {
    if (isCacheValid(yamlPath, cachePath)) {
      const content = readFileSync(cachePath, 'utf-8');
      const cached = JSON.parse(content) as T;
      memoryCache.value = cached;
      return cached;
    }

    const { parse: parseYaml } = await import('yaml');
    const content = readFileSync(yamlPath, 'utf-8');
    const config = parseYaml(content) as T;

    try {
      const tmpPath = cachePath + '.tmp';
      writeFileSync(tmpPath, JSON.stringify(config));
      const { renameSync } = await import('fs');
      renameSync(tmpPath, cachePath);
    } catch {
      // Ignore cache write errors
    }

    memoryCache.value = config;
    return config;
  } catch (error) {
    console.error(`[VocabularyLoader] Failed to load ${filename}:`, error);
    return fallback;
  }
}

export async function loadAlgorithmPhases(): Promise<AlgorithmPhasesConfig> {
  const cacheBox = { value: phasesCache };
  const res = await loadConfig('algorithm-phases.yaml', FALLBACK_PHASES, cacheBox);
  phasesCache = cacheBox.value;
  return res;
}

export async function loadRatingVocabulary(): Promise<RatingVocabularyConfig> {
  const cacheBox = { value: ratingCache };
  const res = await loadConfig('rating-vocabulary.yaml', FALLBACK_RATING, cacheBox);
  ratingCache = cacheBox.value;
  return res;
}

export async function loadWisdomDomains(): Promise<WisdomDomainsConfig> {
  const cacheBox = { value: wisdomCache };
  const res = await loadConfig('wisdom-domains.yaml', FALLBACK_WISDOM, cacheBox);
  wisdomCache = cacheBox.value;
  return res;
}
