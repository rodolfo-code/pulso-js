import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetClientOverviewUseCase } from "@/modules/observations/application/use-cases/get-client-overview.use-case";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

const AGENT_ID = "00000000-0000-4000-8000-000000000110";
const SYSTEM_ID = "00000000-0000-4000-8000-000000000111";

function makeAgent(slug: string, name: string): Agent {
  return new Agent(
    AGENT_ID,
    SYSTEM_ID,
    slug,
    name,
    "desc",
    "1.0.0",
    "http://x",
    AgentStatus.HEALTHY,
    new Date(),
    new Date()
  );
}

function makeUseCase(opts?: {
  agents?: Agent[];
  tracesImpl?: () => Promise<Record<string, unknown>[]>;
}) {
  const agentRepo = {
    listAgents: vi.fn().mockResolvedValue(opts?.agents ?? [])
  } as unknown as IAgentRepo;
  const langfuse = {
    getTraces: vi.fn(opts?.tracesImpl ?? (() => Promise.resolve([])))
  } as unknown as ILangfuseClient;
  return {
    useCase: new GetClientOverviewUseCase(agentRepo, langfuse),
    agentRepo,
    langfuse
  };
}

describe("GetClientOverviewUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty list when there are no traces", async () => {
    const { useCase } = makeUseCase();
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it("groups traces by userId", async () => {
    const traces = [
      { id: "t1", userId: "u1", metadata: { tenant_id: "acme", system: "billing", agent: "bot" } },
      { id: "t2", userId: "u1", metadata: { tenant_id: "acme", system: "billing", agent: "bot" } },
      { id: "t3", userId: "u2", metadata: { tenant_id: "acme", system: "billing", agent: "bot" } }
    ];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute();
    expect(result).toHaveLength(2);
    const u1 = result.find((c) => c.userId === "u1");
    const u2 = result.find((c) => c.userId === "u2");
    expect(u1?.traceCount).toBe(2);
    expect(u2?.traceCount).toBe(1);
  });

  it("uses '__anonymous__' for traces without userId", async () => {
    const traces = [{ id: "t1", metadata: { agent: "bot" } }];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0]?.userId).toBe("__anonymous__");
  });

  it("enriches with agent identity when slug matches a registered agent", async () => {
    const agent = makeAgent("vendas-bot", "Vendas Bot");
    const traces = [
      { id: "t1", userId: "u1", metadata: { agent: "vendas-bot" } }
    ];
    const { useCase } = makeUseCase({
      agents: [agent],
      tracesImpl: () => Promise.resolve(traces)
    });
    const result = await useCase.execute();
    expect(result[0]?.agent).toMatchObject({
      slug: "vendas-bot",
      name: "Vendas Bot",
      status: AgentStatus.HEALTHY,
      version: "1.0.0"
    });
  });

  it("leaves agent as null when slug is not registered", async () => {
    const traces = [{ id: "t1", userId: "u1", metadata: { agent: "unknown-bot" } }];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute();
    expect(result[0]?.agent).toBeNull();
  });

  it("collects all trace ids per user", async () => {
    const traces = [
      { id: "t1", userId: "u1", metadata: { agent: "bot" } },
      { id: "t2", userId: "u1", metadata: { agent: "bot" } },
      { id: "t3", userId: "u1", metadata: { agent: "bot" } }
    ];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute();
    expect(result[0]?.traceIds).toEqual(["t1", "t2", "t3"]);
  });

  it("passes filters through to langfuse.getTraces", async () => {
    const { useCase, langfuse } = makeUseCase();
    await useCase.execute({ userId: "u1" });
    expect(langfuse.getTraces).toHaveBeenCalledWith({ userId: "u1" });
  });

  it("returns empty list when Langfuse fails (best-effort)", async () => {
    const { useCase } = makeUseCase({
      tracesImpl: () => Promise.reject(new Error("langfuse down"))
    });
    const result = await useCase.execute();
    expect(result).toEqual([]);
  });
});
