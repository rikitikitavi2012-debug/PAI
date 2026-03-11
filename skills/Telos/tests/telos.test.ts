import { describe, it, expect, mock, spyOn, afterEach, beforeAll, afterAll } from "bun:test";
import fs from "fs";
import path from "path";
import os from "os";

// 1. ReportTemplate/Lib/utils.ts
import { cn as reportCn } from "../ReportTemplate/Lib/utils";

// 2. ReportTemplate/Lib/report-data.ts
import { reportData } from "../ReportTemplate/Lib/report-data";

// 3. DashboardTemplate/Lib/data.ts
import {
  metrics,
  projects,
  budgetSummary,
  teams,
  vulnerabilities,
  vulnerabilitySummary,
  progressMetrics
} from "../DashboardTemplate/Lib/data";

// 4. DashboardTemplate/Lib/utils.ts
import { cn as dashboardCn } from "../DashboardTemplate/Lib/utils";

// 5. DashboardTemplate/Lib/telos-data.ts
import {
  getAllTelosData,
  getTelosContext,
  getTelosFileList,
  getTelosFileCount
} from "../DashboardTemplate/Lib/telos-data";

describe("TELOS Tests", () => {
  describe("ReportTemplate/Lib/utils.ts", () => {
    it("should merge class names correctly using cn()", () => {
      expect(reportCn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
      expect(reportCn("px-2 py-1", "p-4")).toBe("p-4"); // tailwind-merge in action
      expect(reportCn("bg-red-500", undefined, null, "text-white", false)).toBe("bg-red-500 text-white");
    });
  });

  describe("ReportTemplate/Lib/report-data.ts", () => {
    it("should export reportData with correct default structure", () => {
      expect(reportData.clientName).toBe("[CLIENT NAME]");
      expect(reportData.reportTitle).toBe("Strategic Assessment & Transformation Roadmap");
      expect(reportData.classification).toBe("CONFIDENTIAL");
      expect(reportData.executiveSummary.methodology.roles.length).toBeGreaterThan(0);
      expect(reportData.findings.length).toBeGreaterThan(0);
      expect(reportData.findings[0].severity).toBe("critical");
      expect(reportData.roadmap.length).toBe(3);
    });
  });

  describe("DashboardTemplate/Lib/data.ts", () => {
    it("should export correct dashboard data structures", () => {
      expect(metrics.timeToDetect.improvement).toBe(89);
      expect(projects.length).toBeGreaterThan(0);
      expect(projects[0].id).toBe("P001");
      expect(budgetSummary.totalOneTime).toBe(100000);
      expect(teams.length).toBeGreaterThan(0);
      expect(teams[0].id).toBe("T001");
      expect(vulnerabilities.length).toBeGreaterThan(0);
      expect(vulnerabilities[0].severity).toBe("Critical");
      expect(vulnerabilitySummary.total).toBe(100);
      expect(progressMetrics.length).toBeGreaterThan(0);
      expect(progressMetrics[0].target).toBe(100);
    });
  });

  describe("DashboardTemplate/Lib/utils.ts", () => {
    it("should merge class names correctly using cn()", () => {
      expect(dashboardCn("flex", "items-center")).toBe("flex items-center");
      expect(dashboardCn("text-sm", "text-lg")).toBe("text-lg"); // tailwind-merge overriding
    });
  });

  describe("DashboardTemplate/Lib/telos-data.ts", () => {
    const TELOS_DIR = path.join(os.homedir(), '.claude/PAI/USER/TELOS');
    let existsSyncSpy: any;
    let readdirSyncSpy: any;
    let statSyncSpy: any;
    let readFileSyncSpy: any;

    beforeAll(() => {
      existsSyncSpy = spyOn(fs, "existsSync");
      readdirSyncSpy = spyOn(fs, "readdirSync");
      statSyncSpy = spyOn(fs, "statSync");
      readFileSyncSpy = spyOn(fs, "readFileSync");
    });

    afterAll(() => {
      mock.restore();
    });

    afterEach(() => {
      mock.restore();
      existsSyncSpy = spyOn(fs, "existsSync");
      readdirSyncSpy = spyOn(fs, "readdirSync");
      statSyncSpy = spyOn(fs, "statSync");
      readFileSyncSpy = spyOn(fs, "readFileSync");
    });

    it("should retrieve all TELOS data correctly", () => {
      existsSyncSpy.mockImplementation((dirPath: string) => {
        if (dirPath === TELOS_DIR) return true;
        if (dirPath === path.join(TELOS_DIR, 'data')) return true;
        return false;
      });

      readdirSyncSpy.mockImplementation((dirPath: string) => {
        if (dirPath === TELOS_DIR) return ["TELOS.md", "MISSION.md", "OTHER.md", ".hidden"];
        if (dirPath === path.join(TELOS_DIR, 'data')) return ["metrics.csv", ".ignore.csv"];
        return [];
      });

      statSyncSpy.mockImplementation(() => ({ isFile: () => true }));

      readFileSyncSpy.mockImplementation((filePath: string) => {
        const basename = path.basename(filePath);
        if (basename === "TELOS.md") return "Telos content";
        if (basename === "MISSION.md") return "Mission content";
        if (basename === "OTHER.md") return "Other content";
        if (basename === "metrics.csv") return "id,val\n1,100";
        return "";
      });

      const data = getAllTelosData();
      expect(data.length).toBe(4);

      // Check sorting (core files first)
      expect(data[0].name).toBe("TELOS");
      expect(data[1].name).toBe("MISSION");
      expect(data[2].name).toBe("metrics");
      expect(data[3].name).toBe("OTHER");

      expect(data[0].content).toBe("Telos content");
      expect(data[0].type).toBe("markdown");
      expect(data[2].type).toBe("csv");
    });

    it("should return empty array if TELOS directory does not exist", () => {
      existsSyncSpy.mockReturnValue(false);
      const data = getAllTelosData();
      expect(data).toEqual([]);
    });

    it("should build telos context correctly", () => {
      existsSyncSpy.mockImplementation((dirPath: string) => {
        if (dirPath === TELOS_DIR) return true;
        return false;
      });

      readdirSyncSpy.mockImplementation((dirPath: string) => {
        if (dirPath === TELOS_DIR) return ["TELOS.md"];
        return [];
      });

      statSyncSpy.mockImplementation(() => ({ isFile: () => true }));

      readFileSyncSpy.mockImplementation((filePath: string) => {
        if (path.basename(filePath) === "TELOS.md") return "My telos content";
        return "";
      });

      const context = getTelosContext();
      expect(context).toContain("# Personal TELOS (Life Operating System)");
      expect(context).toContain("## TELOS");
      expect(context).toContain("My telos content");
    });

    it("should return correct file list and count", () => {
      existsSyncSpy.mockImplementation((dirPath: string) => {
        if (dirPath === TELOS_DIR) return true;
        if (dirPath === path.join(TELOS_DIR, 'data')) return true;
        return false;
      });

      readdirSyncSpy.mockImplementation((dirPath: string) => {
        if (dirPath === TELOS_DIR) return ["TELOS.md", "MISSION.md"];
        if (dirPath === path.join(TELOS_DIR, 'data')) return ["stats.csv"];
        return [];
      });

      statSyncSpy.mockImplementation(() => ({ isFile: () => true }));
      readFileSyncSpy.mockReturnValue("content");

      const fileList = getTelosFileList();
      expect(fileList).toEqual(["TELOS.md", "MISSION.md", "data/stats.csv"]);

      const count = getTelosFileCount();
      expect(count).toBe(3);
    });
  });

  describe("Tools/UpdateTelos.ts", () => {
    const TEMP_DIR = path.join(os.tmpdir(), `update-telos-test-${Date.now()}`);
    const TEMP_TELOS_DIR = path.join(TEMP_DIR, '.claude/context/life/telos');
    const TEMP_BACKUPS_DIR = path.join(TEMP_TELOS_DIR, 'backups');
    const UPDATES_FILE = path.join(TEMP_TELOS_DIR, 'updates.md');
    const BOOKS_FILE = path.join(TEMP_TELOS_DIR, 'BOOKS.md');

    beforeAll(() => {
      // Setup temp directory structure
      fs.mkdirSync(TEMP_BACKUPS_DIR, { recursive: true });
      fs.writeFileSync(BOOKS_FILE, "- Original Book\n");
      fs.writeFileSync(UPDATES_FILE, "# Updates\n\n## Future Changes\nDocument all changes below...\n");
    });

    afterAll(() => {
      // Cleanup temp directory
      if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
      }
    });

    it("should update a TELOS file, create backup, and log changes", async () => {
      const { spawnSync } = require("child_process");

      const scriptPath = path.resolve(__dirname, "../Tools/UpdateTelos.ts");

      const result = spawnSync("bun", [
        scriptPath,
        "BOOKS.md",
        "- Project Hail Mary by Andy Weir",
        "Added new favorite book"
      ], {
        env: {
          ...process.env,
          HOME: TEMP_DIR
        },
        encoding: 'utf-8'
      });

      expect(result.status).toBe(0);

      // Verify BOOKS.md was updated
      const updatedBooksContent = fs.readFileSync(BOOKS_FILE, 'utf-8');
      expect(updatedBooksContent).toContain("- Original Book");
      expect(updatedBooksContent).toContain("- Project Hail Mary by Andy Weir");

      // Verify backup was created
      const backups = fs.readdirSync(TEMP_BACKUPS_DIR);
      expect(backups.length).toBe(1);
      expect(backups[0]).toMatch(/^BOOKS-\d{8}-\d{6}\.md$/);

      const backupContent = fs.readFileSync(path.join(TEMP_BACKUPS_DIR, backups[0]), 'utf-8');
      expect(backupContent).toBe("- Original Book\n"); // Assuming original file ends with newline

      // Verify updates.md was updated
      const updatesContent = fs.readFileSync(UPDATES_FILE, 'utf-8');
      expect(updatesContent).toContain("- **File Modified**: BOOKS.md");
      expect(updatesContent).toContain("- **Description**: Added new favorite book");
      expect(updatesContent).toContain(backups[0]); // Ensure backup filename is logged
    });

    it("should fail if invalid file is provided", () => {
      const { spawnSync } = require("child_process");
      const scriptPath = path.resolve(__dirname, "../Tools/UpdateTelos.ts");

      const result = spawnSync("bun", [
        scriptPath,
        "INVALID_FILE.md",
        "content",
        "description"
      ], {
        env: {
          ...process.env,
          HOME: TEMP_DIR
        },
        encoding: 'utf-8'
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("❌ Invalid file");
    });

    it("should fail if valid file does not exist in the directory", () => {
      const { spawnSync } = require("child_process");
      const scriptPath = path.resolve(__dirname, "../Tools/UpdateTelos.ts");

      const result = spawnSync("bun", [
        scriptPath,
        "MISSIONS.md", // Typo in file
        "content",
        "description"
      ], {
        env: {
          ...process.env,
          HOME: TEMP_DIR
        },
        encoding: 'utf-8'
      });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("❌ Invalid file"); // Because it should be MISSION.md

      // Try valid file but doesn't exist
      const result2 = spawnSync("bun", [
        scriptPath,
        "MISSION.md", // Missing from temp dir
        "content",
        "description"
      ], {
        env: {
          ...process.env,
          HOME: TEMP_DIR
        },
        encoding: 'utf-8'
      });

      expect(result2.status).toBe(1);
      expect(result2.stderr).toContain("❌ File does not exist");
    });
  });
});
