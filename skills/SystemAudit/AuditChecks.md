# SystemAudit Check Registry

## 8 Audit Domains

### 1. HOOKS
| Check | What | Severity |
|-------|------|----------|
| hooks-file-sync | Every hook in settings.json exists on disk | CRITICAL |
| hooks-orphaned | .hook.ts files not registered in settings.json | HIGH |
| hooks-executable | All hook files have execute permission | HIGH |
| hooks-hardcoded-voice | Voice IDs should use getVoiceId() not literals | MEDIUM |
| hooks-hardcoded-timezone | Timezone should use getPrincipal().timezone | MEDIUM |
| hooks-dead-imports | Unused imports in hook files | LOW |
| hooks-empty-dirs | Empty directories in hooks/ | LOW |

### 2. SKILLS
| Check | What | Severity |
|-------|------|----------|
| skills-index-sync | skill-index.json totalSkills matches actual dirs | CRITICAL |
| skills-disk-missing | Index references dir that doesn't exist on disk | HIGH |
| skills-orphaned-dirs | Skill dirs not in index (excluding CORE, PAI) | MEDIUM |
| skills-empty-skill | SKILL.md missing or empty in skill dir | MEDIUM |
| skills-frontmatter | SKILL.md has valid YAML frontmatter | LOW |
| skills-truncated-desc | fullDescription in index is truncated or invalid | LOW |

### 3. TOOLS
| Check | What | Severity |
|-------|------|----------|
| tools-unreferenced | Tool files never imported/spawned by any hook or skill | MEDIUM |
| tools-duplicate-names | Multiple tools with overlapping names (e.g., Banner variants) | MEDIUM |
| tools-hardcoded-paths | Hardcoded absolute paths that should use getPaiDir() | LOW |
| tools-hardcoded-keys | API keys or tokens hardcoded in tool files | HIGH |

### 4. MEMORY
| Check | What | Severity |
|-------|------|----------|
| memory-work-empty | WORK sessions with only auto-generated files (no real artifacts) | MEDIUM |
| memory-learning-pipeline | ratings.jsonl exists and has recent entries | HIGH |
| memory-wisdom-domains | WISDOM/ has at least 1 domain file | MEDIUM |
| memory-stale-bak | .bak files older than 7 days | LOW |
| memory-security-bloat | SECURITY/ logs > 50 files without rotation | LOW |

### 5. CONFIG
| Check | What | Severity |
|-------|------|----------|
| config-counts-sync | settings.json counts match reality (skills, hooks, work, ratings) | HIGH |
| config-voice-placeholder | voiceClone.voiceId is still placeholder | LOW |
| config-mcp-servers | MCP server binaries exist at configured paths | MEDIUM |
| config-env-vars | Required env vars (EXA_API_KEY, SUPABASE_ACCESS_TOKEN) accessible | MEDIUM |
| config-context-files | contextFiles paths all exist on disk | HIGH |

### 6. VOICE
| Check | What | Severity |
|-------|------|----------|
| voice-server-running | localhost:8888 responds to health check | CRITICAL |
| voice-elevenlabs-api | ElevenLabs API key is valid (test with /voices endpoint) | HIGH |
| voice-validators-cyrillic | output-validators.ts supports Russian text | MEDIUM |

### 7. SECURITY
| Check | What | Severity |
|-------|------|----------|
| security-exposed-keys | API keys in plain text in tracked files | CRITICAL |
| security-gitignore | .gitignore covers .env, credentials, node_modules | HIGH |
| security-file-perms | Sensitive files (settings.json, .env) have correct permissions | MEDIUM |

### 8. UPSTREAM
| Check | What | Severity |
|-------|------|----------|
| upstream-version | Local version vs latest release tag | HIGH |
| upstream-skills-diff | Skills in upstream not installed locally | MEDIUM |
| upstream-hooks-diff | Hooks in upstream not installed locally | MEDIUM |
| upstream-open-issues | Our issues still open, any with fixes/PRs | MEDIUM |
| upstream-our-prs | Status of our submitted PRs | LOW |

## Severity Levels

- **CRITICAL** — System broken or security risk. Fix immediately.
- **HIGH** — Functionality degraded. Fix soon.
- **MEDIUM** — Suboptimal but working. Fix when convenient.
- **LOW** — Cosmetic or minor. Nice to fix.
