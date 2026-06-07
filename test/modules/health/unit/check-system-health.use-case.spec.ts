import { beforeEach, describe, expect, it } from "vitest";

import { CheckSystemHealthUseCase } from "@/modules/health/application/use-cases/check-system-health.use-case";
import type { PrismaService } from "@/shared/prisma/prisma.service";

import { FakeLangfuseClient } from "../../../helpers/fake-langfuse";
import { FakePrismaService } from "../../../helpers/fake-prisma";

describe("CheckSystemHealthUseCase", () => {
  let useCase: CheckSystemHealthUseCase;
  let fakePrisma: FakePrismaService;
  let fakeLangfuse: FakeLangfuseClient;

  beforeEach(() => {
    fakePrisma = new FakePrismaService();
    fakeLangfuse = new FakeLangfuseClient();
    useCase = new CheckSystemHealthUseCase(
      fakePrisma as unknown as PrismaService,
      fakeLangfuse
    );
  });

  it("returns ok when both postgres and langfuse are up", async () => {
    const result = await useCase.execute();
    expect(result.status).toBe("ok");
    expect(result.postgresql).toBe("ok");
    expect(result.langfuse).toBe("ok");
    expect(result.isUnavailable()).toBe(false);
  });

  it("returns degraded when langfuse is down but postgres is up", async () => {
    fakeLangfuse.setFailure(true);
    const result = await useCase.execute();
    expect(result.status).toBe("degraded");
    expect(result.postgresql).toBe("ok");
    expect(result.langfuse).toBe("unavailable");
    expect(result.isUnavailable()).toBe(false);
  });

  it("returns unavailable when postgres is down regardless of langfuse", async () => {
    fakePrisma.setFailure(true);
    const result = await useCase.execute();
    expect(result.status).toBe("unavailable");
    expect(result.postgresql).toBe("unavailable");
    expect(result.isUnavailable()).toBe(true);
  });

  it("returns unavailable when both are down", async () => {
    fakePrisma.setFailure(true);
    fakeLangfuse.setFailure(true);
    const result = await useCase.execute();
    expect(result.status).toBe("unavailable");
    expect(result.postgresql).toBe("unavailable");
    expect(result.langfuse).toBe("unavailable");
  });

  it("includes ISO 8601 UTC timestamp", async () => {
    const result = await useCase.execute();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});