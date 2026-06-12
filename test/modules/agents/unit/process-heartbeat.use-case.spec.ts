import type { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessHeartbeatUseCase } from "@/modules/agents/application/use-cases/process-heartbeat.use-case";
import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import { BreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import type { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";
import type { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

const AGENT_ID = "00000000-0000-4000-8000-000000000010";
const SYSTEM_ID = "00000000-0000-4000-8000-000000000011";
const TIMEOUT_SECONDS = 120;

function makeAgent() {
  return new Agent(
    AGENT_ID,
    SYSTEM_ID,
    "vendas-bot",
    "Vendas Bot",
    "desc",
    "1.0.0",
    "http://vendas.local",
    AgentStatus.UNKNOWN,
    null,
    new Date("2026-01-01T00:00:00Z")
  );
}

function makeUseCase(opts?: {
  agent?: Agent | null;
  cbUpsertImpl?: () => Promise<void>;
}) {
  const agentValue = opts && "agent" in opts ? opts.agent : makeAgent();
  const agentRepo = {
    getAgentBySlug: vi.fn().mockResolvedValue(agentValue),
    updateAgent: vi.fn().mockImplementation((a: Agent) => Promise.resolve(a))
  } as unknown as IAgentRepo;
  const auditRepo = {
    append: vi.fn().mockResolvedValue(undefined)
  } as unknown as IAuditLogRepo;
  const cbRepo = {
    upsertMany: vi.fn(opts?.cbUpsertImpl ?? (() => Promise.resolve())),
    appendTransitions: vi.fn().mockResolvedValue(undefined),
    listByAgent: vi.fn().mockResolvedValue([])
  } as unknown as ICircuitBreakerRepo;
  const config = {
    getOrThrow: vi.fn().mockReturnValue(TIMEOUT_SECONDS)
  } as unknown as ConfigService<EnvConfig, true>;

  return {
    useCase: new ProcessHeartbeatUseCase(agentRepo, auditRepo, cbRepo, config),
    agentRepo,
    auditRepo,
    cbRepo
  };
}

describe("ProcessHeartbeatUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws DomainNotFoundError when agent does not exist", async () => {
    const { useCase } = makeUseCase({ agent: null });
    await expect(useCase.execute("nonexistent", {})).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("updates lastHeartbeatAt to now", async () => {
    const { useCase, agentRepo } = makeUseCase();
    await useCase.execute("vendas-bot", {});
    expect(agentRepo.updateAgent).toHaveBeenCalledTimes(1);
    expect(agentRepo.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ lastHeartbeatAt: expect.any(Date) })
    );
  });

  it("updates version when provided", async () => {
    const { useCase, agentRepo } = makeUseCase();
    await useCase.execute("vendas-bot", { version: "2.0.0" });
    expect(agentRepo.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ version: "2.0.0" })
    );
  });

  it("recomputes status as HEALTHY when no errorCount", async () => {
    const { useCase, agentRepo } = makeUseCase();
    await useCase.execute("vendas-bot", {});
    expect(agentRepo.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ status: AgentStatus.HEALTHY })
    );
  });

  it("recomputes status as DEGRADED when errorCount > 0", async () => {
    const { useCase, agentRepo } = makeUseCase();
    await useCase.execute("vendas-bot", { errorCount: 3 });
    expect(agentRepo.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ status: AgentStatus.DEGRADED })
    );
  });

  it("upserts circuit breaker states with agentId stamped", async () => {
    const { useCase, cbRepo } = makeUseCase();
    await useCase.execute("vendas-bot", {
      circuitBreakers: [
        { name: "llm-provider", state: BreakerState.OPEN, failCount: 5, lastStateChange: null }
      ]
    });
    expect(cbRepo.upsertMany).toHaveBeenCalledTimes(1);
    expect(cbRepo.upsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        agentId: AGENT_ID,
        name: "llm-provider",
        state: BreakerState.OPEN,
        failCount: 5
      })
    ]);
  });

  it("appends transitions when circuit breakers are provided", async () => {
    const { useCase, cbRepo } = makeUseCase();
    await useCase.execute("vendas-bot", {
      circuitBreakers: [
        { name: "db", state: BreakerState.CLOSED, failCount: 0, lastStateChange: null }
      ]
    });
    expect(cbRepo.appendTransitions).toHaveBeenCalledTimes(1);
    expect(cbRepo.appendTransitions).toHaveBeenCalledWith([
      expect.objectContaining({
        agentId: AGENT_ID,
        cbName: "db",
        state: BreakerState.CLOSED
      })
    ]);
  });

  it("does NOT call cbRepo when no circuit breakers provided", async () => {
    const { useCase, cbRepo } = makeUseCase();
    await useCase.execute("vendas-bot", {});
    expect(cbRepo.upsertMany).not.toHaveBeenCalled();
    expect(cbRepo.appendTransitions).not.toHaveBeenCalled();
  });

  it("does NOT propagate CB failure (best-effort)", async () => {
    const { useCase } = makeUseCase({
      cbUpsertImpl: () => Promise.reject(new Error("cb down"))
    });
    await expect(
      useCase.execute("vendas-bot", {
        circuitBreakers: [
          { name: "x", state: BreakerState.OPEN, failCount: 1, lastStateChange: null }
        ]
      })
    ).resolves.toBeInstanceOf(Agent);
  });

  it("writes audit log with action=heartbeat", async () => {
    const { useCase, auditRepo } = makeUseCase();
    await useCase.execute("vendas-bot", {});
    expect(auditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "agent", action: "heartbeat" })
    );
  });
});
