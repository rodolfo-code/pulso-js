import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { SLOOperator } from "@/shared/domain/entities/slo-definition.entity";
import {
  evaluateOperator,
  extractMetric,
  isCbMetric,
  parseCbMetric
} from "@/shared/domain/services/slo-evaluator.service";
import { KPIResult } from "@/shared/domain/value-objects/kpi-result.vo";

describe("evaluateOperator", () => {
  it("lte: measured <= threshold", () => {
    expect(evaluateOperator(5, SLOOperator.LTE, 10)).toBe(true);
    expect(evaluateOperator(10, SLOOperator.LTE, 10)).toBe(true);
    expect(evaluateOperator(11, SLOOperator.LTE, 10)).toBe(false);
  });

  it("gte: measured >= threshold", () => {
    expect(evaluateOperator(99, SLOOperator.GTE, 100)).toBe(false);
    expect(evaluateOperator(100, SLOOperator.GTE, 100)).toBe(true);
    expect(evaluateOperator(101, SLOOperator.GTE, 100)).toBe(true);
  });

  it("lt: measured < threshold (strict)", () => {
    expect(evaluateOperator(5, SLOOperator.LT, 10)).toBe(true);
    expect(evaluateOperator(10, SLOOperator.LT, 10)).toBe(false);
  });

  it("gt: measured > threshold (strict)", () => {
    expect(evaluateOperator(100, SLOOperator.GT, 100)).toBe(false);
    expect(evaluateOperator(101, SLOOperator.GT, 100)).toBe(true);
  });

  it("is deterministic for same inputs", () => {
    fc.assert(
      fc.property(
        fc.float({ noNaN: true }),
        fc.constantFrom(SLOOperator.LTE, SLOOperator.GTE, SLOOperator.LT, SLOOperator.GT),
        fc.float({ noNaN: true }),
        (m, op, t) => {
          expect(evaluateOperator(m, op, t)).toBe(evaluateOperator(m, op, t));
        }
      )
    );
  });
});

describe("extractMetric", () => {
  const kpis = new KPIResult(100, 5000, 1.234, 5, 0.05, 250, 800);

  it("returns the correct field for known metrics", () => {
    expect(extractMetric(kpis, "error_rate")).toBe(0.05);
    expect(extractMetric(kpis, "avg_latency_ms")).toBe(250);
    expect(extractMetric(kpis, "p95_latency_ms")).toBe(800);
    expect(extractMetric(kpis, "total_requests")).toBe(100);
    expect(extractMetric(kpis, "error_count")).toBe(5);
    expect(extractMetric(kpis, "total_cost_usd")).toBe(1.234);
    expect(extractMetric(kpis, "total_tokens")).toBe(5000);
  });

  it("returns null for unknown metric (matches legacy silent-null behavior)", () => {
    expect(extractMetric(kpis, "nonexistent_metric")).toBeNull();
    expect(extractMetric(kpis, "")).toBeNull();
  });
});

describe("parseCbMetric", () => {
  it("returns {base, cbName: null} when no colon", () => {
    expect(parseCbMetric("cb_open_duration_minutes")).toEqual({
      base: "cb_open_duration_minutes",
      cbName: null
    });
  });

  it("returns {base, cbName} when colon present", () => {
    expect(parseCbMetric("cb_open_duration_minutes:llm-provider")).toEqual({
      base: "cb_open_duration_minutes",
      cbName: "llm-provider"
    });
  });

  it("trims spaces around base and cbName", () => {
    expect(parseCbMetric("  cb_open_count  :  database  ")).toEqual({
      base: "cb_open_count",
      cbName: "database"
    });
  });

  it("treats empty cbName as null", () => {
    expect(parseCbMetric("cb_open_count:")).toEqual({
      base: "cb_open_count",
      cbName: null
    });
  });
});

describe("isCbMetric", () => {
  it("returns true for the 3 known CB metrics", () => {
    expect(isCbMetric("cb_open_duration_minutes")).toBe(true);
    expect(isCbMetric("cb_open_count")).toBe(true);
    expect(isCbMetric("cb_availability_pct")).toBe(true);
  });

  it("returns true with cbName suffix", () => {
    expect(isCbMetric("cb_open_duration_minutes:llm-provider")).toBe(true);
  });

  it("returns false for non-CB metrics", () => {
    expect(isCbMetric("error_rate")).toBe(false);
    expect(isCbMetric("p95_latency_ms")).toBe(false);
    expect(isCbMetric("something_random")).toBe(false);
  });
});
