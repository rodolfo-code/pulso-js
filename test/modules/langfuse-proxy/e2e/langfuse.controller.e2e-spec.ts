import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CreatePromptUseCase } from "@/modules/langfuse-proxy/application/use-cases/create-prompt.use-case";
import { CreateScoreConfigUseCase } from "@/modules/langfuse-proxy/application/use-cases/create-score-config.use-case";
import { WriteScoreUseCase } from "@/modules/langfuse-proxy/application/use-cases/write-score.use-case";
import { LangfuseController } from "@/modules/langfuse-proxy/presentation/controllers/langfuse.controller";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

import { FakeLangfuseClientFull } from "../../../helpers/fake-langfuse-full";

describe("LangfuseController (e2e)", () => {
  let app: INestApplication | undefined;
  let fakeLangfuse: FakeLangfuseClientFull;
  let auditAppend: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    fakeLangfuse = new FakeLangfuseClientFull();
    auditAppend = vi.fn().mockResolvedValue(undefined);

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [LangfuseController],
      providers: [
        WriteScoreUseCase,
        CreatePromptUseCase,
        CreateScoreConfigUseCase,
        { provide: ILangfuseClient, useValue: fakeLangfuse },
        { provide: IAuditLogRepo, useValue: { append: auditAppend } }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false })
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    fakeLangfuse.resetAll();
    auditAppend.mockClear();
  });

  // ── Health ──────────────────────────────────────────────────────────
  it("GET /langfuse/health → returns langfuse body", async () => {
    fakeLangfuse.getHealth.mockResolvedValueOnce({ status: "OK", version: "3.0" });

    const res = await request(app!.getHttpServer()).get("/langfuse/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "OK", version: "3.0" });
    expect(fakeLangfuse.getHealth).toHaveBeenCalledTimes(1);
  });

  // ── Traces ──────────────────────────────────────────────────────────
  it("GET /langfuse/traces → forwards query filters and returns list", async () => {
    fakeLangfuse.getTraces.mockResolvedValueOnce([{ id: "t1" }, { id: "t2" }]);

    const res = await request(app!.getHttpServer())
      .get("/langfuse/traces")
      .query({ userId: "u1", sessionId: "s1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "t1" }, { id: "t2" }]);
    expect(fakeLangfuse.getTraces).toHaveBeenCalledTimes(1);
    expect(fakeLangfuse.getTraces).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", sessionId: "s1" })
    );
  });

  it("GET /langfuse/traces/:traceId → calls getTrace with the id", async () => {
    fakeLangfuse.getTrace.mockResolvedValueOnce({ id: "trace-abc" });

    const res = await request(app!.getHttpServer()).get("/langfuse/traces/trace-abc");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "trace-abc" });
    expect(fakeLangfuse.getTrace).toHaveBeenCalledWith("trace-abc");
  });

  it("GET /langfuse/traces/:traceId/observations → calls getTraceObservations", async () => {
    fakeLangfuse.getTraceObservations.mockResolvedValueOnce([{ id: "o1" }]);

    const res = await request(app!.getHttpServer()).get(
      "/langfuse/traces/trace-abc/observations"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "o1" }]);
    expect(fakeLangfuse.getTraceObservations).toHaveBeenCalledWith("trace-abc");
    expect(fakeLangfuse.getTrace).not.toHaveBeenCalled();
  });

  // ── Sessions ────────────────────────────────────────────────────────
  it("GET /langfuse/sessions → forwards filters", async () => {
    fakeLangfuse.getSessions.mockResolvedValueOnce([{ id: "s1" }]);

    const res = await request(app!.getHttpServer())
      .get("/langfuse/sessions")
      .query({ userId: "u1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "s1" }]);
    expect(fakeLangfuse.getSessions).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1" })
    );
  });

  it("GET /langfuse/sessions/:sessionId → calls getSession with id", async () => {
    fakeLangfuse.getSession.mockResolvedValueOnce({ id: "sess-abc" });

    const res = await request(app!.getHttpServer()).get("/langfuse/sessions/sess-abc");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "sess-abc" });
    expect(fakeLangfuse.getSession).toHaveBeenCalledWith("sess-abc");
  });

  // ── Scores ──────────────────────────────────────────────────────────
  it("GET /langfuse/scores → forwards filters", async () => {
    fakeLangfuse.getScores.mockResolvedValueOnce([{ id: "sc1" }]);

    const res = await request(app!.getHttpServer())
      .get("/langfuse/scores")
      .query({ traceId: "t1", name: "acme/latency" });

    expect(res.status).toBe(200);
    expect(fakeLangfuse.getScores).toHaveBeenCalledWith(
      expect.objectContaining({ traceId: "t1", name: "acme/latency" })
    );
  });

  it("POST /langfuse/scores → calls createScore and appends audit", async () => {
    fakeLangfuse.createScore.mockResolvedValueOnce({
      id: "550e8400-e29b-41d4-a716-446655440000"
    });

    const res = await request(app!.getHttpServer()).post("/langfuse/scores").send({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85,
      comment: "ok"
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(fakeLangfuse.createScore).toHaveBeenCalledWith({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85,
      comment: "ok"
    });
    expect(auditAppend).toHaveBeenCalledTimes(1);
    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "score",
        entityId: "550e8400-e29b-41d4-a716-446655440000",
        action: "score_written"
      })
    );
  });

  it("POST /langfuse/scores → 400 when value is not a number", async () => {
    const res = await request(app!.getHttpServer()).post("/langfuse/scores").send({
      traceId: "trace-1",
      name: "acme/latency",
      value: "not-a-number"
    });

    expect(res.status).toBe(400);
    expect(fakeLangfuse.createScore).not.toHaveBeenCalled();
  });

  it("POST /langfuse/scores → 400 when traceId is missing", async () => {
    const res = await request(app!.getHttpServer()).post("/langfuse/scores").send({
      name: "acme/latency",
      value: 0.85
    });

    expect(res.status).toBe(400);
    expect(fakeLangfuse.createScore).not.toHaveBeenCalled();
  });

  // ── Metrics ─────────────────────────────────────────────────────────
  it("GET /langfuse/metrics/daily → forwards filters and returns body", async () => {
    fakeLangfuse.getMetricsDaily.mockResolvedValueOnce({ traces: 42 });

    const res = await request(app!.getHttpServer())
      .get("/langfuse/metrics/daily")
      .query({ traceName: "checkout", userId: "u1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ traces: 42 });
    expect(fakeLangfuse.getMetricsDaily).toHaveBeenCalledWith(
      expect.objectContaining({ traceName: "checkout", userId: "u1" })
    );
  });

  // ── Prompts ─────────────────────────────────────────────────────────
  it("GET /langfuse/prompts → returns list", async () => {
    fakeLangfuse.getPrompts.mockResolvedValueOnce([{ id: "p1" }]);

    const res = await request(app!.getHttpServer()).get("/langfuse/prompts");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "p1" }]);
  });

  it("POST /langfuse/prompts → builds canonical name and strips observatory fields", async () => {
    fakeLangfuse.createPrompt.mockResolvedValueOnce({
      id: "550e8400-e29b-41d4-a716-446655440002"
    });

    const res = await request(app!.getHttpServer()).post("/langfuse/prompts").send({
      tenantSlug: "acme",
      systemSlug: "billing",
      agentSlug: "v1",
      name: "greeting",
      prompt: "Hello {{name}}!",
      type: "text"
    });

    expect(res.status).toBe(201);
    expect(fakeLangfuse.createPrompt).toHaveBeenCalledTimes(1);
    expect(fakeLangfuse.createPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "acme/billing/v1/greeting",
        prompt: "Hello {{name}}!",
        type: "text"
      })
    );
    expect(fakeLangfuse.createPrompt).toHaveBeenCalledWith(
      expect.not.objectContaining({ tenantSlug: expect.anything() })
    );
    expect(fakeLangfuse.createPrompt).toHaveBeenCalledWith(
      expect.not.objectContaining({ systemSlug: expect.anything() })
    );
    expect(fakeLangfuse.createPrompt).toHaveBeenCalledWith(
      expect.not.objectContaining({ agentSlug: expect.anything() })
    );
    expect(auditAppend).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "prompt",
        action: "prompt_published"
      })
    );
  });

  it("GET /langfuse/prompts/:multiSegmentName → captures the full path with slashes", async () => {
    fakeLangfuse.getPrompt.mockResolvedValueOnce({ name: "acme/billing/v1/greeting" });

    const res = await request(app!.getHttpServer()).get(
      "/langfuse/prompts/acme/billing/v1/greeting"
    );

    expect(res.status).toBe(200);
    expect(fakeLangfuse.getPrompt).toHaveBeenCalledWith("acme/billing/v1/greeting");
  });

  it("DELETE /langfuse/prompts/:multiSegmentName → returns 204 and captures full path", async () => {
    const res = await request(app!.getHttpServer()).delete(
      "/langfuse/prompts/acme/billing/v1/greeting"
    );

    expect(res.status).toBe(204);
    expect(fakeLangfuse.deletePrompt).toHaveBeenCalledWith("acme/billing/v1/greeting");
  });

  // ── Score Configs ───────────────────────────────────────────────────
  it("GET /langfuse/score-configs → returns list", async () => {
    fakeLangfuse.getScoreConfigs.mockResolvedValueOnce([{ id: "sc1" }]);

    const res = await request(app!.getHttpServer()).get("/langfuse/score-configs");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "sc1" }]);
  });

  it("POST /langfuse/score-configs → builds canonical name and strips tenantSlug", async () => {
    fakeLangfuse.createScoreConfig.mockResolvedValueOnce({
      id: "550e8400-e29b-41d4-a716-446655440003"
    });

    const res = await request(app!.getHttpServer())
      .post("/langfuse/score-configs")
      .send({
        tenantSlug: "acme",
        name: "latency",
        dataType: "NUMERIC"
      });

    expect(res.status).toBe(201);
    expect(fakeLangfuse.createScoreConfig).toHaveBeenCalledTimes(1);
    expect(fakeLangfuse.createScoreConfig).toHaveBeenCalledWith(
      expect.objectContaining({ name: "acme/latency", dataType: "NUMERIC" })
    );
    expect(fakeLangfuse.createScoreConfig).toHaveBeenCalledWith(
      expect.not.objectContaining({ tenantSlug: expect.anything() })
    );
    expect(auditAppend).not.toHaveBeenCalled();
  });

  // ── Datasets ────────────────────────────────────────────────────────
  it("GET /langfuse/datasets → returns list", async () => {
    fakeLangfuse.getDatasets.mockResolvedValueOnce([{ id: "d1" }]);

    const res = await request(app!.getHttpServer()).get("/langfuse/datasets");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "d1" }]);
  });

  it("POST /langfuse/datasets → forwards body verbatim", async () => {
    fakeLangfuse.createDataset.mockResolvedValueOnce({ id: "d-new" });

    const res = await request(app!.getHttpServer())
      .post("/langfuse/datasets")
      .send({ name: "eval-set", description: "x" });

    expect(res.status).toBe(201);
    expect(fakeLangfuse.createDataset).toHaveBeenCalledWith(
      expect.objectContaining({ name: "eval-set", description: "x" })
    );
  });

  it("GET /langfuse/datasets/:name/items → forwards name", async () => {
    fakeLangfuse.getDatasetItems.mockResolvedValueOnce([{ id: "i1" }]);

    const res = await request(app!.getHttpServer()).get(
      "/langfuse/datasets/eval-set/items"
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "i1" }]);
    expect(fakeLangfuse.getDatasetItems).toHaveBeenCalledWith("eval-set");
  });

  it("POST /langfuse/datasets/:name/items → forwards name and body", async () => {
    fakeLangfuse.createDatasetItem.mockResolvedValueOnce({ id: "i-new" });

    const res = await request(app!.getHttpServer())
      .post("/langfuse/datasets/eval-set/items")
      .send({ input: "x", expectedOutput: "y" });

    expect(res.status).toBe(201);
    expect(fakeLangfuse.createDatasetItem).toHaveBeenCalledTimes(1);
    expect(fakeLangfuse.createDatasetItem).toHaveBeenCalledWith(
      "eval-set",
      expect.objectContaining({ input: "x", expectedOutput: "y" })
    );
  });
});
