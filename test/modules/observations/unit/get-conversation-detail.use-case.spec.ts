import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetConversationDetailUseCase } from "@/modules/observations/application/use-cases/get-conversation-detail.use-case";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { LangfuseUnavailableError } from "@/shared/langfuse-client/errors/langfuse-unavailable.error";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import type { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

const SESSION_ID = "sess-abc-123";

function makeUseCase(opts?: {
  sessionImpl?: () => Promise<Record<string, unknown>>;
  tracesImpl?: () => Promise<Record<string, unknown>[]>;
}) {
  const langfuse = {
    getSession: vi.fn(opts?.sessionImpl ?? (() => Promise.resolve({ id: SESSION_ID }))),
    getTraces: vi.fn(opts?.tracesImpl ?? (() => Promise.resolve([])))
  } as unknown as ILangfuseClient;
  return { useCase: new GetConversationDetailUseCase(langfuse), langfuse };
}

describe("GetConversationDetailUseCase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws DomainNotFoundError when Langfuse responds 404", async () => {
    const { useCase } = makeUseCase({
      sessionImpl: () =>
        Promise.reject(new LangfuseUpstreamError(404, { message: "Session not found" }))
    });
    await expect(useCase.execute(SESSION_ID)).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("propagates 502 upstream error from Langfuse instead of disguising as 404", async () => {
    const upstream500 = new LangfuseUpstreamError(500, { message: "internal error" });
    const { useCase } = makeUseCase({
      sessionImpl: () => Promise.reject(upstream500)
    });
    await expect(useCase.execute(SESSION_ID)).rejects.toBe(upstream500);
  });

  it("propagates LangfuseUnavailableError (network down) instead of disguising as 404", async () => {
    const unavailable = new LangfuseUnavailableError();
    const { useCase } = makeUseCase({
      sessionImpl: () => Promise.reject(unavailable)
    });
    await expect(useCase.execute(SESSION_ID)).rejects.toBe(unavailable);
  });

  it("returns session and empty traces when Langfuse session exists but trace fetch fails", async () => {
    const { useCase } = makeUseCase({
      sessionImpl: () => Promise.resolve({ id: SESSION_ID, foo: "bar" }),
      tracesImpl: () => Promise.reject(new Error("traces down"))
    });
    const result = await useCase.execute(SESSION_ID);
    expect(result.session).toMatchObject({ id: SESSION_ID, foo: "bar" });
    expect(result.traces).toEqual([]);
  });

  it("calls getTraces with sessionId filter", async () => {
    const { useCase, langfuse } = makeUseCase();
    await useCase.execute(SESSION_ID);
    expect(langfuse.getTraces).toHaveBeenCalledWith({ sessionId: SESSION_ID });
  });

  it("enriches each trace with hierarchy fields", async () => {
    const traces = [
      {
        id: "t1",
        userId: "u1",
        sessionId: SESSION_ID,
        latency: 0.5,
        metadata: { tenant_id: "acme", system: "billing", agent: "bot" }
      }
    ];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute(SESSION_ID);
    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]?.id).toBe("t1");
    expect(result.traces[0]?.latency).toBe(0.5); // original field preserved
    expect(result.traces[0]?.hierarchy).toEqual({
      tenantId: "acme",
      system: "billing",
      agent: "bot",
      userId: "u1",
      sessionId: SESSION_ID
    });
  });

  it("preserves the order of traces returned by Langfuse", async () => {
    const traces = [
      { id: "t1", metadata: { agent: "bot" } },
      { id: "t2", metadata: { agent: "bot" } },
      { id: "t3", metadata: { agent: "bot" } }
    ];
    const { useCase } = makeUseCase({ tracesImpl: () => Promise.resolve(traces) });
    const result = await useCase.execute(SESSION_ID);
    expect(result.traces.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });

  it("strips Langfuse-embedded traces from session to avoid duplication", async () => {
    const sessionWithEmbeddedTraces = {
      id: SESSION_ID,
      createdAt: "2026-06-13T00:00:00Z",
      projectId: "arius-observatory",
      traces: [
        { id: "embedded-t1", projectId: "x" },
        { id: "embedded-t2", projectId: "x" }
      ]
    };
    const { useCase } = makeUseCase({
      sessionImpl: () => Promise.resolve(sessionWithEmbeddedTraces),
      tracesImpl: () =>
        Promise.resolve([{ id: "real-t1", metadata: { agent: "bot" } }])
    });
    const result = await useCase.execute(SESSION_ID);
    expect(result.session["traces"]).toBeUndefined();
    expect(result.session["id"]).toBe(SESSION_ID);
    expect(result.session["projectId"]).toBe("arius-observatory");
    expect(result.traces).toHaveLength(1);
    expect(result.traces[0]?.id).toBe("real-t1");
  });
});
