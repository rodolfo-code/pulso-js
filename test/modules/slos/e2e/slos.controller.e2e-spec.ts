import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CreateSLOUseCase } from "@/modules/slos/application/use-cases/create-slo.use-case";
import { EvaluateSLOUseCase } from "@/modules/slos/application/use-cases/evaluate-slo.use-case";
import { ListSLOEvaluationsUseCase } from "@/modules/slos/application/use-cases/list-slo-evaluations.use-case";
import { ListSLOsUseCase } from "@/modules/slos/application/use-cases/list-slos.use-case";
import { SLOsController } from "@/modules/slos/presentation/controllers/slos.controller";
import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import { SLODefinition, SLOOperator } from "@/shared/domain/value-objects/slo-definition.vo";
import { DomainExceptionFilter } from "@/shared/http/filters/domain-exception.filter";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import type { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";
import type { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";
import type { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";
import type { ISnapshotRepo } from "@/shared/repositories/interfaces/snapshot-repo.interface";

const AGENT_ID = "00000000-0000-4000-8000-000000000100";
const SLO_ID = "00000000-0000-4000-8000-000000000101";

function makeAgent(): Agent {
  return new Agent(
    AGENT_ID,
    "00000000-0000-4000-8000-000000000102",
    "vendas-bot",
    "Vendas Bot",
    "d",
    "1.0.0",
    "http://vendas.local",
    AgentStatus.HEALTHY,
    new Date(),
    new Date()
  );
}

function makeSlo(): SLODefinition {
  return new SLODefinition(
    SLO_ID,
    AGENT_ID,
    "error_rate",
    SLOOperator.LTE,
    0.05,
    24,
    true,
    new Date()
  );
}

describe("SLOsController (e2e)", () => {
  let app: INestApplication | undefined;
  let fakeSloRepo: {
    createSlo: ReturnType<typeof vi.fn>;
    getSlo: ReturnType<typeof vi.fn>;
    listSlos: ReturnType<typeof vi.fn>;
    createEvaluation: ReturnType<typeof vi.fn>;
    listEvaluations: ReturnType<typeof vi.fn>;
  };
  let fakeSnapshotRepo: { getLatestSnapshot: ReturnType<typeof vi.fn> };
  let fakeAgentRepo: { getAgentById: ReturnType<typeof vi.fn> };
  let fakeLangfuse: { getTraces: ReturnType<typeof vi.fn> };
  let fakeAudit: { append: ReturnType<typeof vi.fn> };
  let fakeCbRepo: {
    listByAgent: ReturnType<typeof vi.fn>;
    listHistory: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    fakeSloRepo = {
      createSlo: vi.fn().mockImplementation((slo: SLODefinition) => Promise.resolve(slo)),
      getSlo: vi.fn().mockResolvedValue(null),
      listSlos: vi.fn().mockResolvedValue([]),
      createEvaluation: vi.fn().mockImplementation((e) => Promise.resolve(e)),
      listEvaluations: vi.fn().mockResolvedValue([])
    };
    fakeSnapshotRepo = { getLatestSnapshot: vi.fn().mockResolvedValue(null) };
    fakeAgentRepo = { getAgentById: vi.fn().mockResolvedValue(makeAgent()) };
    fakeLangfuse = { getTraces: vi.fn().mockResolvedValue([]) };
    fakeAudit = { append: vi.fn().mockResolvedValue(undefined) };
    fakeCbRepo = {
      listByAgent: vi.fn().mockResolvedValue([]),
      listHistory: vi.fn().mockResolvedValue([])
    };

    const fakeConfig: ConfigService<EnvConfig, true> = {
      getOrThrow: vi.fn().mockReturnValue(10)
    } as unknown as ConfigService<EnvConfig, true>;

    const createSloUseCase = new CreateSLOUseCase(fakeSloRepo as unknown as ISLORepo);
    const evaluateSloUseCase = new EvaluateSLOUseCase(
      fakeSloRepo as unknown as ISLORepo,
      fakeSnapshotRepo as unknown as ISnapshotRepo,
      fakeAgentRepo as unknown as IAgentRepo,
      fakeLangfuse as unknown as ILangfuseClient,
      fakeAudit as unknown as IAuditLogRepo,
      fakeCbRepo as unknown as ICircuitBreakerRepo,
      fakeConfig
    );
    const listSlosUseCase = new ListSLOsUseCase(fakeSloRepo as unknown as ISLORepo);
    const listSloEvaluationsUseCase = new ListSLOEvaluationsUseCase(
      fakeSloRepo as unknown as ISLORepo
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SLOsController],
      providers: [
        { provide: CreateSLOUseCase, useValue: createSloUseCase },
        { provide: EvaluateSLOUseCase, useValue: evaluateSloUseCase },
        { provide: ListSLOsUseCase, useValue: listSlosUseCase },
        { provide: ListSLOEvaluationsUseCase, useValue: listSloEvaluationsUseCase }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false })
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    fakeSloRepo.createSlo
      .mockReset()
      .mockImplementation((slo: SLODefinition) => Promise.resolve(slo));
    fakeSloRepo.getSlo.mockReset().mockResolvedValue(null);
    fakeSloRepo.listSlos.mockReset().mockResolvedValue([]);
    fakeSloRepo.createEvaluation.mockReset().mockImplementation((e) => Promise.resolve(e));
    fakeSloRepo.listEvaluations.mockReset().mockResolvedValue([]);
    fakeSnapshotRepo.getLatestSnapshot.mockReset().mockResolvedValue(null);
    fakeAgentRepo.getAgentById.mockReset().mockResolvedValue(makeAgent());
    fakeLangfuse.getTraces.mockReset().mockResolvedValue([]);
    fakeAudit.append.mockReset().mockResolvedValue(undefined);
    fakeCbRepo.listByAgent.mockReset().mockResolvedValue([]);
    fakeCbRepo.listHistory.mockReset().mockResolvedValue([]);
  });

  // ── POST /slos ──────────────────────────────────────────────────────
  it("POST /slos → 201 with persisted SLO", async () => {
    const res = await request(app!.getHttpServer()).post("/slos").send({
      agentId: AGENT_ID,
      metric: "error_rate",
      operator: "lte",
      threshold: 0.05,
      windowHours: 24
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      agentId: AGENT_ID,
      metric: "error_rate",
      operator: "lte",
      threshold: 0.05,
      windowHours: 24,
      enabled: true
    });
    expect(fakeSloRepo.createSlo).toHaveBeenCalledTimes(1);
  });

  it("POST /slos → 400 when operator is invalid", async () => {
    const res = await request(app!.getHttpServer()).post("/slos").send({
      agentId: AGENT_ID,
      metric: "error_rate",
      operator: "weird",
      threshold: 0.05,
      windowHours: 24
    });
    expect(res.status).toBe(400);
    expect(fakeSloRepo.createSlo).not.toHaveBeenCalled();
  });

  it("POST /slos → 400 when windowHours is zero", async () => {
    const res = await request(app!.getHttpServer()).post("/slos").send({
      agentId: AGENT_ID,
      metric: "error_rate",
      operator: "lte",
      threshold: 0.05,
      windowHours: 0
    });
    expect(res.status).toBe(400);
  });

  // ── GET /slos ───────────────────────────────────────────────────────
  it("GET /slos → returns list", async () => {
    fakeSloRepo.listSlos.mockResolvedValueOnce([makeSlo()]);
    const res = await request(app!.getHttpServer()).get("/slos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(SLO_ID);
  });

  // ── POST /slos/:id/evaluate ─────────────────────────────────────────
  it("POST /slos/:id/evaluate → 201 with evaluation result", async () => {
    fakeSloRepo.getSlo.mockResolvedValueOnce(makeSlo());

    const res = await request(app!.getHttpServer()).post(`/slos/${SLO_ID}/evaluate`);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("insufficient_data");
    expect(fakeSloRepo.createEvaluation).toHaveBeenCalledTimes(1);
  });

  it("POST /slos/:id/evaluate → 404 when SLO does not exist", async () => {
    fakeSloRepo.getSlo.mockResolvedValueOnce(null);
    const res = await request(app!.getHttpServer()).post(`/slos/${SLO_ID}/evaluate`);
    expect(res.status).toBe(404);
  });

  it("POST /slos/:id/evaluate → 400 when id is not a UUID", async () => {
    const res = await request(app!.getHttpServer()).post("/slos/not-a-uuid/evaluate");
    expect(res.status).toBe(400);
    expect(fakeSloRepo.getSlo).not.toHaveBeenCalled();
  });

  // ── GET /slos/:id/evaluations ───────────────────────────────────────
  it("GET /slos/:id/evaluations → returns evaluations", async () => {
    fakeSloRepo.getSlo.mockResolvedValueOnce(makeSlo());
    fakeSloRepo.listEvaluations.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000200",
        sloId: SLO_ID,
        agentId: AGENT_ID,
        status: "ok",
        measuredValue: 0.01,
        breach: false,
        langfuseTraceRef: null,
        evaluatedAt: new Date()
      }
    ]);
    const res = await request(app!.getHttpServer()).get(`/slos/${SLO_ID}/evaluations`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("ok");
  });

  it("GET /slos/:id/evaluations → 404 when SLO does not exist", async () => {
    fakeSloRepo.getSlo.mockResolvedValueOnce(null);
    const res = await request(app!.getHttpServer()).get(`/slos/${SLO_ID}/evaluations`);
    expect(res.status).toBe(404);
  });

  it("GET /slos/:id/evaluations → 400 when id is not a UUID", async () => {
    const res = await request(app!.getHttpServer()).get("/slos/not-a-uuid/evaluations");
    expect(res.status).toBe(400);
    expect(fakeSloRepo.getSlo).not.toHaveBeenCalled();
  });
});
