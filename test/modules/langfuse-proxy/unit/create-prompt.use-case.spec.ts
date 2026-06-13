import { beforeEach, describe, expect, it, vi } from "vitest";

import { PromptDto } from "@/modules/langfuse-proxy/application/dtos/prompt.dto";
import { CreatePromptUseCase } from "@/modules/langfuse-proxy/application/use-cases/create-prompt.use-case";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import type { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

const DEFAULT_LANGFUSE_RESPONSE = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "acme/billing/v1/greeting",
  version: 1
};

const DEFAULT_REQUEST = {
  tenantSlug: "acme",
  systemSlug: "billing",
  agentSlug: "v1",
  name: "greeting",
  prompt: "Hello {{name}}!",
  type: "text"
};

function makeUseCase(overrides?: {
  createPromptResult?: Record<string, unknown>;
  auditShouldFail?: boolean;
}) {
  const createPrompt = vi
    .fn()
    .mockResolvedValue(overrides?.createPromptResult ?? DEFAULT_LANGFUSE_RESPONSE);
  const append = vi.fn();
  if (overrides?.auditShouldFail) {
    append.mockRejectedValue(new Error("db down"));
  } else {
    append.mockResolvedValue(undefined);
  }

  const langfuse = { createPrompt } as unknown as ILangfuseClient;
  const auditRepo = { append } as unknown as IAuditLogRepo;
  const useCase = new CreatePromptUseCase(langfuse, auditRepo);

  return { useCase, createPrompt, append };
}

describe("CreatePromptUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards payload with canonical name to langfuse", async () => {
    const { useCase, createPrompt } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createPrompt).toHaveBeenCalledTimes(1);
    expect(createPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ name: "acme/billing/v1/greeting" })
    );
  });

  it("strips tenantSlug before forwarding", async () => {
    const { useCase, createPrompt } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createPrompt).toHaveBeenCalledWith(
      expect.not.objectContaining({ tenantSlug: expect.anything() })
    );
  });

  it("strips systemSlug before forwarding", async () => {
    const { useCase, createPrompt } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createPrompt).toHaveBeenCalledWith(
      expect.not.objectContaining({ systemSlug: expect.anything() })
    );
  });

  it("strips agentSlug before forwarding", async () => {
    const { useCase, createPrompt } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createPrompt).toHaveBeenCalledWith(
      expect.not.objectContaining({ agentSlug: expect.anything() })
    );
  });

  it("preserves extra fields from the request", async () => {
    const { useCase, createPrompt } = makeUseCase();

    await useCase.execute(DEFAULT_REQUEST);

    expect(createPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Hello {{name}}!",
        type: "text"
      })
    );
  });

  it("appends audit log with prompt_published action and canonical name", async () => {
    const langfuseId = "550e8400-e29b-41d4-a716-446655440000";
    const { useCase, append } = makeUseCase({
      createPromptResult: { id: langfuseId }
    });

    await useCase.execute(DEFAULT_REQUEST);

    expect(append).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "prompt",
        entityId: langfuseId,
        action: "prompt_published",
        actor: "system",
        payload: { name: "acme/billing/v1/greeting" }
      })
    );
  });

  it("returns a PromptDto mapped from the langfuse response", async () => {
    const langfuseResponse = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "acme/billing/v1/greeting",
      version: 3
    };
    const { useCase } = makeUseCase({ createPromptResult: langfuseResponse });

    const result = await useCase.execute(DEFAULT_REQUEST);

    expect(result).toBeInstanceOf(PromptDto);
    expect(result).toMatchObject({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "acme/billing/v1/greeting",
      version: 3
    });
  });

  it("does NOT propagate audit log failure", async () => {
    const { useCase } = makeUseCase({ auditShouldFail: true });

    await expect(useCase.execute(DEFAULT_REQUEST)).resolves.toBeDefined();
  });

  it("returns PromptDto even when audit log fails", async () => {
    const langfuseResponse = { id: "550e8400-e29b-41d4-a716-446655440000" };
    const { useCase } = makeUseCase({
      createPromptResult: langfuseResponse,
      auditShouldFail: true
    });

    const result = await useCase.execute(DEFAULT_REQUEST);

    expect(result).toBeInstanceOf(PromptDto);
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});
