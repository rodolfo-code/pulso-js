import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateSLOUseCase } from "@/modules/slos/application/use-cases/create-slo.use-case";
import {
  type SLODefinition,
  SLOOperator
} from "@/shared/domain/value-objects/slo-definition.vo";
import type { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";

const AGENT_ID = "00000000-0000-4000-8000-000000000070";

function makeUseCase() {
  const createSlo = vi.fn<(slo: SLODefinition) => Promise<SLODefinition>>(
    (slo) => Promise.resolve(slo)
  );
  const sloRepo = { createSlo } as unknown as ISLORepo;
  return { useCase: new CreateSLOUseCase(sloRepo), createSlo };
}

describe("CreateSLOUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists SLO with all provided fields", async () => {
    const { useCase, createSlo } = makeUseCase();
    const result = await useCase.execute({
      agentId: AGENT_ID,
      metric: "error_rate",
      operator: SLOOperator.LTE,
      threshold: 0.05,
      windowHours: 24,
      enabled: true
    });
    expect(createSlo).toHaveBeenCalledTimes(1);
    expect(result.agentId).toBe(AGENT_ID);
    expect(result.metric).toBe("error_rate");
    expect(result.operator).toBe(SLOOperator.LTE);
    expect(result.threshold).toBe(0.05);
    expect(result.windowHours).toBe(24);
    expect(result.enabled).toBe(true);
  });

  it("defaults enabled to true when not provided", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({
      agentId: AGENT_ID,
      metric: "p95_latency_ms",
      operator: SLOOperator.LTE,
      threshold: 500,
      windowHours: 24
    });
    expect(result.enabled).toBe(true);
  });

  it("generates id and createdAt", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute({
      agentId: AGENT_ID,
      metric: "error_rate",
      operator: SLOOperator.LTE,
      threshold: 0.05,
      windowHours: 24
    });
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});
