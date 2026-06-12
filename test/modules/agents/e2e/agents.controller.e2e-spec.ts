import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ProcessHeartbeatUseCase } from "@/modules/agents/application/use-cases/process-heartbeat.use-case";
import { RegisterAgentUseCase } from "@/modules/agents/application/use-cases/register-agent.use-case";
import { AgentsController } from "@/modules/agents/presentation/controllers/agents.controller";
import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import type { System } from "@/shared/domain/entities/system.entity";
import type { Tenant } from "@/shared/domain/entities/tenant.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import {
  BreakerState,
  CircuitBreakerState
} from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { DomainExceptionFilter } from "@/shared/http/filters/domain-exception.filter";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

const SYSTEM_ID = "00000000-0000-4000-8000-000000000011";

function makeAgent(overrides?: Partial<Agent>): Agent {
  return new Agent(
    overrides?.id ?? "00000000-0000-4000-8000-000000000020",
    overrides?.systemId ?? SYSTEM_ID,
    overrides?.slug ?? "vendas-bot",
    overrides?.name ?? "Vendas Bot",
    overrides?.description ?? "desc",
    overrides?.version ?? "1.0.0",
    overrides?.baseUrl ?? "http://vendas.local",
    overrides?.status ?? AgentStatus.UNKNOWN,
    overrides?.lastHeartbeatAt ?? null,
    overrides?.registeredAt ?? new Date("2026-01-01T00:00:00Z")
  );
}

describe("AgentsController (e2e)", () => {
  let app: INestApplication | undefined;
  let fakeAgentRepo: {
    getTenantBySlug: ReturnType<typeof vi.fn>;
    createTenant: ReturnType<typeof vi.fn>;
    getSystem: ReturnType<typeof vi.fn>;
    createSystem: ReturnType<typeof vi.fn>;
    getAgentBySlug: ReturnType<typeof vi.fn>;
    getAgentById: ReturnType<typeof vi.fn>;
    createAgent: ReturnType<typeof vi.fn>;
    updateAgent: ReturnType<typeof vi.fn>;
    listAgents: ReturnType<typeof vi.fn>;
  };
  let fakeCbRepo: {
    listByAgent: ReturnType<typeof vi.fn>;
    upsertMany: ReturnType<typeof vi.fn>;
    appendTransitions: ReturnType<typeof vi.fn>;
  };
  let fakeAudit: { append: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    fakeAgentRepo = {
      getTenantBySlug: vi.fn(),
      createTenant: vi.fn().mockImplementation((t: Tenant) => Promise.resolve(t)),
      getSystem: vi.fn(),
      createSystem: vi.fn().mockImplementation((s: System) => Promise.resolve(s)),
      getAgentBySlug: vi.fn(),
      getAgentById: vi.fn(),
      createAgent: vi.fn().mockImplementation((a: Agent) => Promise.resolve(a)),
      updateAgent: vi.fn().mockImplementation((a: Agent) => Promise.resolve(a)),
      listAgents: vi.fn()
    };
    fakeCbRepo = {
      listByAgent: vi.fn().mockResolvedValue([]),
      upsertMany: vi.fn().mockResolvedValue(undefined),
      appendTransitions: vi.fn().mockResolvedValue(undefined)
    };
    fakeAudit = { append: vi.fn().mockResolvedValue(undefined) };

    const fakeConfig: ConfigService<EnvConfig, true> = {
      getOrThrow: vi.fn().mockReturnValue(120)
    } as unknown as ConfigService<EnvConfig, true>;

    const registerUseCase = new RegisterAgentUseCase(
      fakeAgentRepo as unknown as IAgentRepo,
      fakeAudit as unknown as IAuditLogRepo
    );
    const heartbeatUseCase = new ProcessHeartbeatUseCase(
      fakeAgentRepo as unknown as IAgentRepo,
      fakeAudit as unknown as IAuditLogRepo,
      fakeCbRepo as unknown as ICircuitBreakerRepo,
      fakeConfig
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AgentsController],
      providers: [
        { provide: RegisterAgentUseCase, useValue: registerUseCase },
        { provide: ProcessHeartbeatUseCase, useValue: heartbeatUseCase },
        { provide: IAgentRepo, useValue: fakeAgentRepo },
        { provide: ICircuitBreakerRepo, useValue: fakeCbRepo },
        { provide: IAuditLogRepo, useValue: fakeAudit }
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
    fakeAgentRepo.getTenantBySlug.mockReset().mockResolvedValue(null);
    fakeAgentRepo.createTenant.mockClear();
    fakeAgentRepo.getSystem.mockReset().mockResolvedValue(null);
    fakeAgentRepo.createSystem.mockClear();
    fakeAgentRepo.getAgentBySlug.mockReset().mockResolvedValue(null);
    fakeAgentRepo.createAgent.mockClear();
    fakeAgentRepo.updateAgent.mockClear();
    fakeAgentRepo.listAgents.mockReset().mockResolvedValue([]);
    fakeCbRepo.listByAgent.mockReset().mockResolvedValue([]);
    fakeCbRepo.upsertMany.mockClear();
    fakeCbRepo.appendTransitions.mockClear();
    fakeAudit.append.mockClear();
  });

  // ── POST /agents/register ───────────────────────────────────────────
  it("POST /agents/register → 201 with agent payload", async () => {
    const res = await request(app!.getHttpServer()).post("/agents/register").send({
      slug: "vendas-bot",
      name: "Vendas Bot",
      description: "agente de vendas",
      version: "1.0.0",
      baseUrl: "http://vendas.local",
      tenantSlug: "acme",
      systemSlug: "billing"
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      slug: "vendas-bot",
      name: "Vendas Bot",
      version: "1.0.0",
      baseUrl: "http://vendas.local",
      status: "unknown"
    });
    expect(fakeAgentRepo.createTenant).toHaveBeenCalledTimes(1);
    expect(fakeAgentRepo.createSystem).toHaveBeenCalledTimes(1);
    expect(fakeAgentRepo.createAgent).toHaveBeenCalledTimes(1);
  });

  it("POST /agents/register → 400 when version is missing", async () => {
    const res = await request(app!.getHttpServer()).post("/agents/register").send({
      slug: "vendas-bot",
      name: "Vendas Bot",
      baseUrl: "http://vendas.local",
      tenantSlug: "acme",
      systemSlug: "billing"
    });
    expect(res.status).toBe(400);
    expect(fakeAgentRepo.createAgent).not.toHaveBeenCalled();
  });

  // ── POST /agents/:slug/heartbeat ────────────────────────────────────
  it("POST /agents/:slug/heartbeat → 200 with updated agent", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent());

    const res = await request(app!.getHttpServer())
      .post("/agents/vendas-bot/heartbeat")
      .send({ version: "1.1.0" });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("healthy");
    expect(res.body.version).toBe("1.1.0");
    expect(fakeAgentRepo.updateAgent).toHaveBeenCalledTimes(1);
  });

  it("POST /agents/:slug/heartbeat → 404 when agent does not exist", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(null);

    const res = await request(app!.getHttpServer())
      .post("/agents/nonexistent/heartbeat")
      .send({});

    expect(res.status).toBe(404);
  });

  it("POST /agents/:slug/heartbeat → persists circuit breakers", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent());

    const res = await request(app!.getHttpServer())
      .post("/agents/vendas-bot/heartbeat")
      .send({
        circuitBreakers: [
          { name: "llm", state: "open", failCount: 5 }
        ]
      });

    expect(res.status).toBe(201);
    expect(fakeCbRepo.upsertMany).toHaveBeenCalledTimes(1);
    expect(fakeCbRepo.appendTransitions).toHaveBeenCalledTimes(1);
  });

  it("POST /agents/:slug/heartbeat → 400 when state is invalid", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent());

    const res = await request(app!.getHttpServer())
      .post("/agents/vendas-bot/heartbeat")
      .send({
        circuitBreakers: [{ name: "x", state: "weird", failCount: 0 }]
      });

    expect(res.status).toBe(400);
    expect(fakeCbRepo.upsertMany).not.toHaveBeenCalled();
  });

  // ── GET /agents ─────────────────────────────────────────────────────
  it("GET /agents → returns list", async () => {
    fakeAgentRepo.listAgents.mockResolvedValueOnce([makeAgent({ slug: "a1" }), makeAgent({ slug: "a2" })]);
    const res = await request(app!.getHttpServer()).get("/agents");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].slug).toBe("a1");
  });

  // ── GET /agents/:slug ───────────────────────────────────────────────
  it("GET /agents/:slug → returns agent", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent());
    const res = await request(app!.getHttpServer()).get("/agents/vendas-bot");
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe("vendas-bot");
  });

  it("GET /agents/:slug → 404 when not found", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(null);
    const res = await request(app!.getHttpServer()).get("/agents/none");
    expect(res.status).toBe(404);
  });

  // ── GET /agents/:slug/status ────────────────────────────────────────
  it("GET /agents/:slug/status → returns status with circuit breakers", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent({ status: AgentStatus.HEALTHY }));
    fakeCbRepo.listByAgent.mockResolvedValueOnce([
      new CircuitBreakerState(
        "00000000-0000-4000-8000-000000000020",
        "llm",
        BreakerState.CLOSED,
        0,
        null,
        new Date("2026-06-12T00:00:00Z")
      )
    ]);

    const res = await request(app!.getHttpServer()).get("/agents/vendas-bot/status");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
    expect(res.body.circuitBreakers).toHaveLength(1);
    expect(res.body.circuitBreakers[0].name).toBe("llm");
    expect(res.body.circuitBreakers[0].state).toBe("closed");
  });

  // ── GET /agents/:slug/circuit-breakers ──────────────────────────────
  it("GET /agents/:slug/circuit-breakers → returns CB list", async () => {
    fakeAgentRepo.getAgentBySlug.mockResolvedValueOnce(makeAgent());
    fakeCbRepo.listByAgent.mockResolvedValueOnce([
      new CircuitBreakerState(
        "00000000-0000-4000-8000-000000000020",
        "db",
        BreakerState.OPEN,
        3,
        null,
        new Date("2026-06-12T00:00:00Z")
      )
    ]);

    const res = await request(app!.getHttpServer()).get("/agents/vendas-bot/circuit-breakers");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].state).toBe("open");
  });
});
