import { describe, test, expect, beforeAll } from "bun:test";
import { join } from "path";

// Types matched to TelosParser.ts output
interface Mission {
  id: string;
  name: string;
  description: string;
  status: string;
  linkedGoals: string[];
  progress: number;
}

interface Goal {
  id: string;
  name: string;
  status: string;
  missions: string[];
  checked: number;
  total: number;
  progress: number;
  blockers: string[];
}

interface Challenge {
  id: string;
  name: string;
  status: string;
  severity: "high" | "medium" | "low";
  linkedStrategies: string[];
}

interface Strategy {
  id: string;
  name: string;
  addresses: string[];
  effectiveness: "working" | "partial" | "unknown";
  status: string;
}

interface CapitalAllocation {
  name: string;
  amount: number;
  percent: number;
  priority: string;
  goal: string;
}

interface Season {
  current: "offseason" | "season";
  seasonLabel: string;
  transitionDate: string;
  daysRemaining: number;
  totalDays: number;
  elapsedPercent: number;
}

interface TelosState {
  generated: string;
  missions: Mission[];
  goals: Goal[];
  challenges: Challenge[];
  strategies: Strategy[];
  projects: any[];
  capital: { total: number; allocations: CapitalAllocation[] };
  season: Season;
  status: any;
  system: any;
}

describe("TelosParser.ts", () => {
  let state: TelosState;

  beforeAll(() => {
    // Determine the root PAI directory (this test is in hooks/tests)
    const baseDir = join(process.cwd(), "PAI/Tools/TelosParser.ts");

    // Execute the parser with --stdout to capture the JSON
    const proc = Bun.spawnSync(["bun", baseDir, "--stdout"]);

    expect(proc.exitCode).toBe(0);

    const output = proc.stdout.toString();
    state = JSON.parse(output);
  });

  test("Full integration: generates valid JSON with all sections", () => {
    expect(state).toBeDefined();
    expect(state.generated).toBeDefined();
    expect(Array.isArray(state.missions)).toBe(true);
    expect(Array.isArray(state.goals)).toBe(true);
    expect(Array.isArray(state.challenges)).toBe(true);
    expect(Array.isArray(state.strategies)).toBe(true);
    expect(Array.isArray(state.projects)).toBe(true);
    expect(state.capital).toBeDefined();
    expect(state.season).toBeDefined();
    expect(state.status).toBeDefined();
    expect(state.system).toBeDefined();
  });

  test("parseMissions: extracts 4 missions (M0-M3) with correct names", () => {
    expect(state.missions.length).toBe(4);

    const m0 = state.missions.find((m) => m.id === "M0");
    expect(m0).toBeDefined();
    expect(m0?.name).toBe("Независимость");

    const m1 = state.missions.find((m) => m.id === "M1");
    expect(m1).toBeDefined();
    expect(m1?.name).toBe("Инновации");

    const m2 = state.missions.find((m) => m.id === "M2");
    expect(m2).toBeDefined();
    expect(m2?.name).toBe("Семья и Дом");

    const m3 = state.missions.find((m) => m.id === "M3");
    expect(m3).toBeDefined();
    expect(m3?.name).toBe("Техно-суверенитет");
  });

  test("parseMissions: links goals from mapping table (M0 → dynamically read)", () => {
    const m0 = state.missions.find((m) => m.id === "M0");

    // Read the actual MISSION.md to find the expected goals
    const missionPath = join(process.cwd(), "PAI/USER/TELOS/MISSION.md");
    const missionContent = require("fs").readFileSync(missionPath, "utf-8");
    const mapSection = missionContent.match(/## Mission → Goal Mapping[\s\S]*?(?=\n---|\n## |$)/);
    let expectedGoals = [];
    if (mapSection) {
      const rows = mapSection[0].split("\n").filter(l => l.includes("|") && /M0/.test(l));
      for (const row of rows) {
        const cells = row.split("|").map(s => s.trim()).filter(Boolean);
        const mMatch = cells[0]?.match(/M0/);
        if (mMatch && cells[1]) {
          expectedGoals = cells[1].match(/G\d+/g) || [];
          break;
        }
      }
    }

    expect(m0?.linkedGoals).toEqual(expectedGoals);
  });

  test("parseGoals: counts checkboxes correctly (G0: 7/13 = 54%)", () => {
    const g0 = state.goals.find((g) => g.id === "G0");
    expect(g0).toBeDefined();
    expect(g0?.checked).toBe(7);
    expect(g0?.total).toBe(13);
    expect(g0?.progress).toBe(54);
  });

  test('parseGoals: extracts status field (contains "Активна")', () => {
    const g0 = state.goals.find((g) => g.id === "G0");
    expect(g0?.status).toContain("Активна");
  });

  test("parseGoals: extracts mission links (G0 → M1, M0)", () => {
    const g0 = state.goals.find((g) => g.id === "G0");
    expect(g0?.missions).toEqual(["M1", "M0"]);
  });

  test("parseChallenges: extracts 5 challenges with correct severity", () => {
    expect(state.challenges.length).toBe(5);

    const severities = state.challenges.map((c) => c.severity);
    expect(severities.every((s) => ["high", "medium", "low"].includes(s))).toBe(
      true,
    );

    const c0 = state.challenges.find((c) => c.id === "C0");
    expect(c0?.severity).toBe("high");

    const c2 = state.challenges.find((c) => c.id === "C2");
    expect(c2?.severity).toBe("low");
  });

  test("parseStrategies: extracts strategies with effectiveness", () => {
    expect(state.strategies.length).toBeGreaterThanOrEqual(8);

    const s1 = state.strategies.find((s) => s.id === "S1");
    expect(s1?.effectiveness).toBe("working");

    const s3 = state.strategies.find((s) => s.id === "S3");
    expect(s3?.effectiveness).toBe("partial");
  });

  test("parseCapital: extracts 6 allocations totaling 3.5M", () => {
    expect(state.capital.total).toBe(3500000);
    expect(state.capital.allocations.length).toBe(6);

    const ziemla = state.capital.allocations.find((a) =>
      a.name.includes("Земля Былым"),
    );
    expect(ziemla?.amount).toBe(1500000);
    expect(ziemla?.percent).toBe(43);
  });

  test('calculateSeason: returns "offseason" in Dec-Mar', () => {
    // Assuming the test runs dynamically, verify it returns one of the valid options
    expect(["offseason", "season"]).toContain(state.season.current);

    // And ensure logic is present
    const month = new Date().getMonth() + 1;
    if (month === 12 || month <= 3) {
      expect(state.season.current).toBe("offseason");
    } else {
      expect(state.season.current).toBe("season");
    }
  });

  test("computeMissionProgress: M1 progress derived dynamically from its linked goals", () => {
    const m1 = state.missions.find((m) => m.id === "M1");
    expect(m1).toBeDefined();

    // Re-calculate logically to prove test matches computation logic
    const linkedGoals = state.goals.filter((g) => m1?.linkedGoals.includes(g.id));

    let totalWeight = 0;
    let weightedSum = 0;

    for (const g of linkedGoals) {
      const isActive = g.status.toLowerCase().includes("активна") || g.status.toLowerCase().includes("высокий");
      const weight = isActive ? 2 : 1;
      weightedSum += g.progress * weight;
      totalWeight += weight;
    }

    const expectedProgress = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    expect(m1?.progress).toBe(expectedProgress);
  });
});
