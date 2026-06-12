import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EvaluateSLOUseCase } from "@/modules/slos/application/use-cases/evaluate-slo.use-case";
import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { AgentSnapshot } from "@/shared/domain/value-objects/agent-snapshot.vo";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import {
  BreakerState,
  CircuitBreakerState
} from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { CircuitBreakerTransition } from "@/shared/domain/value-objects/circuit-breaker-transition.vo";
import { SLODefinition, SLOOperator } from "@/shared/domain/value-objects/slo-definition.vo";
import { SLOStatus } from "@/shared/domain/value-objects/slo-evaluation.vo";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import type { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";
import type { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";
import type { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";
import type { ISnapshotRepo } from "@/shared/repositories/interfaces/snapshot-repo.interface";

const SLO_ID = "00000000-0000-4000-8000-000000000080";
const AGENT_ID = "00000000-0000-4000-8000-000000000081";
const SYSTEM_ID = "00000000-0000-4000-8000-000000000082";

function makeSlo(overrides?: Partial<SLODefinition>): SLODefinition {
  return new SLODefinition(
    overrides?.id ?? SLO_ID,
    overrides?.agentId ?? AGENT_ID,
    overrides?.metric ?? "error_rate",
    overrides?.operator ?? SLOOperator.LTE,
    overrides?.threshold ?? 0.05,
    overrides?.windowHours ?? 24,
    overrides?.enabled ?? true,
    overrides?.createdAt ?? new Date()
  );
}

function makeAgent(): Agent {
  return new Agent(
    AGENT_ID,
    SYSTEM_ID,
    "vendas-bot",
    "Vendas Bot",
    "desc",
    "1.0.0",
    "http://vendas.local",
    AgentStatus.HEALTHY,
    new Date(),
    new Date()
  );
}

function makeSnapshot(overrides?: { errorRate?: number; totalTraces?: number }): AgentSnapshot {
  const totalTraces = overrides?.totalTraces ?? 100;
  const errorRate = overrides?.errorRate ?? 0.02;
  return new AgentSnapshot(
    "00000000-0000-4000-8000-000000000090",
    AGENT_ID,
    new Date("2026-06-01T00:00:00Z"),
    new Date("2026-06-02T00:00:00Z"),
    totalTraces,
    Math.floor(errorRate * totalTraces),
    250,
    800,
    1.234,
    new Date()
  );
}

function makeUseCase(opts?: {
  slo?: SLODefinition | null;
  snapshot?: AgentSnapshot | null;
  tracesImpl?: () => Promise<Record<string, unknown>[]>;
  cbStatesImpl?: () => Promise<CircuitBreakerState[]>;
  cbHistoryImpl?: () => Promise<CircuitBreakerTransition[]>;
  auditAppendImpl?: () => Promise<void>;
}) {
  const sloValue = opts && "slo" in opts ? opts.slo : makeSlo();
  const createdEvals: unknown[] = [];

  const sloRepo = {
    getSlo: vi.fn().mockResolvedValue(sloValue),
    createEvaluation: vi.fn().mockImplementation((e) => {
      createdEvals.push(e);
      return Promise.resolve(e);
    })
  } as unknown as ISLORepo;
  const snapshotRepo = {
    getLatestSnapshot: vi.fn().mockResolvedValue(opts?.snapshot ?? null)
  } as unknown as ISnapshotRepo;
  const agentRepo = {
    getAgentById: vi.fn().mockResolvedValue(makeAgent())
  } as unknown as IAgentRepo;
  const langfuse = {
    getTraces: vi.fn(opts?.tracesImpl ?? (() => Promise.resolve([])))
  } as unknown as ILangfuseClient;
  const auditRepo = {
    append: vi.fn(opts?.auditAppendImpl ?? (() => Promise.resolve()))
  } as unknown as IAuditLogRepo;
  const cbRepo = {
    listByAgent: vi.fn(opts?.cbStatesImpl ?? (() => Promise.resolve([]))),
    listHistory: vi.fn(opts?.cbHistoryImpl ?? (() => Promise.resolve([])))
  } as unknown as ICircuitBreakerRepo;

  const config = {
    getOrThrow: vi.fn().mockReturnValue(10) // minTraces = 10
  } as unknown as ConfigService<EnvConfig, true>;

  return {
    useCase: new EvaluateSLOUseCase(
      sloRepo,
      snapshotRepo,
      agentRepo,
      langfuse,
      auditRepo,
      cbRepo,
      config
    ),
    sloRepo,
    snapshotRepo,
    agentRepo,
    langfuse,
    auditRepo,
    cbRepo
  };
}

describe("EvaluateSLOUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws DomainNotFoundError when SLO does not exist", async () => {
    const { useCase } = makeUseCase({ slo: null });
    await expect(useCase.execute(SLO_ID)).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("uses snapshot when available", async () => {
    const { useCase, langfuse, sloRepo } = makeUseCase({
      snapshot: makeSnapshot({ errorRate: 0.01 })
    });
    const result = await useCase.execute(SLO_ID);
    expect(langfuse.getTraces).not.toHaveBeenCalled();
    expect(result.status).toBe(SLOStatus.OK);
    expect(result.measuredValue).toBeCloseTo(0.01, 5);
    expect(sloRepo.createEvaluation).toHaveBeenCalledTimes(1);
  });

  it("returns BREACH when snapshot violates threshold (errorRate > 0.05)", async () => {
    const { useCase, auditRepo } = makeUseCase({
      snapshot: makeSnapshot({ errorRate: 0.1 })
    });
    const result = await useCase.execute(SLO_ID);
    expect(result.status).toBe(SLOStatus.BREACH);
    expect(result.breach).toBe(true);
    expect(auditRepo.append).toHaveBeenCalledTimes(1);
    expect(auditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "slo", action: "slo_breach" })
    );
  });

  it("returns insufficient_data when no snapshot and Langfuse returns empty", async () => {
    const { useCase, auditRepo } = makeUseCase({
      tracesImpl: () => Promise.resolve([])
    });
    const result = await useCase.execute(SLO_ID);
    expect(result.status).toBe(SLOStatus.INSUFFICIENT_DATA);
    expect(result.measuredValue).toBeNull();
    expect(result.breach).toBe(false);
    expect(auditRepo.append).not.toHaveBeenCalled();
  });

  it("returns insufficient_data when traces below minTraces threshold", async () => {
    // Only 5 traces, but minTraces = 10
    const traces = Array.from({ length: 5 }).map((_, i) => ({
      id: `t${i}`,
      metadata: { agent: "vendas-bot" },
      latency: 0.5
    }));
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute(SLO_ID);
    expect(result.status).toBe(SLOStatus.INSUFFICIENT_DATA);
  });

  it("captures langfuseTraceRef from the most recent trace (by timestamp)", async () => {
    // Mix of timestamps, NEWEST is "2026-06-01T09:00:00Z" with id "newest"
    const traces = [
      { id: "oldest", timestamp: "2026-06-01T01:00:00Z", metadata: { agent: "vendas-bot" }, latency: 0.5 },
      { id: "mid",    timestamp: "2026-06-01T05:00:00Z", metadata: { agent: "vendas-bot" }, latency: 0.5 },
      { id: "newest", timestamp: "2026-06-01T09:00:00Z", metadata: { agent: "vendas-bot" }, latency: 0.5 },
      // padding to reach minTraces=10
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `pad${i}`,
        timestamp: `2026-06-01T02:0${i}:00Z`,
        metadata: { agent: "vendas-bot" },
        latency: 0.5
      }))
    ];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute(SLO_ID);
    expect(result.langfuseTraceRef).toBe("newest");
  });

  // ── CB metric evaluation ────────────────────────────────────────────
  it("CB metric: routes to evaluateCbMetric and uses listHistory", async () => {
    const slo = makeSlo({
      metric: "cb_open_duration_minutes",
      operator: SLOOperator.LTE,
      threshold: 10,
      windowHours: 1
    });
    const cbStates = [
      new CircuitBreakerState(AGENT_ID, "llm", BreakerState.CLOSED, 0, null, new Date())
    ];
    const now = new Date();
    const windowStart = new Date(now.getTime() - 3600_000);
    const history = [
      new CircuitBreakerTransition("t1", AGENT_ID, "llm", BreakerState.OPEN, 1, windowStart),
      new CircuitBreakerTransition(
        "t2",
        AGENT_ID,
        "llm",
        BreakerState.CLOSED,
        0,
        new Date(windowStart.getTime() + 30 * 60_000) // 30 min later
      )
    ];
    const { useCase, cbRepo } = makeUseCase({
      slo,
      cbStatesImpl: () => Promise.resolve(cbStates),
      cbHistoryImpl: () => Promise.resolve(history)
    });
    const result = await useCase.execute(SLO_ID);
    expect(cbRepo.listHistory).toHaveBeenCalled();
    // ~30 minutes open → breach (threshold 10)
    expect(result.status).toBe(SLOStatus.BREACH);
  });

  it("CB metric: no CBs registered → insufficient_data", async () => {
    const slo = makeSlo({ metric: "cb_availability_pct", threshold: 99 });
    const { useCase } = makeUseCase({
      slo,
      cbStatesImpl: () => Promise.resolve([])
    });
    const result = await useCase.execute(SLO_ID);
    expect(result.status).toBe(SLOStatus.INSUFFICIENT_DATA);
  });

  it("CB metric with name filter: uses only specified CB", async () => {
    const slo = makeSlo({
      metric: "cb_open_count:llm-provider",
      operator: SLOOperator.LTE,
      threshold: 0,
      windowHours: 1
    });
    const now = new Date();
    const windowStart = new Date(now.getTime() - 3600_000);
    const history = [
      new CircuitBreakerTransition("t1", AGENT_ID, "llm-provider", BreakerState.OPEN, 1, windowStart)
    ];
    const { useCase, cbRepo } = makeUseCase({
      slo,
      cbStatesImpl: () =>
        Promise.resolve([
          new CircuitBreakerState(AGENT_ID, "db", BreakerState.CLOSED, 0, null, new Date()),
          new CircuitBreakerState(AGENT_ID, "llm-provider", BreakerState.OPEN, 1, null, new Date())
        ]),
      cbHistoryImpl: () => Promise.resolve(history)
    });
    await useCase.execute(SLO_ID);
    // Should only be called once (for the filtered CB), not twice
    expect(cbRepo.listHistory).toHaveBeenCalledTimes(1);
    expect(cbRepo.listHistory).toHaveBeenCalledWith(AGENT_ID, "llm-provider", expect.any(Date));
  });

  it("does NOT propagate audit log failure on breach", async () => {
    const { useCase, auditRepo } = makeUseCase({
      snapshot: makeSnapshot({ errorRate: 0.1 }),
      auditAppendImpl: () => Promise.reject(new Error("audit down"))
    });
    const result = await useCase.execute(SLO_ID);
    expect(result.status).toBe(SLOStatus.BREACH);
    // Confirm audit append was actually called (and rejected) — não silenciamos a tentativa
    expect(auditRepo.append).toHaveBeenCalledTimes(1);
  });
});
