import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  buildPromptName,
  buildScoreConfigName
} from "@/shared/domain/services/taxonomy";

const slugArbitrary = fc
  .string({ minLength: 0, maxLength: 32 })
  .filter((s) => !s.includes("/"));

describe("buildPromptName", () => {
  it("returns {tenant}/{system}/{agent}/{name}", () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        slugArbitrary,
        slugArbitrary,
        slugArbitrary,
        (tenant, system, agent, name) => {
          const result = buildPromptName(tenant, system, agent, name);
          expect(result).toBe(`${tenant}/${system}/${agent}/${name}`);
        }
      )
    );
  });

  it("contains exactly 3 separators", () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        slugArbitrary,
        slugArbitrary,
        slugArbitrary,
        (tenant, system, agent, name) => {
          const result = buildPromptName(tenant, system, agent, name);
          const separatorCount = result.split("/").length - 1;
          expect(separatorCount).toBe(3);
        }
      )
    );
  });

  it("preserves slug order: tenant, system, agent, name", () => {
    fc.assert(
      fc.property(
        slugArbitrary,
        slugArbitrary,
        slugArbitrary,
        slugArbitrary,
        (tenant, system, agent, name) => {
          const parts = buildPromptName(tenant, system, agent, name).split("/");
          expect(parts[0]).toBe(tenant);
          expect(parts[1]).toBe(system);
          expect(parts[2]).toBe(agent);
          expect(parts[3]).toBe(name);
        }
      )
    );
  });
});

describe("buildScoreConfigName", () => {
  it("returns {tenant}/{metric}", () => {
    fc.assert(
      fc.property(slugArbitrary, slugArbitrary, (tenant, metric) => {
        const result = buildScoreConfigName(tenant, metric);
        expect(result).toBe(`${tenant}/${metric}`);
      })
    );
  });

  it("contains exactly 1 separator", () => {
    fc.assert(
      fc.property(slugArbitrary, slugArbitrary, (tenant, metric) => {
        const result = buildScoreConfigName(tenant, metric);
        const separatorCount = result.split("/").length - 1;
        expect(separatorCount).toBe(1);
      })
    );
  });

  it("preserves slug order: tenant, metric", () => {
    fc.assert(
      fc.property(slugArbitrary, slugArbitrary, (tenant, metric) => {
        const parts = buildScoreConfigName(tenant, metric).split("/");
        expect(parts[0]).toBe(tenant);
        expect(parts[1]).toBe(metric);
      })
    );
  });
});
