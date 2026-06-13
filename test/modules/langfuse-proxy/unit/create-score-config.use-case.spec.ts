import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreConfigDto } from "@/modules/langfuse-proxy/application/dtos/score-config.dto";
import { CreateScoreConfigUseCase } from "@/modules/langfuse-proxy/application/use-cases/create-score-config.use-case";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

const DEFAULT_LANGFUSE_RESPONSE = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "acme/latency",
  dataType: "NUMERIC"
};

const DEFAULT_REQUEST = {
  tenantSlug: "acme",
  name: "latency",
  dataType: "NUMERIC",
  description: "Response latency in ms"
};

function makeUseCase(overrides?: { createScoreConfigResult?: Record<string, unknown> }) {
  const createScoreConfig = vi
    .fn()
    .mockResolvedValue(overrides?.createScoreConfigResult ?? DEFAULT_LANGFUSE_RESPONSE);

  const langfuse = { createScoreConfig } as unknown as ILangfuseClient;
  const useCase = new CreateScoreConfigUseCase(langfuse);

  return { useCase, createScoreConfig };
}

describe("CreateScoreConfigUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards payload with canonical name to langfuse", async () => {
    const { useCase, createScoreConfig } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createScoreConfig).toHaveBeenCalledTimes(1);
    expect(createScoreConfig).toHaveBeenCalledWith(
      expect.objectContaining({ name: "acme/latency" })
    );
  });

  it("strips tenantSlug before forwarding", async () => {
    const { useCase, createScoreConfig } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createScoreConfig).toHaveBeenCalledWith(
      expect.not.objectContaining({ tenantSlug: expect.anything() })
    );
  });

  it("preserves extra fields from the request", async () => {
    const { useCase, createScoreConfig } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createScoreConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        dataType: "NUMERIC",
        description: "Response latency in ms"
      })
    );
  });

  it("returns a ScoreConfigDto mapped from the langfuse response", async () => {
    const langfuseResponse = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "acme/latency",
      dataType: "NUMERIC"
    };
    const { useCase } = makeUseCase({ createScoreConfigResult: langfuseResponse });

    const result = await useCase.execute(DEFAULT_REQUEST);

    expect(result).toBeInstanceOf(ScoreConfigDto);
    expect(result).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "acme/latency",
      dataType: "NUMERIC"
    });
  });
});
