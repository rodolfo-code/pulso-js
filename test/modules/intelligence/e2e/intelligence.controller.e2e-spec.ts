import type { INestApplication } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ComputeHealthScoreUseCase } from "@/modules/intelligence/application/use-cases/compute-health-score.use-case";
import { IntelligenceController } from "@/modules/intelligence/presentation/controllers/intelligence.controller";
import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import { DomainExceptionFilter } from "@/shared/http/filters/domain-exception.filter";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import type { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";
import type { IHealthScoreRepo } from "@/shared/repositories/interfaces/health-score-repo.interface";

const SLUG = "vendas-bot";
const AGENT_ID = "00000000-0000-4000-8000-000000000060";
const SYSTEM_ID = "00000000-0000-4000-8000-000000000061";

function makeAgent(overrides?: { slug?: string; lastHeartbeatAt?: Date | null }): Agent {
  return new Agent(
    AGENT_ID,
    SYSTEM_ID,
    overrides?.slug ?? SLUG,
    "Vendas Bot",
    "desc",
    "1.0.0",
    "http://vendas.local",
    AgentStatus.HEALTHY,
    overrides?.lastHeartbeatAt ?? new Date(),
    new Date("2026-01-01T00:00:00Z")
  );
}

describe("IntelligenceController (e2e)", () => {
  let app: INestApplication | undefined;
  let fakeAgentRepo: {
    getAgentBySlug: ReturnType<typeof vi.fn>;
    listAgents: ReturnType<typeof vi.fn>;
  };
  let fakeLangfuse: { getTraces: ReturnType<typeof vi.fn> };
  let fakeCbRepo: { listByAgent: ReturnType<typeof vi.fn> };
  let fakeHealthRepo: { createHealthScore: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    fakeAgentRepo = {
      getAgentBySlug: vi.fn(),
      listAgents: vi.fn()
    };
    fakeLangfuse = { getTraces: vi.fn().mockResolvedValue([]) };
    fakeCbRepo = { listByAgent: vi.fn().mockResolvedValue([]) };
    fakeHealthRepo = { createHealthScore: vi.fn().mockResolvedValue(undefined) };

    const fakeConfig: ConfigService<EnvConfig, true> = {
      getOrThrow: vi.fn().mockImplementation((key: string) => {
        if (key === "conversationSlowThresholdMs") return 8000;
        if (key === "heartbeatTimeoutSeconds") return 120;
        throw new Error(`unexpected key ${key}`);
      })
    } as unknown as ConfigService<EnvConfig, true>;

    const useCase = new ComputeHealthScoreUseCase(
      fakeAgentRepo as unknown as IAgentRepo,
      fakeLangfuse as unknown as ILangfuseClient,
      fakeHealthRepo as unknown as IHealthScoreRepo,
      fakeCbRepo as unknown as ICircuitBreakerRepo,
      fakeConfig
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [IntelligenceController],
      providers: [
        { provide: ComputeHealthScoreUseCase, useValue: useCase },
        { provide: IAgentRepo, useValue: fakeAgentRepo }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    fakeAgentRepo.getAgentBySlug.mockReset().mockResolvedValue(null);
    fakeAgentRepo.listAgents.mockReset().mockResolvedValue([]);
    fakeLangfuse.getTraces.mockReset().mockResolvedValue([]);
    fakeCbRepo.listByAgent.mockReset().mockResolvedValue([]);
    fakeHealthRepo.createHealthScore.mockReset().mockResolvedValue(undefined);
  });

  // ── GET /intelligence/agents/:slug/health-score ─────────────────────
  it("GET /intelligence/agents/:slug/health-score → 200 with shape", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent());

    const res = await request(app!.getHttpServer()).get(
      `/intelligence/agents/${SLUG}/health-score`
    );

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      agentSlug: SLUG,
      score: 100,
      classification: "healthy",
      errorRate: 0,
      avgLatencyMs: 0,
      cbOpenCount: 0,
      cbHalfOpenCount: 0
    });
    expect(res.body.calculatedAt).toBeTruthy();
  });

  it("GET /intelligence/agents/:slug/health-score → 404 when agent not found", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(null);

    const res = await request(app!.getHttpServer()).get(
      "/intelligence/agents/none/health-score"
    );

    expect(res.status).toBe(404);
  });

  // ── GET /intelligence/agents ────────────────────────────────────────
  it("GET /intelligence/agents → returns agents with health scores", async () => {
    const a1 = makeAgent({ slug: "a1" });
    const a2 = makeAgent({ slug: "a2" });
    fakeAgentRepo.listAgents.mockResolvedValueOnce([a1, a2]);
    fakeAgentRepo.getAgentBySlug.mockImplementation((slug: string) =>
      Promise.resolve(slug === "a1" ? a1 : a2)
    );

    const res = await request(app!.getHttpServer()).get("/intelligence/agents");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].agent.slug).toBe("a1");
    expect(res.body[0].healthScore).toMatchObject({ agentSlug: "a1", score: 100 });
    expect(res.body[1].agent.slug).toBe("a2");
    expect(res.body[1].healthScore).toMatchObject({ agentSlug: "a2", score: 100 });
  });

  it("GET /intelligence/agents → healthScore is null when use case fails for one agent", async () => {
    const a1 = makeAgent({ slug: "a1" });
    const a2 = makeAgent({ slug: "a2" });
    fakeAgentRepo.listAgents.mockResolvedValueOnce([a1, a2]);
    fakeAgentRepo.getAgentBySlug.mockImplementation((slug: string) => {
      if (slug === "a1") return Promise.resolve(a1);
      if (slug === "a2") return Promise.resolve(a2);
      return Promise.resolve(null);
    });
    // Make use case fail for a2 by making the langfuse client succeed but health persistence fail
    let call = 0;
    fakeHealthRepo.createHealthScore.mockImplementation(() => {
      call++;
      if (call === 2) return Promise.reject(new Error("write failed for a2"));
      return Promise.resolve(undefined);
    });

    const res = await request(app!.getHttpServer()).get("/intelligence/agents");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].healthScore).not.toBeNull();
    expect(res.body[1].healthScore).toBeNull();
  });

  it("GET /intelligence/agents → returns empty array when no agents", async () => {
    fakeAgentRepo.listAgents.mockResolvedValueOnce([]);
    const res = await request(app!.getHttpServer()).get("/intelligence/agents");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
