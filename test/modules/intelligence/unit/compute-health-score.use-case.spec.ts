import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ComputeHealthScoreUseCase } from "@/modules/intelligence/application/use-cases/compute-health-score.use-case";
import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import {
  BreakerState,
  CircuitBreakerState
} from "@/shared/domain/entities/circuit-breaker-state.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import { HealthClassification } from "@/shared/domain/value-objects/health-score.vo";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import type { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";
import type { IHealthScoreRepo } from "@/shared/repositories/interfaces/health-score-repo.interface";

const AGENT_ID = "00000000-0000-4000-8000-000000000050";
const SLUG = "vendas-bot";
const LATENCY_THRESHOLD_MS = 8000;
const HEARTBEAT_TIMEOUT_S = 120;

function makeAgent(lastHeartbeatAt: Date | null = new Date()) {
  return new Agent(
    AGENT_ID,
    "00000000-0000-4000-8000-000000000051",
    SLUG,
    "Vendas Bot",
    "desc",
    "1.0.0",
    "http://vendas.local",
    AgentStatus.HEALTHY,
    lastHeartbeatAt,
    new Date("2026-01-01T00:00:00Z")
  );
}

function makeUseCase(opts?: {
  agent?: Agent | null;
  getTracesImpl?: () => Promise<Record<string, unknown>[]>;
  listByAgentImpl?: () => Promise<CircuitBreakerState[]>;
  healthCreateImpl?: () => Promise<unknown>;
}) {
  const agentValue = opts && "agent" in opts ? opts.agent : makeAgent();
  const agentRepo = {
    getAgentBySlug: vi.fn().mockResolvedValue(agentValue)
  } as unknown as IAgentRepo;
  const langfuse = {
    getTraces: vi.fn(opts?.getTracesImpl ?? (() => Promise.resolve([])))
  } as unknown as ILangfuseClient;
  const cbRepo = {
    listByAgent: vi.fn(opts?.listByAgentImpl ?? (() => Promise.resolve([])))
  } as unknown as ICircuitBreakerRepo;
  const healthRepo = {
    createHealthScore: vi.fn(
      opts?.healthCreateImpl ?? ((record: unknown) => Promise.resolve(record))
    )
  } as unknown as IHealthScoreRepo;

  const config = {
    getOrThrow: vi.fn().mockImplementation((key: string) => {
      if (key === "conversationSlowThresholdMs") return LATENCY_THRESHOLD_MS;
      if (key === "heartbeatTimeoutSeconds") return HEARTBEAT_TIMEOUT_S;
      throw new Error(`unexpected key ${key}`);
    })
  } as unknown as ConfigService<EnvConfig, true>;

  return {
    useCase: new ComputeHealthScoreUseCase(agentRepo, langfuse, healthRepo, cbRepo, config),
    agentRepo,
    langfuse,
    cbRepo,
    healthRepo
  };
}

describe("ComputeHealthScoreUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws DomainNotFoundError when agent does not exist", async () => {
    const { useCase } = makeUseCase({ agent: null });
    await expect(useCase.execute(SLUG)).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("returns HEALTHY with score 100 when agent is fresh and has no traces", async () => {
    const { useCase } = makeUseCase({ agent: makeAgent(new Date()) });
    const result = await useCase.execute(SLUG);
    expect(result.score).toBe(100);
    expect(result.classification).toBe(HealthClassification.HEALTHY);
  });

  it("filters traces by agent slug via extract_hierarchy", async () => {
    const traces = [
      { metadata: { agent: SLUG }, latency: 1.0 },
      { metadata: { agent: "other-bot" }, latency: 10.0 },
      { metadata: { agent: SLUG }, latency: 2.0 }
    ];
    const { useCase } = makeUseCase({
      getTracesImpl: () => Promise.resolve(traces)
    });
    const result = await useCase.execute(SLUG);
    // 2 traces of vendas-bot averaging 1500ms → small penalty but still HEALTHY
    expect(result.avgLatencyMs).toBe(1500);
  });

  it("treats agent with null lastHeartbeatAt as full heartbeat penalty", async () => {
    const { useCase } = makeUseCase({ agent: makeAgent(null) });
    const result = await useCase.execute(SLUG);
    expect(result.heartbeatAgeS).toBe(HEARTBEAT_TIMEOUT_S);
    // 100 - 20 (full heartbeat penalty) = 80
    expect(result.score).toBeLessThanOrEqual(80);
  });

  it("counts CB open and half-open separately", async () => {
    const cbs = [
      new CircuitBreakerState(AGENT_ID, "llm", BreakerState.OPEN, 5, null, new Date()),
      new CircuitBreakerState(AGENT_ID, "db", BreakerState.HALF_OPEN, 2, null, new Date()),
      new CircuitBreakerState(AGENT_ID, "cache", BreakerState.CLOSED, 0, null, new Date())
    ];
    const { useCase } = makeUseCase({
      listByAgentImpl: () => Promise.resolve(cbs)
    });
    const result = await useCase.execute(SLUG);
    expect(result.cbOpenCount).toBe(1);
    expect(result.cbHalfOpenCount).toBe(1);
    expect(result.classification).not.toBe(HealthClassification.HEALTHY);
  });

  it("persists health score record after computing", async () => {
    const { useCase, healthRepo } = makeUseCase();
    await useCase.execute(SLUG);
    expect(healthRepo.createHealthScore).toHaveBeenCalledTimes(1);
    expect(healthRepo.createHealthScore).toHaveBeenCalledWith(
      expect.objectContaining({ agentId: AGENT_ID })
    );
  });

  it("does NOT throw when Langfuse fails (uses empty trace list)", async () => {
    const { useCase } = makeUseCase({
      getTracesImpl: () => Promise.reject(new Error("langfuse down"))
    });
    const result = await useCase.execute(SLUG);
    expect(result.avgLatencyMs).toBe(0);
  });

  it("does NOT throw when CB repo fails (uses zero counts)", async () => {
    const { useCase } = makeUseCase({
      listByAgentImpl: () => Promise.reject(new Error("db down"))
    });
    const result = await useCase.execute(SLUG);
    expect(result.cbOpenCount).toBe(0);
    expect(result.cbHalfOpenCount).toBe(0);
  });

  it("propagates error when health score persistence fails (espelha legado)", async () => {
    const { useCase } = makeUseCase({
      healthCreateImpl: () => Promise.reject(new Error("write failed"))
    });
    await expect(useCase.execute(SLUG)).rejects.toThrow("write failed");
  });
});
