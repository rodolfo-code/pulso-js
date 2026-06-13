import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GetClientOverviewUseCase } from "@/modules/observations/application/use-cases/get-client-overview.use-case";
import { GetConversationDetailUseCase } from "@/modules/observations/application/use-cases/get-conversation-detail.use-case";
import { GetConversationListUseCase } from "@/modules/observations/application/use-cases/get-conversation-list.use-case";
import { ObservationsController } from "@/modules/observations/presentation/controllers/observations.controller";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import { DomainExceptionFilter } from "@/shared/http/filters/domain-exception.filter";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

const SESSION_ID = "sess-abc-123";

function makeAgent(): Agent {
  return new Agent(
    "00000000-0000-4000-8000-000000000110",
    "00000000-0000-4000-8000-000000000111",
    "vendas-bot",
    "Vendas Bot",
    "desc",
    "1.0.0",
    "http://x",
    AgentStatus.HEALTHY,
    new Date(),
    new Date()
  );
}

describe("ObservationsController (e2e)", () => {
  let app: INestApplication | undefined;
  let fakeAgentRepo: { listAgents: ReturnType<typeof vi.fn> };
  let fakeLangfuse: {
    getTraces: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    getSessions: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    fakeAgentRepo = { listAgents: vi.fn().mockResolvedValue([]) };
    fakeLangfuse = {
      getTraces: vi.fn().mockResolvedValue([]),
      getSession: vi.fn().mockResolvedValue({ id: SESSION_ID }),
      getSessions: vi.fn().mockResolvedValue([])
    };

    const clientOverview = new GetClientOverviewUseCase(
      fakeAgentRepo as unknown as IAgentRepo,
      fakeLangfuse as unknown as ILangfuseClient
    );
    const conversationDetail = new GetConversationDetailUseCase(
      fakeLangfuse as unknown as ILangfuseClient
    );
    const conversationList = new GetConversationListUseCase(
      fakeLangfuse as unknown as ILangfuseClient
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ObservationsController],
      providers: [
        { provide: GetClientOverviewUseCase, useValue: clientOverview },
        { provide: GetConversationDetailUseCase, useValue: conversationDetail },
        { provide: GetConversationListUseCase, useValue: conversationList }
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
    fakeAgentRepo.listAgents.mockReset().mockResolvedValue([]);
    fakeLangfuse.getTraces.mockReset().mockResolvedValue([]);
    fakeLangfuse.getSession.mockReset().mockResolvedValue({ id: SESSION_ID });
    fakeLangfuse.getSessions.mockReset().mockResolvedValue([]);
  });

  // ── GET /observations/clients ───────────────────────────────────────
  it("GET /observations/clients → returns grouped clients", async () => {
    fakeAgentRepo.listAgents.mockResolvedValueOnce([makeAgent()]);
    fakeLangfuse.getTraces.mockResolvedValueOnce([
      { id: "t1", userId: "u1", metadata: { agent: "vendas-bot", tenant_id: "acme", system: "billing" } },
      { id: "t2", userId: "u2", metadata: { agent: "vendas-bot", tenant_id: "acme", system: "billing" } }
    ]);

    const res = await request(app!.getHttpServer()).get("/observations/clients");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.map((c: { userId: string }) => c.userId).sort()).toEqual(["u1", "u2"]);
  });

  // ── GET /observations/clients/:clientId ─────────────────────────────
  it("GET /observations/clients/:clientId → returns single client", async () => {
    fakeAgentRepo.listAgents.mockResolvedValueOnce([makeAgent()]);
    fakeLangfuse.getTraces.mockResolvedValueOnce([
      { id: "t1", userId: "u1", metadata: { agent: "vendas-bot", tenant_id: "acme", system: "billing" } }
    ]);

    const res = await request(app!.getHttpServer()).get("/observations/clients/u1");
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe("u1");
    expect(fakeLangfuse.getTraces).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1" }));
  });

  it("GET /observations/clients/:clientId → 404 when no traces match", async () => {
    fakeLangfuse.getTraces.mockResolvedValueOnce([]);
    const res = await request(app!.getHttpServer()).get("/observations/clients/nobody");
    expect(res.status).toBe(404);
  });

  // ── GET /observations/conversations ─────────────────────────────────
  it("GET /observations/conversations → calls getSessions and returns list", async () => {
    fakeLangfuse.getSessions.mockResolvedValueOnce([{ id: "s1" }, { id: "s2" }]);
    const res = await request(app!.getHttpServer()).get("/observations/conversations");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "s1" }, { id: "s2" }]);
    expect(fakeLangfuse.getSessions).toHaveBeenCalledTimes(1);
  });

  // ── GET /observations/conversations/:sessionId ──────────────────────
  it("GET /observations/conversations/:sessionId → returns session + enriched traces", async () => {
    fakeLangfuse.getSession.mockResolvedValueOnce({ id: SESSION_ID, foo: "bar" });
    fakeLangfuse.getTraces.mockResolvedValueOnce([
      { id: "t1", userId: "u1", sessionId: SESSION_ID, metadata: { agent: "vendas-bot" } }
    ]);

    const res = await request(app!.getHttpServer()).get(
      `/observations/conversations/${SESSION_ID}`
    );
    expect(res.status).toBe(200);
    expect(res.body.session).toMatchObject({ id: SESSION_ID, foo: "bar" });
    expect(res.body.traces).toHaveLength(1);
    expect(res.body.traces[0].hierarchy).toMatchObject({ agent: "vendas-bot", userId: "u1" });
  });

  it("GET /observations/conversations/:sessionId → 404 when Langfuse responds 404", async () => {
    fakeLangfuse.getSession.mockRejectedValueOnce(new LangfuseUpstreamError(404, "Not Found"));
    const res = await request(app!.getHttpServer()).get(
      `/observations/conversations/${SESSION_ID}`
    );
    expect(res.status).toBe(404);
  });

  it("GET /observations/conversations/:sessionId → propagates 502 when Langfuse upstream fails", async () => {
    fakeLangfuse.getSession.mockRejectedValueOnce(new LangfuseUpstreamError(502, "Bad Gateway"));
    const res = await request(app!.getHttpServer()).get(
      `/observations/conversations/${SESSION_ID}`
    );
    expect(res.status).toBe(502);
  });

  it("GET /observations/conversations/:sessionId → response does NOT have session.traces (deduped)", async () => {
    fakeLangfuse.getSession.mockResolvedValueOnce({
      id: SESSION_ID,
      projectId: "arius-observatory",
      traces: [{ id: "embedded-1" }, { id: "embedded-2" }]
    });
    fakeLangfuse.getTraces.mockResolvedValueOnce([
      { id: "t1", metadata: { agent: "vendas-bot" } }
    ]);

    const res = await request(app!.getHttpServer()).get(
      `/observations/conversations/${SESSION_ID}`
    );
    expect(res.status).toBe(200);
    expect(res.body.session.traces).toBeUndefined();
    expect(res.body.session.id).toBe(SESSION_ID);
    expect(res.body.traces).toHaveLength(1);
    expect(res.body.traces[0].id).toBe("t1");
  });
});
