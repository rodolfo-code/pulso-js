import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { calculateKpis } from "@/shared/domain/services/kpi-calculator.service";

const traceArb = fc.record({
  level: fc.option(fc.constantFrom("INFO", "ERROR", "WARN"), { nil: undefined }),
  tags: fc.option(fc.array(fc.string()), { nil: undefined }),
  metadata: fc.option(
    fc.record({ error: fc.option(fc.boolean(), { nil: undefined }) }, { requiredKeys: [] }),
    { nil: undefined }
  ),
  latency: fc.option(fc.float({ min: 0, max: 30 }), { nil: undefined }),
  totalTokens: fc.option(fc.integer({ min: 0, max: 100000 }), { nil: undefined }),
  totalCost: fc.option(fc.float({ min: 0, max: 100 }), { nil: undefined })
});

describe("calculateKpis", () => {
  it("returns all-zero KPIs for empty list", () => {
    const result = calculateKpis([]);
    expect(result.totalRequests).toBe(0);
    expect(result.totalTokens).toBe(0);
    expect(result.totalCostUsd).toBe(0);
    expect(result.errorCount).toBe(0);
    expect(result.errorRate).toBe(0);
    expect(result.avgLatencyMs).toBe(0);
    expect(result.p95LatencyMs).toBe(0);
  });

  it("error_rate is always in [0, 1]", () => {
    fc.assert(
      fc.property(fc.array(traceArb, { minLength: 1, maxLength: 50 }), (traces) => {
        const result = calculateKpis(traces);
        expect(result.errorRate).toBeGreaterThanOrEqual(0);
        expect(result.errorRate).toBeLessThanOrEqual(1);
      })
    );
  });

  it("error_count is always <= total_requests", () => {
    fc.assert(
      fc.property(fc.array(traceArb), (traces) => {
        const result = calculateKpis(traces);
        expect(result.errorCount).toBeLessThanOrEqual(result.totalRequests);
      })
    );
  });

  it("p95 is always >= avg", () => {
    fc.assert(
      fc.property(fc.array(traceArb, { minLength: 1, maxLength: 50 }), (traces) => {
        const result = calculateKpis(traces);
        expect(result.p95LatencyMs).toBeGreaterThanOrEqual(result.avgLatencyMs);
      })
    );
  });

  it("all numeric fields are non-negative", () => {
    fc.assert(
      fc.property(fc.array(traceArb), (traces) => {
        const result = calculateKpis(traces);
        expect(result.totalRequests).toBeGreaterThanOrEqual(0);
        expect(result.totalTokens).toBeGreaterThanOrEqual(0);
        expect(result.totalCostUsd).toBeGreaterThanOrEqual(0);
        expect(result.errorCount).toBeGreaterThanOrEqual(0);
        expect(result.avgLatencyMs).toBeGreaterThanOrEqual(0);
        expect(result.p95LatencyMs).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it("counts traces with level=ERROR as errors", () => {
    const result = calculateKpis([
      { level: "ERROR" },
      { level: "ERROR" },
      { level: "INFO" }
    ]);
    expect(result.errorCount).toBe(2);
    expect(result.errorRate).toBeCloseTo(2 / 3, 5);
  });

  it("counts traces with 'error' tag as errors", () => {
    const result = calculateKpis([
      { tags: ["error"] },
      { tags: ["ok"] }
    ]);
    expect(result.errorCount).toBe(1);
  });

  it("counts traces with metadata.error=true as errors", () => {
    const result = calculateKpis([
      { metadata: { error: true } },
      { metadata: { error: false } }
    ]);
    expect(result.errorCount).toBe(1);
  });
});
