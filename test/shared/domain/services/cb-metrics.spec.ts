import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { BreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";
import { CircuitBreakerTransition } from "@/shared/domain/entities/circuit-breaker-transition.entity";
import { calculateCbMetrics } from "@/shared/domain/services/cb-metrics.service";

const WINDOW_START = new Date("2026-06-01T00:00:00.000Z");
const WINDOW_END = new Date("2026-06-01T01:00:00.000Z"); // 1h window

function makeTransition(at: Date, state: BreakerState): CircuitBreakerTransition {
  return new CircuitBreakerTransition(
    "00000000-0000-0000-0000-000000000000",
    "agent-1",
    "llm",
    state,
    0,
    at
  );
}

describe("calculateCbMetrics", () => {
  it("returns 100% availability for empty history", () => {
    const result = calculateCbMetrics([], WINDOW_START, WINDOW_END);
    expect(result.cbAvailabilityPct).toBe(100);
    expect(result.cbOpenCount).toBe(0);
    expect(result.cbOpenDurationMinutes).toBe(0);
  });

  it("returns 100% availability when window is non-positive", () => {
    const result = calculateCbMetrics(
      [makeTransition(WINDOW_START, BreakerState.OPEN)],
      WINDOW_END,
      WINDOW_START
    );
    expect(result.cbAvailabilityPct).toBe(100);
  });

  it("CB closed the entire window → 0 open minutes, 100% availability", () => {
    const result = calculateCbMetrics(
      [makeTransition(WINDOW_START, BreakerState.CLOSED)],
      WINDOW_START,
      WINDOW_END
    );
    expect(result.cbOpenDurationMinutes).toBe(0);
    expect(result.cbAvailabilityPct).toBe(100);
    expect(result.cbOpenCount).toBe(0);
  });

  it("CB open the entire window → ~60 open minutes, 0% availability", () => {
    const result = calculateCbMetrics(
      [makeTransition(WINDOW_START, BreakerState.OPEN)],
      WINDOW_START,
      WINDOW_END
    );
    expect(result.cbOpenDurationMinutes).toBe(60);
    expect(result.cbAvailabilityPct).toBe(0);
    expect(result.cbOpenCount).toBe(1);
  });

  it("counts distinct transitions into open", () => {
    const result = calculateCbMetrics(
      [
        makeTransition(new Date("2026-06-01T00:00:00Z"), BreakerState.OPEN),
        makeTransition(new Date("2026-06-01T00:10:00Z"), BreakerState.CLOSED),
        makeTransition(new Date("2026-06-01T00:20:00Z"), BreakerState.OPEN),
        makeTransition(new Date("2026-06-01T00:30:00Z"), BreakerState.CLOSED)
      ],
      WINDOW_START,
      WINDOW_END
    );
    expect(result.cbOpenCount).toBe(2);
    expect(result.cbOpenDurationMinutes).toBe(20);
  });

  it("availability is always in [0, 100]", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            offsetMinutes: fc.integer({ min: 0, max: 60 }),
            state: fc.constantFrom(BreakerState.CLOSED, BreakerState.OPEN, BreakerState.HALF_OPEN)
          }),
          { maxLength: 20 }
        ),
        (entries) => {
          const transitions = entries
            .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
            .map((e) =>
              makeTransition(
                new Date(WINDOW_START.getTime() + e.offsetMinutes * 60_000),
                e.state
              )
            );
          const result = calculateCbMetrics(transitions, WINDOW_START, WINDOW_END);
          expect(result.cbAvailabilityPct).toBeGreaterThanOrEqual(0);
          expect(result.cbAvailabilityPct).toBeLessThanOrEqual(100);
          expect(result.cbOpenDurationMinutes).toBeGreaterThanOrEqual(0);
          expect(result.cbOpenCount).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });
});
