import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { extractHierarchy } from "@/shared/domain/services/extract-hierarchy.service";

describe("extractHierarchy", () => {
  it("returns empty defaults when trace has no metadata and no ids", () => {
    const result = extractHierarchy({});
    expect(result.tenantId).toBe("");
    expect(result.system).toBe("default");
    expect(result.agent).toBe("");
    expect(result.userId).toBe("");
    expect(result.sessionId).toBe("");
  });

  it("uses metadata fields when present", () => {
    const result = extractHierarchy({
      metadata: { tenant_id: "acme", system: "billing", agent: "vendas-bot" },
      userId: "user-1",
      sessionId: "sess-1"
    });
    expect(result.tenantId).toBe("acme");
    expect(result.system).toBe("billing");
    expect(result.agent).toBe("vendas-bot");
    expect(result.userId).toBe("user-1");
    expect(result.sessionId).toBe("sess-1");
  });

  it("falls back to 'default' when system is empty string", () => {
    const result = extractHierarchy({ metadata: { system: "" } });
    expect(result.system).toBe("default");
  });

  it("never throws on arbitrary inputs", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.anything()), (trace) => {
        expect(() => extractHierarchy(trace)).not.toThrow();
      })
    );
  });

  it("never returns null/undefined for any field", () => {
    fc.assert(
      fc.property(fc.dictionary(fc.string(), fc.anything()), (trace) => {
        const result = extractHierarchy(trace);
        expect(result.tenantId).not.toBeNull();
        expect(result.tenantId).not.toBeUndefined();
        expect(result.system).not.toBeNull();
        expect(result.system).not.toBeUndefined();
        expect(result.agent).not.toBeNull();
        expect(result.agent).not.toBeUndefined();
        expect(result.userId).not.toBeNull();
        expect(result.userId).not.toBeUndefined();
        expect(result.sessionId).not.toBeNull();
        expect(result.sessionId).not.toBeUndefined();
      })
    );
  });
});
