import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetConversationListUseCase } from "@/modules/observations/application/use-cases/get-conversation-list.use-case";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

describe("GetConversationListUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to langfuse.getSessions and returns the list verbatim", async () => {
    const sessions = [{ id: "s1" }, { id: "s2" }];
    const getSessions = vi.fn().mockResolvedValue(sessions);
    const langfuse = { getSessions } as unknown as ILangfuseClient;
    const useCase = new GetConversationListUseCase(langfuse);

    const result = await useCase.execute();

    expect(getSessions).toHaveBeenCalledTimes(1);
    expect(result).toBe(sessions);
  });

  it("propagates errors from the Langfuse client", async () => {
    const langfuse = {
      getSessions: vi.fn().mockRejectedValue(new Error("langfuse down"))
    } as unknown as ILangfuseClient;
    const useCase = new GetConversationListUseCase(langfuse);

    await expect(useCase.execute()).rejects.toThrow("langfuse down");
  });
});
