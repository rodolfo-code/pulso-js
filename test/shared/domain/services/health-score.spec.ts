import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computeHealthScore } from "@/shared/domain/services/health-score.service";
import { HealthClassification } from "@/shared/domain/value-objects/health-score.vo";

const errorRateArb = fc.float({ min: 0, max: 1, noNaN: true });
const latencyArb = fc.integer({ min: 0, max: 60000 });
const thresholdArb = fc.integer({ min: 1, max: 30000 });
const ageArb = fc.integer({ min: 0, max: 3600 });
const timeoutArb = fc.integer({ min: 1, max: 600 });
const cbCountArb = fc.integer({ min: 0, max: 10 });

describe("computeHealthScore", () => {
  it("score is always in [0, 100]", () => {
    fc.assert(
      fc.property(
        errorRateArb,
        latencyArb,
        thresholdArb,
        ageArb,
        timeoutArb,
        cbCountArb,
        cbCountArb,
        (errorRate, avgLatencyMs, latencyThresholdMs, heartbeatAgeS, heartbeatTimeoutS, cbOpenCount, cbHalfOpenCount) => {
          const result = computeHealthScore({
            errorRate,
            avgLatencyMs,
            latencyThresholdMs,
            heartbeatAgeS,
            heartbeatTimeoutS,
            cbOpenCount,
            cbHalfOpenCount
          });
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        }
      )
    );
  });

  it("classification matches score thresholds when no CB active", () => {
    fc.assert(
      fc.property(
        errorRateArb,
        latencyArb,
        thresholdArb,
        ageArb,
        timeoutArb,
        (errorRate, avgLatencyMs, latencyThresholdMs, heartbeatAgeS, heartbeatTimeoutS) => {
          const result = computeHealthScore({
            errorRate,
            avgLatencyMs,
            latencyThresholdMs,
            heartbeatAgeS,
            heartbeatTimeoutS,
            cbOpenCount: 0,
            cbHalfOpenCount: 0
          });
          if (result.score >= 80) expect(result.classification).toBe(HealthClassification.HEALTHY);
          else if (result.score >= 50) expect(result.classification).toBe(HealthClassification.DEGRADED);
          else expect(result.classification).toBe(HealthClassification.CRITICAL);
        }
      )
    );
  });

  it("CB open downgrades HEALTHY to DEGRADED", () => {
    const result = computeHealthScore({
      errorRate: 0,
      avgLatencyMs: 0,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 0,
      heartbeatTimeoutS: 120,
      cbOpenCount: 1,
      cbHalfOpenCount: 0
    });
    expect(result.classification).toBe(HealthClassification.DEGRADED);
  });

  it("CB half-open downgrades HEALTHY to DEGRADED", () => {
    const result = computeHealthScore({
      errorRate: 0,
      avgLatencyMs: 0,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 0,
      heartbeatTimeoutS: 120,
      cbOpenCount: 0,
      cbHalfOpenCount: 1
    });
    expect(result.classification).toBe(HealthClassification.DEGRADED);
  });

  it("perfect input (no errors, instant heartbeat, no CBs) → score 100 / HEALTHY", () => {
    const result = computeHealthScore({
      errorRate: 0,
      avgLatencyMs: 0,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 0,
      heartbeatTimeoutS: 120
    });
    expect(result.score).toBe(100);
    expect(result.classification).toBe(HealthClassification.HEALTHY);
  });

  it("max errorRate=1 alone removes 50 points", () => {
    const result = computeHealthScore({
      errorRate: 1,
      avgLatencyMs: 0,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 0,
      heartbeatTimeoutS: 120
    });
    expect(result.score).toBe(50);
  });

  it("latency at threshold removes full 30 points", () => {
    const result = computeHealthScore({
      errorRate: 0,
      avgLatencyMs: 8000,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 0,
      heartbeatTimeoutS: 120
    });
    expect(result.score).toBe(70);
  });

  it("heartbeat at timeout removes full 20 points", () => {
    const result = computeHealthScore({
      errorRate: 0,
      avgLatencyMs: 0,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 120,
      heartbeatTimeoutS: 120
    });
    expect(result.score).toBe(80);
  });

  it("3 CBs open → score floored at 0", () => {
    const result = computeHealthScore({
      errorRate: 0,
      avgLatencyMs: 0,
      latencyThresholdMs: 8000,
      heartbeatAgeS: 0,
      heartbeatTimeoutS: 120,
      cbOpenCount: 4
    });
    expect(result.score).toBe(0);
    expect(result.classification).toBe(HealthClassification.CRITICAL);
  });
});
