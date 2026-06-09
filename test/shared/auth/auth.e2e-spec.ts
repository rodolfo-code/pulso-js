import { Controller, Get, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiKeyGuard } from "@/shared/auth/api-key.guard";
import { Public } from "@/shared/auth/public.decorator";

const VALID_KEY = "valid-test-api-key";

@Public()
@Controller("/test-public")
class TestPublicController {
  @Get()
  hello() {
    return { ok: true, route: "public" };
  }
}

@Controller("/test-protected")
class TestProtectedController {
  @Get()
  hello() {
    return { ok: true, route: "protected" };
  }
}

describe("ApiKeyGuard (e2e)", () => {
  let app: INestApplication | undefined;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TestPublicController, TestProtectedController],
      providers: [
        Reflector,
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => VALID_KEY }
        },
        { provide: APP_GUARD, useClass: ApiKeyGuard }
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

  it("public route — no header → 200", async () => {
    const response = await request(app!.getHttpServer()).get("/test-public");
    expect(response.status).toBe(200);
    expect(response.body.route).toBe("public");
  });

  it("public route — even with wrong header → 200 (decorator wins)", async () => {
    const response = await request(app!.getHttpServer())
      .get("/test-public")
      .set("X-API-Key", "wrong");
    expect(response.status).toBe(200);
  });

  it("protected route — no header → 401", async () => {
    const response = await request(app!.getHttpServer()).get("/test-protected");
    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid or missing API key");
  });

  it("protected route — wrong header → 401", async () => {
    const response = await request(app!.getHttpServer())
      .get("/test-protected")
      .set("X-API-Key", "wrong-key");
    expect(response.status).toBe(401);
  });

  it("protected route — correct header → 200", async () => {
    const response = await request(app!.getHttpServer())
      .get("/test-protected")
      .set("X-API-Key", VALID_KEY);
    expect(response.status).toBe(200);
    expect(response.body.route).toBe("protected");
  });
});