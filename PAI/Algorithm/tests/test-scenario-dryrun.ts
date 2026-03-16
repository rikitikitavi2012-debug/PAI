import { describe, it, expect } from "bun:test";

type Phase =
  | "OBSERVE" | "THINK" | "PLAN" | "CYCLE_SELECTOR" | "BUILD" | "EXECUTE"
  | "VERIFY" | "LEARN" | "COMPLETE"
  | "AR_REVIEW" | "AR_IDEATE" | "AR_MODIFY" | "AR_COMMIT"
  | "AR_VERIFY" | "AR_DECIDE" | "AR_LOG" | "AR_REPEAT";

type ExecuteMode = "Standard" | "Autoresearch" | "Hybrid" | null;

interface State {
  phase: Phase;
  tier: "Standard" | "Extended" | "Advanced" | "Deep" | "Comprehensive";
  bCriteria: number;
  qCriteria: number;
  distinctApproaches: number;
  executeMode: ExecuteMode;
  arDiscards: number;
  arReentries: number;
  mockDecide: "KEEP" | "DISCARD" | "TARGET_MET";
  history: Phase[];
}

class Machine {
  s: State;

  constructor(init: Partial<State> = {}) {
    this.s = {
      phase: "OBSERVE",
      tier: "Extended",
      bCriteria: 0,
      qCriteria: 0,
      distinctApproaches: 0,
      executeMode: null,
      arDiscards: 0,
      arReentries: 0,
      mockDecide: "KEEP",
      history: ["OBSERVE"],
      ...init
    };
  }

  setPhase(p: Phase) {
    this.s.phase = p;
    this.s.history.push(p);
  }

  step() {
    switch(this.s.phase) {
      case "OBSERVE": this.setPhase("THINK"); break;
      case "THINK": this.setPhase("PLAN"); break;
      case "PLAN": this.setPhase("CYCLE_SELECTOR"); break;
      case "CYCLE_SELECTOR":
        if (this.s.tier === "Standard" || this.s.qCriteria === 0) {
          this.s.executeMode = "Standard";
        } else if (this.s.bCriteria > 0 && this.s.qCriteria > 0) {
          this.s.executeMode = "Hybrid";
        } else if (this.s.qCriteria > 0 && this.s.distinctApproaches < 3) {
          this.s.executeMode = "Standard";
        } else {
          this.s.executeMode = "Autoresearch";
        }
        this.setPhase("BUILD");
        break;
      case "BUILD": this.setPhase("EXECUTE"); break;
      case "EXECUTE":
        if (this.s.executeMode === "Standard") {
          this.setPhase("VERIFY");
        } else {
          this.setPhase("AR_REVIEW");
        }
        break;

      // AR loop
      case "AR_REVIEW": this.setPhase("AR_IDEATE"); break;
      case "AR_IDEATE": this.setPhase("AR_MODIFY"); break;
      case "AR_MODIFY": this.setPhase("AR_COMMIT"); break;
      case "AR_COMMIT": this.setPhase("AR_VERIFY"); break;
      case "AR_VERIFY": this.setPhase("AR_DECIDE"); break;
      case "AR_DECIDE":
        if (this.s.mockDecide === "DISCARD") {
          this.s.arDiscards++;
        } else if (this.s.mockDecide === "KEEP" || this.s.mockDecide === "TARGET_MET") {
          this.s.arDiscards = 0;
        }
        this.setPhase("AR_LOG");
        break;
      case "AR_LOG": this.setPhase("AR_REPEAT"); break;
      case "AR_REPEAT":
        if (this.s.mockDecide === "TARGET_MET") {
          this.setPhase("VERIFY");
        } else if (this.s.arDiscards >= 10) {
          if (this.s.arReentries < 2) {
            this.s.arReentries++;
            this.s.arDiscards = 0; // reset for next AR entry
            this.setPhase("THINK");
          } else {
            // max re-entries reached (2) -> 3rd stagnation
            this.setPhase("VERIFY");
          }
        } else {
          this.setPhase("AR_REVIEW");
        }
        break;

      case "VERIFY": this.setPhase("LEARN"); break;
      case "LEARN": this.setPhase("COMPLETE"); break;
      case "COMPLETE": break;
    }
  }

  run() {
    let steps = 0;
    while(this.s.phase !== "COMPLETE" && steps < 1000) {
      this.step();
      steps++;
    }
  }
}

describe("Algorithm v4.0.0 State Machine Dry-Run", () => {
  it("A) Standard pure-[B]", () => {
    const m = new Machine({ tier: "Extended", bCriteria: 10, qCriteria: 0 });
    m.run();
    expect(m.s.executeMode).toBe("Standard");
    expect(m.s.history).toContain("CYCLE_SELECTOR");
    expect(m.s.history).toContain("EXECUTE");
    expect(m.s.history).toContain("VERIFY");
    expect(m.s.history).not.toContain("AR_REVIEW");
  });

  it("B) Extended pure-[Q] autoresearch", () => {
    const m = new Machine({ tier: "Extended", bCriteria: 0, qCriteria: 5, distinctApproaches: 4, mockDecide: "TARGET_MET" });
    m.run();
    expect(m.s.executeMode).toBe("Autoresearch");
    expect(m.s.history).toContain("AR_REVIEW");
    expect(m.s.history).toContain("AR_DECIDE");
    expect(m.s.history).toContain("VERIFY");
  });

  it("C) Hybrid [B]+[Q]", () => {
    const m = new Machine({ tier: "Extended", bCriteria: 5, qCriteria: 5, distinctApproaches: 4, mockDecide: "TARGET_MET" });
    m.run();
    expect(m.s.executeMode).toBe("Hybrid");
    expect(m.s.history).toContain("EXECUTE");
    expect(m.s.history).toContain("AR_REVIEW");
    expect(m.s.history).toContain("VERIFY");
  });

  it("D) Stagnation 10 discards", () => {
    const m = new Machine({ tier: "Extended", bCriteria: 0, qCriteria: 5, distinctApproaches: 4, mockDecide: "DISCARD" });

    // We want to force it to TARGET_MET after it re-enters THINK once
    let steps = 0;
    while (m.s.phase !== "COMPLETE" && steps < 1000) {
      m.step();
      if (m.s.arReentries === 1 && m.s.phase === "THINK") {
        m.s.mockDecide = "TARGET_MET";
      }
      steps++;
    }

    expect(m.s.arReentries).toBe(1);

    // Check history: we should see THINK twice
    const thinks = m.s.history.filter(p => p === "THINK").length;
    expect(thinks).toBe(2); // First one at start, second one after 10 discards
  });

  it("E) Max re-entry 3 stagnations", () => {
    const m = new Machine({ tier: "Extended", bCriteria: 0, qCriteria: 5, distinctApproaches: 4, mockDecide: "DISCARD" });
    m.run();

    // It should hit VERIFY on the 3rd stagnation
    expect(m.s.arReentries).toBe(2);

    const thinks = m.s.history.filter(p => p === "THINK").length;
    expect(thinks).toBe(3); // Start, 1st stagnation, 2nd stagnation

    // The last phase should be COMPLETE
    expect(m.s.history[m.s.history.length - 1]).toBe("COMPLETE");

    // It should transition from AR_REPEAT to VERIFY directly at the end
    expect(m.s.history).toContain("VERIFY");
  });
});
