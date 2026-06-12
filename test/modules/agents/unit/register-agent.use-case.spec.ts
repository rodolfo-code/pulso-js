import { beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterAgentUseCase } from "@/modules/agents/application/use-cases/register-agent.use-case";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { System } from "@/shared/domain/entities/system.entity";
import { Tenant } from "@/shared/domain/entities/tenant.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import type { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

const TENANT_ID = "00000000-0000-4000-8000-000000000001";
const SYSTEM_ID = "00000000-0000-4000-8000-000000000002";
const AGENT_ID = "00000000-0000-4000-8000-000000000003";

function makeTenant() {
  return new Tenant(TENANT_ID, "acme", "acme", "default", new Date());
}
function makeSystem() {
  return new System(SYSTEM_ID, TENANT_ID, "billing", "billing", new Date());
}
function makeAgent() {
  return new Agent(
    AGENT_ID,
    SYSTEM_ID,
    "vendas-bot",
    "Vendas Bot",
    "old desc",
    "1.0.0",
    "http://old.local",
    AgentStatus.UNKNOWN,
    null,
    new Date()
  );
}

function makeUseCase(repo: Partial<IAgentRepo>, audit?: Partial<IAuditLogRepo>) {
  const agentRepo = {
    getTenantBySlug: vi.fn().mockResolvedValue(null),
    createTenant: vi.fn().mockImplementation((t: Tenant) => Promise.resolve(t)),
    getSystem: vi.fn().mockResolvedValue(null),
    createSystem: vi.fn().mockImplementation((s: System) => Promise.resolve(s)),
    getAgentBySlug: vi.fn().mockResolvedValue(null),
    createAgent: vi.fn().mockImplementation((a: Agent) => Promise.resolve(a)),
    updateAgent: vi.fn().mockImplementation((a: Agent) => Promise.resolve(a)),
    ...repo
  } as unknown as IAgentRepo;
  const auditRepo = {
    append: vi.fn().mockResolvedValue(undefined),
    ...audit
  } as unknown as IAuditLogRepo;
  return {
    useCase: new RegisterAgentUseCase(agentRepo, auditRepo),
    agentRepo,
    auditRepo
  };
}

const DEFAULT_REQUEST = {
  slug: "vendas-bot",
  name: "Vendas Bot",
  description: "Agente de vendas",
  version: "1.0.0",
  baseUrl: "http://vendas.local",
  tenantSlug: "acme",
  systemSlug: "billing"
};

describe("RegisterAgentUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates tenant, system and agent when none exists", async () => {
    const { useCase, agentRepo } = makeUseCase({});
    await useCase.execute(DEFAULT_REQUEST);
    expect(agentRepo.createTenant).toHaveBeenCalledTimes(1);
    expect(agentRepo.createSystem).toHaveBeenCalledTimes(1);
    expect(agentRepo.createAgent).toHaveBeenCalledTimes(1);
    expect(agentRepo.updateAgent).not.toHaveBeenCalled();
  });

  it("reuses tenant when it already exists", async () => {
    const { useCase, agentRepo } = makeUseCase({
      getTenantBySlug: vi.fn().mockResolvedValue(makeTenant())
    });
    await useCase.execute(DEFAULT_REQUEST);
    expect(agentRepo.createTenant).not.toHaveBeenCalled();
    expect(agentRepo.createSystem).toHaveBeenCalledTimes(1);
    expect(agentRepo.createAgent).toHaveBeenCalledTimes(1);
  });

  it("reuses tenant and system when they already exist", async () => {
    const { useCase, agentRepo } = makeUseCase({
      getTenantBySlug: vi.fn().mockResolvedValue(makeTenant()),
      getSystem: vi.fn().mockResolvedValue(makeSystem())
    });
    await useCase.execute(DEFAULT_REQUEST);
    expect(agentRepo.createTenant).not.toHaveBeenCalled();
    expect(agentRepo.createSystem).not.toHaveBeenCalled();
    expect(agentRepo.createAgent).toHaveBeenCalledTimes(1);
  });

  it("updates agent when it already exists (re-register)", async () => {
    const existing = makeAgent();
    const { useCase, agentRepo } = makeUseCase({
      getTenantBySlug: vi.fn().mockResolvedValue(makeTenant()),
      getSystem: vi.fn().mockResolvedValue(makeSystem()),
      getAgentBySlug: vi.fn().mockResolvedValue(existing)
    });
    await useCase.execute({ ...DEFAULT_REQUEST, version: "2.0.0", baseUrl: "http://new.local" });
    expect(agentRepo.createAgent).not.toHaveBeenCalled();
    expect(agentRepo.updateAgent).toHaveBeenCalledTimes(1);
    expect(agentRepo.updateAgent).toHaveBeenCalledWith(
      expect.objectContaining({ id: AGENT_ID, version: "2.0.0", baseUrl: "http://new.local" })
    );
  });

  it("writes audit log with action=agent_registered on first registration", async () => {
    const { useCase, auditRepo } = makeUseCase({});
    await useCase.execute(DEFAULT_REQUEST);
    expect(auditRepo.append).toHaveBeenCalledTimes(1);
    expect(auditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "agent", action: "agent_registered" })
    );
  });

  it("writes audit log with action=agent_re_registered when agent already existed", async () => {
    const { useCase, auditRepo } = makeUseCase({
      getTenantBySlug: vi.fn().mockResolvedValue(makeTenant()),
      getSystem: vi.fn().mockResolvedValue(makeSystem()),
      getAgentBySlug: vi.fn().mockResolvedValue(makeAgent())
    });
    await useCase.execute(DEFAULT_REQUEST);
    expect(auditRepo.append).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "agent", action: "agent_re_registered" })
    );
  });

  it("does NOT propagate audit log failure", async () => {
    const { useCase } = makeUseCase(
      {},
      { append: vi.fn().mockRejectedValue(new Error("db down")) }
    );
    await expect(useCase.execute(DEFAULT_REQUEST)).resolves.toBeInstanceOf(Agent);
  });
});
