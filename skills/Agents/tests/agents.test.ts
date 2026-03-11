import { expect, test, mock, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { AgentContextLoader } from "../Tools/LoadAgentContext.ts";

const tempHome = join(process.cwd(), ".tmp-agents-test");

// 1. Mock AgentProfileLoader for SpawnAgentWithProfile tests
mock.module("../Tools/AgentProfileLoader", () => {
  return {
    default: class MockAgentProfileLoader {
      async loadProfile(agentType: string, taskDescription: string, projectPath?: string) {
        return {
          profile: { modelPreference: "haiku" },
          fullPrompt: `Mocked prompt for ${agentType}: ${taskDescription}`
        };
      }
      getAvailableProfiles() {
        return ["Architect", "Engineer"];
      }
    }
  };
});

// 2. Mock os.homedir for LoadAgentContext tests
mock.module("os", () => {
  return {
    homedir: () => tempHome
  };
});

// Common Setup
beforeAll(() => {
  if (existsSync(tempHome)) rmSync(tempHome, { recursive: true, force: true });

  // Setup LoadAgentContext files
  mkdirSync(join(tempHome, ".claude/Skills/Agents"), { recursive: true });
  writeFileSync(join(tempHome, ".claude/Skills/Agents/ArchitectContext.md"), "Architect details\n\n**Model**: sonnet");
  writeFileSync(join(tempHome, ".claude/Skills/Agents/TesterContext.md"), "Tester details"); // defaults to opus

  // Setup ComposeAgent files
  mkdirSync(join(tempHome, ".claude/skills/Agents/Data"), { recursive: true });
  mkdirSync(join(tempHome, ".claude/skills/Agents/Templates"), { recursive: true });
  mkdirSync(join(tempHome, ".claude/PAI/USER/SKILLCUSTOMIZATIONS/Agents"), { recursive: true });

  const baseTraitsContent = `
expertise:
  security:
    name: "Security Expert"
    description: "Deep knowledge of vulnerabilities"
    keywords: ["security", "vulnerability"]
  research:
    name: "Researcher"
    description: "Researches stuff"
personality:
  skeptical:
    name: "Skeptical"
    description: "Questions assumptions"
  analytical:
    name: "Analytical"
    description: "Analyzes stuff"
approach:
  thorough:
    name: "Thorough"
    description: "Exhaustive analysis"
voice_mappings:
  default: "System"
  default_voice_id: "default-id"
  voice_registry:
    System:
      voice_id: "default-id"
      description: "Default voice"
      characteristics: ["calm"]
      stability: 0.5
      similarity_boost: 0.75
    "Security Voice":
      voice_id: "sec-id"
      description: "Default sec voice"
      characteristics: ["calm"]
      stability: 0.5
      similarity_boost: 0.75
  mappings:
    - traits: ["security", "skeptical"]
      voice: "Security Voice"
      voice_id: "sec-id"
      reason: "Matched sec"
  fallbacks:
    skeptical: "Skeptical Voice"
    skeptical_voice_id: "skep-id"
examples: {}
  `;
  writeFileSync(join(tempHome, ".claude/skills/Agents/Data/Traits.yaml"), baseTraitsContent);

  const templateContent = `
{{name}}
Task: {{task}}
Voice: {{voice}} ({{voiceId}})
Color: {{color}}
Experts: {{#each expertise}}{{name}}{{/each}}
  `;
  writeFileSync(join(tempHome, ".claude/skills/Agents/Templates/DynamicAgent.hbs"), templateContent);
});

afterAll(() => {
  if (existsSync(tempHome)) rmSync(tempHome, { recursive: true, force: true });
});

// --- SpawnAgentWithProfile.ts tests ---
test("SpawnAgentWithProfile - generateAgentPrompt", async () => {
  const { generateAgentPrompt } = await import("../Tools/SpawnAgentWithProfile.ts");
  const result = await generateAgentPrompt({
    agentType: "Architect",
    taskDescription: "Design a system"
  });

  expect(result.prompt).toBe("Mocked prompt for Architect: Design a system");
  expect(result.model).toBe("haiku");
  expect(result.description).toBe("Architect: Design a system...");
});

// --- LoadAgentContext.ts tests ---
test("LoadAgentContext - loads existing context", () => {
  const loader = new AgentContextLoader();
  const context = loader.loadContext("Architect");

  expect(context.agentType).toBe("Architect");
  expect(context.model).toBe("sonnet");
  expect(context.contextContent).toContain("Architect details");
});

test("LoadAgentContext - defaults to opus when model not specified", () => {
  const loader = new AgentContextLoader();
  const context = loader.loadContext("Tester");

  expect(context.agentType).toBe("Tester");
  expect(context.model).toBe("opus");
  expect(context.contextContent).toContain("Tester details");
});

test("LoadAgentContext - generateEnrichedPrompt", () => {
  const loader = new AgentContextLoader();
  const enriched = loader.generateEnrichedPrompt("Architect", "Help me build an app");

  expect(enriched.model).toBe("sonnet");
  expect(enriched.prompt).toContain("Architect details");
  expect(enriched.prompt).toContain("Help me build an app");
});

// --- ComposeAgent.ts tests ---
test("ComposeAgent - infer traits from task and use default voice fallback", () => {
  const result = Bun.spawnSync([
    "bun",
    "skills/Agents/Tools/ComposeAgent.ts",
    "--task", "find a vulnerability",
    "--output", "json"
  ], {
    env: { ...process.env, HOME: tempHome }
  });

  const stdout = result.stdout.toString().trim();
  const data = JSON.parse(stdout);

  expect(data.traits).toContain("security"); // Inferred from "vulnerability"
  expect(data.expertise).toContain("Security Expert");

  // Explicit combination not matched (we need both security and skeptical for explicit mapping in our baseTraits).
  // Single trait "security" falls back to default mapping voice.
  expect(data.voice).toBe("System");
  expect(data.voice_id).toBe("default-id");
});

test("ComposeAgent - explicit trait combinations and user registry prosody override", () => {
  const userTraitsContent = `
voice_mappings:
  voice_registry:
    "Security Voice":
      voice_id: "sec-id"
      description: "Overridden sec voice registry"
      characteristics: ["intense"]
      prosody:
        stability: 0.9
        similarity_boost: 0.8
        style: 0.5
        speed: 1.2
        use_speaker_boost: true
        volume: 1.0
  `;
  writeFileSync(join(tempHome, ".claude/PAI/USER/SKILLCUSTOMIZATIONS/Agents/Traits.yaml"), userTraitsContent);

  const result = Bun.spawnSync([
    "bun",
    "skills/Agents/Tools/ComposeAgent.ts",
    "--traits", "security,skeptical",
    "--output", "json"
  ], {
    env: { ...process.env, HOME: tempHome }
  });

  const stdout = result.stdout.toString().trim();
  const data = JSON.parse(stdout);

  // Both traits matched the mapping in baseTraits -> "Security Voice".
  expect(data.traits).toContain("security");
  expect(data.traits).toContain("skeptical");
  expect(data.voice).toBe("Security Voice");

  // The prosody in registry was overridden by user traits.
  expect(data.voice_settings.stability).toBe(0.9);
  expect(data.voice_settings.similarity_boost).toBe(0.8);
  expect(data.voice_settings.speed).toBe(1.2);
});
