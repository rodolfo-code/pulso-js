import { describe, expect, it } from "vitest";

import { HealthCheckResult } from "@/modules/health/domain/value-objects/health-check-result.vo";

describe("HealthCheckResult", () => {
  const timestamp = "2026-06-07T00:00:00.000Z";

  it("isUnavailable returns true when status is unavailable", () => {
    const result = new HealthCheckResult("unavailable", "unavailable", "ok", timestamp);
    expect(result.isUnavailable()).toBe(true);
  });

  it("isUnavailable returns false when status is ok", () => {
    const result = new HealthCheckResult("ok", "ok", "ok", timestamp);
    expect(result.isUnavailable()).toBe(false);
  });

  it("isUnavailable returns false when status is degraded", () => {
    const result = new HealthCheckResult("degraded", "ok", "unavailable", timestamp);
    expect(result.isUnavailable()).toBe(false);
  });

  it("exposes all fields as readonly", () => {
    const result = new HealthCheckResult("ok", "ok", "ok", timestamp);
    expect(result.status).toBe("ok");
    expect(result.postgresql).toBe("ok");
    expect(result.langfuse).toBe("ok");
    expect(result.timestamp).toBe(timestamp);
  });
});