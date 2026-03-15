import { describe, test, expect } from "bun:test";

export interface Experiment {
  iteration: number;
  metric: number;
  status: "keep" | "discard" | "baseline";
}

function calculateTrendSlope(keepValues: number[]): number {
  if (keepValues.length < 2) return 0;
  const n = keepValues.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += keepValues[i];
    sumXY += i * keepValues[i];
    sumX2 += i * i;
  }
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

export function evaluateTrajectory(
  experiments: Experiment[],
  remainingGap: number
): "CONTINUE" | "AMPLIFY" | "STOP" | "REDUCE_AMPLITUDE" {
  let consecutiveDiscards = 0;
  for (let i = experiments.length - 1; i >= 0; i--) {
    if (experiments[i].status === "discard") {
      consecutiveDiscards++;
    } else {
      break;
    }
  }

  // Stagnation thresholds
  if (consecutiveDiscards >= 10) return "STOP";

  // Additional signals: Revert rate > 50% over last 20 experiments
  const last20 = experiments.slice(-20);
  if (last20.length >= 20) { // Should only apply if we have 20? The text says "over last 20 experiments", let's assume if it is 20 it applies.
      const reverts20 = last20.filter(e => e.status === "discard").length;
      if (reverts20 / last20.length > 0.5) return "STOP";
  }

  const last10 = experiments.slice(-10);
  const reverts10 = last10.length >= 10 ? last10.filter(e => e.status === "discard").length / last10.length : 0;

  const keepExperiments = experiments.filter(e => e.status === "keep" || e.status === "baseline");
  const last10KeepValues = keepExperiments.slice(-10).map(e => e.metric);

  const slope = keepExperiments.length >= 2 ? calculateTrendSlope(last10KeepValues) : 0;

  // High oscillation check (needs 10 keeps per text "σ of last 10 keep-values")
  if (last10KeepValues.length >= 10) {
    const sigma = calculateStandardDeviation(last10KeepValues);
    const netChange = Math.abs(last10KeepValues[last10KeepValues.length - 1] - last10KeepValues[0]);
    if (sigma > 2 * netChange) {
      return "REDUCE_AMPLITUDE";
    }
  }

  // Plateau check: delta < 1% of remaining gap for 10 iterations -> amplify or STOP
  if (last10KeepValues.length >= 10 && last10.length >= 10) {
    const netChange = Math.abs(last10KeepValues[last10KeepValues.length - 1] - last10KeepValues[0]);
    if (netChange < 0.01 * remainingGap) {
        return "AMPLIFY";
    }
  }

  // L3 Structural checks (needs 10 experiments for analysis per "every 10th iteration")
  if (last10.length >= 10) {
    // Revert rate critical
    if (slope <= 0 && reverts10 > 0.5) return "STOP";
    // Positive trend, critical revert rate
    if (slope > 0 && reverts10 > 0.5) return "STOP";
    // Negative trend
    if (slope < 0) return "STOP";

    // Flat trend
    if (Math.abs(slope) < 0.0001) return "AMPLIFY";

    // Positive trend, high revert rate
    if (slope > 0 && reverts10 >= 0.3 && reverts10 <= 0.5) return "REDUCE_AMPLITUDE";
    // Positive trend, low revert rate
    if (slope > 0 && reverts10 < 0.3) return "CONTINUE";
  }

  // Wait, the 5 consecutive discards should come BEFORE or AFTER L3?
  // Stagnation Detection is general, L3 is every 10 iterations.
  // 5 discards -> AMPLIFY
  if (consecutiveDiscards >= 5) return "AMPLIFY";

  return "CONTINUE";
}

describe("Stagnation Logic", () => {
  const createDiscards = (n: number, startMetric = 100): Experiment[] => {
    return Array.from({ length: n }).map((_, i) => ({
      iteration: i,
      metric: startMetric,
      status: "discard",
    }));
  };
  const createKeeps = (n: number, startMetric = 100, step = 1): Experiment[] => {
    return Array.from({ length: n }).map((_, i) => ({
      iteration: i,
      metric: startMetric + i * step,
      status: "keep",
    }));
  };

  test("Thresholds: 5 discards trigger AMPLIFY, 10 discards trigger STOP", () => {
    expect(evaluateTrajectory(createDiscards(4), 100)).toBe("CONTINUE");
    expect(evaluateTrajectory(createDiscards(5), 100)).toBe("AMPLIFY");
    expect(evaluateTrajectory(createDiscards(9), 100)).toBe("AMPLIFY");
    expect(evaluateTrajectory(createDiscards(10), 100)).toBe("STOP");
  });

  test("Amplify NOT reset counter: explicit text", () => {
    let exps = createDiscards(4);
    expect(evaluateTrajectory(exps, 100)).toBe("CONTINUE");

    exps.push({ iteration: 5, metric: 100, status: "discard" });
    expect(evaluateTrajectory(exps, 100)).toBe("AMPLIFY");

    exps.push({ iteration: 6, metric: 100, status: "discard" });
    exps.push({ iteration: 7, metric: 100, status: "discard" });
    exps.push({ iteration: 8, metric: 100, status: "discard" });
    expect(evaluateTrajectory(exps, 100)).toBe("AMPLIFY");

    exps.push({ iteration: 9, metric: 100, status: "discard" });
    expect(evaluateTrajectory(exps, 100)).toBe("AMPLIFY");

    exps.push({ iteration: 10, metric: 100, status: "discard" });
    expect(evaluateTrajectory(exps, 100)).toBe("STOP");
  });

  test("Additional signals: revert rate > 50% over last 20 experiments returns STOP", () => {
    const exps: Experiment[] = [];
    for (let i = 0; i < 20; i++) {
        exps.push({
            iteration: i,
            metric: 100 + (i % 2 === 0 ? i : 0),
            status: i < 11 ? "discard" : "keep"
        });
    }
    expect(evaluateTrajectory(exps, 100)).toBe("STOP");
  });

  test("Oscillation: sigma > 2x net change returns REDUCE_AMPLITUDE", () => {
    const exps: Experiment[] = [
      { iteration: 1, metric: 100, status: "keep" },
      { iteration: 2, metric: 150, status: "keep" },
      { iteration: 3, metric: 100, status: "keep" },
      { iteration: 4, metric: 150, status: "keep" },
      { iteration: 5, metric: 100, status: "keep" },
      { iteration: 6, metric: 150, status: "keep" },
      { iteration: 7, metric: 100, status: "keep" },
      { iteration: 8, metric: 150, status: "keep" },
      { iteration: 9, metric: 100, status: "keep" },
      { iteration: 10, metric: 105, status: "keep" },
    ];
    expect(evaluateTrajectory(exps, 100)).toBe("REDUCE_AMPLITUDE");
  });

  test("Plateau: delta < 1% of remaining gap for 10 iterations returns AMPLIFY", () => {
    const exps: Experiment[] = [
        ...createKeeps(10, 100, 0.005)
    ];
    expect(evaluateTrajectory(exps, 10)).toBe("AMPLIFY");
  });

  test("L3 Non-contradiction: negative trend returns STOP", () => {
    const exps = createKeeps(10, 100, -1);
    expect(evaluateTrajectory(exps, 100)).toBe("STOP");
  });

  test("L3 Non-contradiction: flat trend returns AMPLIFY", () => {
    const exps = createKeeps(10, 100, 0);
    expect(evaluateTrajectory(exps, 100)).toBe("AMPLIFY");
  });

  test("L3 Non-contradiction: positive trend, low revert rate returns CONTINUE", () => {
    const exps = createKeeps(10, 100, 1);
    expect(evaluateTrajectory(exps, 100)).toBe("CONTINUE");
  });

  test("L3 Non-contradiction: positive trend, 30-50% revert rate returns REDUCE_AMPLITUDE", () => {
    const exps: Experiment[] = [];
    for (let i = 0; i < 10; i++) {
        exps.push({
            iteration: i,
            metric: 100 + i,
            status: i < 4 ? "discard" : "keep"
        });
    }
    expect(evaluateTrajectory(exps, 100)).toBe("REDUCE_AMPLITUDE");
  });
});
