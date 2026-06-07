import type { INestApplication } from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CheckSystemHealthUseCase } from "@/modules/health/application/use-cases/check-system-health.use-case";
import { HealthController } from "@/modules/health/presentation/controllers/health.controller";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { FakeLangfuseClient } from "../../../helpers/fake-langfuse";
import { FakePrismaService } from "../../../helpers/fake-prisma";

describe("GET /health (e2e)", () => {
  let app: INestApplication | undefined;
  let fakePrisma: FakePrismaService;
  let fakeLangfuse: FakeLangfuseClient;

  beforeAll(async () => {
    fakePrisma = new FakePrismaService();
    fakeLangfuse = new FakeLangfuseClient();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        CheckSystemHealthUseCase,
        { provide: PrismaService, useValue: fakePrisma },
        { provide: ILangfuseClient, useValue: fakeLangfuse }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    fakePrisma.setFailure(false);
    fakeLangfuse.setFailure(false);
  });

  it("returns 200 with status ok when both deps are up", async () => {
    const response = await request(app!.getHttpServer()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.dependencies.postgresql).toBe("ok");
    expect(response.body.dependencies.langfuse).toBe("ok");
    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("returns 200 with status degraded when langfuse is down but postgres is up", async () => {
    fakeLangfuse.setFailure(true);
    const response = await request(app!.getHttpServer()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("degraded");
    expect(response.body.dependencies.postgresql).toBe("ok");
    expect(response.body.dependencies.langfuse).toBe("unavailable");
  });

  it("returns 503 with status unavailable when postgres is down", async () => {
    fakePrisma.setFailure(true);
    const response = await request(app!.getHttpServer()).get("/health");
    expect(response.status).toBe(503);
    expect(response.body.status).toBe("unavailable");
    expect(response.body.dependencies.postgresql).toBe("unavailable");
  });
});