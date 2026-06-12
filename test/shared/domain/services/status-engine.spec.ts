import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { computeStatus } from "@/shared/domain/services/status-engine.service";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";

const dateArb = fc.date({
  min: new Date("2020-01-01T00:00:00.000Z"),
  max: new Date("2030-12-31T00:00:00.000Z"),
  noInvalidDate: true
});
const timeoutArb = fc.integer({ min: 1, max: 3600 });
const errorCountArb = fc.option(fc.integer({ min: 0, max: 1000 }), { nil: null });

describe("computeStatus", () => {
  it("is deterministic — same inputs produce same output", () => {
    fc.assert(
      fc.property(
        fc.option(dateArb, { nil: null }),
        dateArb,
        timeoutArb,
        errorCountArb,
        (lastHeartbeatAt, now, timeoutSeconds, errorCount) => {
          const a = computeStatus({ lastHeartbeatAt, now, timeoutSeconds, errorCount });
          const b = computeStatus({ lastHeartbeatAt, now, timeoutSeconds, errorCount });
          expect(a).toBe(b);
        }
      )
    );
  });

  it("returns UNKNOWN when lastHeartbeatAt is null (any other input)", () => {
    fc.assert(
      fc.property(
        dateArb,
        timeoutArb,
        errorCountArb,
        (now, timeoutSeconds, errorCount) => {
          const result = computeStatus({
            lastHeartbeatAt: null,
            now,
            timeoutSeconds,
            errorCount
          });
          expect(result).toBe(AgentStatus.UNKNOWN);
        }
      )
    );
  });

  it("never returns UNKNOWN when lastHeartbeatAt is set", () => {
    fc.assert(
      fc.property(
        dateArb,
        dateArb,
        timeoutArb,
        errorCountArb,
        (lastHeartbeatAt, now, timeoutSeconds, errorCount) => {
          const result = computeStatus({
            lastHeartbeatAt,
            now,
            timeoutSeconds,
            errorCount
          });
          expect(result).not.toBe(AgentStatus.UNKNOWN);
        }
      )
    );
  });

  it("returns UNHEALTHY when age > timeout (regardless of errorCount)", () => {
    fc.assert(
      fc.property(
        dateArb,
        timeoutArb,
        errorCountArb,
        (lastHeartbeatAt, timeoutSeconds, errorCount) => {
          const now = new Date(lastHeartbeatAt.getTime() + (timeoutSeconds + 1) * 1000);
          const result = computeStatus({
            lastHeartbeatAt,
            now,
            timeoutSeconds,
            errorCount
          });
          expect(result).toBe(AgentStatus.UNHEALTHY);
        }
      )
    );
  });

  it("returns DEGRADED when within timeout and errorCount > 0", () => {
    fc.assert(
      fc.property(
        dateArb,
        timeoutArb,
        fc.integer({ min: 1, max: 1000 }),
        (lastHeartbeatAt, timeoutSeconds, errorCount) => {
          const now = new Date(lastHeartbeatAt.getTime() + (timeoutSeconds - 1) * 1000);
          const result = computeStatus({
            lastHeartbeatAt,
            now,
            timeoutSeconds,
            errorCount
          });
          expect(result).toBe(AgentStatus.DEGRADED);
        }
      )
    );
  });

  it("returns HEALTHY when within timeout and errorCount is null", () => {
    fc.assert(
      fc.property(
        dateArb,
        timeoutArb,
        (lastHeartbeatAt, timeoutSeconds) => {
          const now = new Date(lastHeartbeatAt.getTime() + (timeoutSeconds - 1) * 1000);
          const result = computeStatus({
            lastHeartbeatAt,
            now,
            timeoutSeconds,
            errorCount: null
          });
          expect(result).toBe(AgentStatus.HEALTHY);
        }
      )
    );
  });

  it("returns HEALTHY when within timeout and errorCount is 0", () => {
    fc.assert(
      fc.property(
        dateArb,
        timeoutArb,
        (lastHeartbeatAt, timeoutSeconds) => {
          const now = new Date(lastHeartbeatAt.getTime() + (timeoutSeconds - 1) * 1000);
          const result = computeStatus({
            lastHeartbeatAt,
            now,
            timeoutSeconds,
            errorCount: 0
          });
          expect(result).toBe(AgentStatus.HEALTHY);
        }
      )
    );
  });

  it("returns HEALTHY when within timeout and errorCount is undefined", () => {
    fc.assert(
      fc.property(
        dateArb,
        timeoutArb,
        (lastHeartbeatAt, timeoutSeconds) => {
          const now = new Date(lastHeartbeatAt.getTime() + (timeoutSeconds - 1) * 1000);
          const result = computeStatus({ lastHeartbeatAt, now, timeoutSeconds });
          expect(result).toBe(AgentStatus.HEALTHY);
        }
      )
    );
  });
});
