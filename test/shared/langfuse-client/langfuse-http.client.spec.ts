import type { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EnvConfig } from "@/shared/config/env.config";
import { LangfuseTimeoutError } from "@/shared/langfuse-client/errors/langfuse-timeout.error";
import { LangfuseUnavailableError } from "@/shared/langfuse-client/errors/langfuse-unavailable.error";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import { LangfuseHttpClient } from "@/shared/langfuse-client/langfuse-http.client";

const BASE_URL = "http://localhost:3000";
const PUBLIC_KEY = "pk-test";
const SECRET_KEY = "sk-test";
const EXPECTED_AUTH = `Basic ${Buffer.from(`${PUBLIC_KEY}:${SECRET_KEY}`, "utf8").toString("base64")}`;

function makeClient(): LangfuseHttpClient {
  const config = {
    getOrThrow: (key: string): string => {
      switch (key) {
        case "langfuseBaseUrl": return BASE_URL;
        case "langfusePublicKey": return PUBLIC_KEY;
        case "langfuseSecretKey": return SECRET_KEY;
        default: throw new Error(`Unknown key: ${key}`);
      }
    }
  } as unknown as ConfigService<EnvConfig, true>;
  return new LangfuseHttpClient(config);
}

interface MockResponseOpts {
  status: number;
  body?: unknown;
  contentType?: string;
}

function mockResponse({ status, body, contentType = "application/json" }: MockResponseOpts): Response {
  return {
    status,
    headers: {
      get: (header: string) => {
        if (header.toLowerCase() === "content-type") return contentType;
        if (header.toLowerCase() === "content-length") return body === undefined ? "0" : null;
        return null;
      }
    },
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body ?? ""))
  } as unknown as Response;
}

describe("LangfuseHttpClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let client: LangfuseHttpClient;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    client = makeClient();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getHealth — 204 resolves without throwing", async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 204 }));
    await expect(client.getHealth()).resolves.toBeUndefined();
  });

  it("getHealth — does NOT send Authorization header", async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 204 }));
    await client.getHealth();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("getTraces — sends Basic Auth header", async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: { data: [] } }));
    await client.getTraces();
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe(EXPECTED_AUTH);
  });

  it("getTraces — appends query params including arrays", async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: { data: [] } }));
    await client.getTraces({ userId: "joao", tags: ["a", "b"] });
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain("userId=joao");
    expect(url).toContain("tags=a");
    expect(url).toContain("tags=b");
  });

  it("getTraces — unwraps {data: [...]} envelope", async () => {
    const traces = [{ id: "t1" }, { id: "t2" }];
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: { data: traces } }));
    const result = await client.getTraces();
    expect(result).toEqual(traces);
  });

  it("network error → LangfuseUnavailableError", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(client.getTraces()).rejects.toBeInstanceOf(LangfuseUnavailableError);
  });

  it("AbortError → LangfuseTimeoutError", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    fetchMock.mockRejectedValue(abortError);
    await expect(client.getTraces()).rejects.toBeInstanceOf(LangfuseTimeoutError);
  });

  it("500 status → LangfuseUnavailableError", async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 500 }));
    await expect(client.getTraces()).rejects.toBeInstanceOf(LangfuseUnavailableError);
  });

  it("502 status → LangfuseUnavailableError", async () => {
    fetchMock.mockResolvedValue(mockResponse({ status: 502 }));
    await expect(client.getTraces()).rejects.toBeInstanceOf(LangfuseUnavailableError);
  });

  it("404 with JSON body → LangfuseUpstreamError(404, body)", async () => {
    const body = { error: "Not found" };
    fetchMock.mockResolvedValue(mockResponse({ status: 404, body }));
    try {
      await client.getTrace("missing");
      expect.fail("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(LangfuseUpstreamError);
      const e = err as LangfuseUpstreamError;
      expect(e.httpStatus).toBe(404);
      expect(e.responseBody).toEqual(body);
    }
  });

  it("400 with text body → LangfuseUpstreamError(400, text)", async () => {
    fetchMock.mockResolvedValue(
      mockResponse({ status: 400, body: "Bad request", contentType: "text/plain" })
    );
    try {
      await client.getTrace("bad");
      expect.fail("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(LangfuseUpstreamError);
      const e = err as LangfuseUpstreamError;
      expect(e.httpStatus).toBe(400);
      expect(e.responseBody).toBe("Bad request");
    }
  });

  it("createScore — sends POST with JSON body and returns response", async () => {
    const expected = { id: "abc" };
    fetchMock.mockResolvedValue(mockResponse({ status: 200, body: expected }));

    const result = await client.createScore({ traceId: "t1", name: "n", value: 0.5 });

    expect(result).toEqual(expected);
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({ traceId: "t1", name: "n", value: 0.5 });
  });
});
