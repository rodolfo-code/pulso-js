import { beforeEach, describe, expect, it, vi } from "vitest";

import { ScoreDto } from "@/modules/langfuse-proxy/application/dtos/score.dto";
import { WriteScoreUseCase } from "@/modules/langfuse-proxy/application/use-cases/write-score.use-case";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

const DEFAULT_LANGFUSE_RESPONSE = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  traceId: "t1",
  name: "acme/latency",
  value: 0.9
};

function makeUseCase(overrides?: {
  createScoreResult?: Record<string, unknown>;
  auditShouldFail?: boolean;
}) {
  const createScore = vi
    .fn()
    .mockResolvedValue(overrides?.createScoreResult ?? DEFAULT_LANGFUSE_RESPONSE);
  const append = vi.fn();
  if (overrides?.auditShouldFail) {
    append.mockRejectedValue(new Error("db down"));
  } else {
    append.mockResolvedValue(undefined);
  }

  const langfuse = { createScore } as unknown as ILangfuseClient;
  const auditRepo = { append } as unknown as IAuditLogRepo;
  const useCase = new WriteScoreUseCase(langfuse, auditRepo);

  return { useCase, createScore, append };
}

describe("WriteScoreUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls langfuse.createScore with traceId, name and value", async () => {
    const { useCase, createScore } = makeUseCase();

    await useCase.execute({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });

    expect(createScore).toHaveBeenCalledTimes(1);
    expect(createScore).toHaveBeenCalledWith({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });
  });

  it("includes comment in payload when provided", async () => {
    const { useCase, createScore } = makeUseCase();

    await useCase.execute({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85,
      comment: "looks good"
    });

    expect(createScore).toHaveBeenCalledWith({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85,
      comment: "looks good"
    });
  });

  it("omits comment from payload when not provided", async () => {
    const { useCase, createScore } = makeUseCase();

    await useCase.execute({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });

    expect(createScore).toHaveBeenCalledWith(
      expect.not.objectContaining({ comment: expect.anything() })
    );
  });

  it("appends audit log with entity_id from langfuse response", async () => {
    const langfuseId = "550e8400-e29b-41d4-a716-446655440000";
    const { useCase, append } = makeUseCase({
      createScoreResult: { id: langfuseId }
    });

    await useCase.execute({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });

    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "score",
        entityId: langfuseId,
        action: "score_written",
        actor: "system",
        payload: {
          traceId: "trace-1",
          name: "acme/latency",
          value: 0.85
        }
      })
    );
  });

  it("returns a ScoreDto mapped from the langfuse response", async () => {
    const langfuseResponse = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85,
      createdAt: "2026-06-10T00:00:00Z"
    };
    const { useCase } = makeUseCase({ createScoreResult: langfuseResponse });

    const result = await useCase.execute({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });

    expect(result).toBeInstanceOf(ScoreDto);
    expect(result).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440000",
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });
  });

  it("does NOT propagate audit log failure", async () => {
    const { useCase } = makeUseCase({ auditShouldFail: true });

    await expect(
      useCase.execute({
        traceId: "trace-1",
        name: "acme/latency",
        value: 0.85
      })
    ).resolves.toBeDefined();
  });

  it("returns ScoreDto even when audit log fails", async () => {
    const langfuseResponse = { id: "550e8400-e29b-41d4-a716-446655440000" };
    const { useCase } = makeUseCase({
      createScoreResult: langfuseResponse,
      auditShouldFail: true
    });

    const result = await useCase.execute({
      traceId: "trace-1",
      name: "acme/latency",
      value: 0.85
    });

    expect(result).toBeInstanceOf(ScoreDto);
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});
