import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvConfig } from "@/shared/config/env.config";

import { LangfuseTimeoutError } from "./errors/langfuse-timeout.error";
import { LangfuseUnavailableError } from "./errors/langfuse-unavailable.error";
import { LangfuseUpstreamError } from "./errors/langfuse-upstream.error";
import {
  ILangfuseClient,
  type LangfuseEntity,
  type LangfuseFilters,
  type LangfuseList
} from "./interfaces/langfuse-client.interface";

const TIMEOUT_MS = 30_000;

interface RequestOptions {
  query?: LangfuseFilters;
  body?: unknown;
  withAuth?: boolean;
}

@Injectable()
export class LangfuseHttpClient extends ILangfuseClient {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(config: ConfigService<EnvConfig, true>) {
    super();
    this.baseUrl = config.getOrThrow<string>("langfuseBaseUrl");
    const publicKey = config.getOrThrow<string>("langfusePublicKey");
    const secretKey = config.getOrThrow<string>("langfuseSecretKey");
    const credentials = Buffer.from(`${publicKey}:${secretKey}`, "utf8").toString("base64");
    this.authHeader = `Basic ${credentials}`;
  }

  // ── Health ─────────────────────────────────────────────────────────
  async getHealth(): Promise<void> {
    await this.request("GET", "/api/public/health", { withAuth: false });
  }

  // ── Traces ─────────────────────────────────────────────────────────
  async getTraces(filters?: LangfuseFilters): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>(
      "GET",
      "/api/public/traces",
      { query: filters }
    );
    return response.data ?? [];
  }

  async getTrace(traceId: string): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("GET", `/api/public/traces/${traceId}`);
  }

  async getTraceObservations(traceId: string): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>(
      "GET",
      "/api/public/observations",
      { query: { traceId } }
    );
    return response.data ?? [];
  }

  // ── Sessions ───────────────────────────────────────────────────────
  async getSessions(filters?: LangfuseFilters): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>(
      "GET",
      "/api/public/sessions",
      { query: filters }
    );
    return response.data ?? [];
  }

  async getSession(sessionId: string): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("GET", `/api/public/sessions/${sessionId}`);
  }

  // ── Scores ─────────────────────────────────────────────────────────
  async getScores(filters?: LangfuseFilters): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>(
      "GET",
      "/api/public/scores",
      { query: filters }
    );
    return response.data ?? [];
  }

  async createScore(data: LangfuseEntity): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("POST", "/api/public/scores", { body: data });
  }

  // ── Metrics ────────────────────────────────────────────────────────
  async getMetricsDaily(filters?: LangfuseFilters): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("GET", "/api/public/metrics/daily", { query: filters });
  }

  // ── Prompts ────────────────────────────────────────────────────────
  async getPrompts(): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>("GET", "/api/public/prompts");
    return response.data ?? [];
  }

  async getPrompt(name: string): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("GET", `/api/public/prompts/${encodeURIComponent(name)}`);
  }

  async createPrompt(data: LangfuseEntity): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("POST", "/api/public/prompts", { body: data });
  }

  async deletePrompt(name: string): Promise<void> {
    await this.request("DELETE", `/api/public/prompts/${encodeURIComponent(name)}`);
  }

  // ── Score Configs ──────────────────────────────────────────────────
  async getScoreConfigs(): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>("GET", "/api/public/score-configs");
    return response.data ?? [];
  }

  async createScoreConfig(data: LangfuseEntity): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("POST", "/api/public/score-configs", { body: data });
  }

  // ── Datasets ───────────────────────────────────────────────────────
  async getDatasets(): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>("GET", "/api/public/datasets");
    return response.data ?? [];
  }

  async createDataset(data: LangfuseEntity): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>("POST", "/api/public/datasets", { body: data });
  }

  async getDatasetItems(name: string): Promise<LangfuseList> {
    const response = await this.request<{ data?: LangfuseList }>(
      "GET",
      `/api/public/datasets/${encodeURIComponent(name)}/items`
    );
    return response.data ?? [];
  }

  async createDatasetItem(name: string, data: LangfuseEntity): Promise<LangfuseEntity> {
    return this.request<LangfuseEntity>(
      "POST",
      `/api/public/datasets/${encodeURIComponent(name)}/items`,
      { body: data }
    );
  }

  // ── HTTP helper privado ────────────────────────────────────────────
  private async request<T = unknown>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { query, body, withAuth = true } = options;

    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const v of value) url.searchParams.append(key, String(v));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {};
    if (withAuth) headers["Authorization"] = this.authHeader;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new LangfuseTimeoutError(error);
      }
      throw new LangfuseUnavailableError(error);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 500) {
      throw new LangfuseUnavailableError();
    }

    if (response.status >= 400) {
      const contentType = response.headers.get("content-type") ?? "";
      const errorBody: unknown = contentType.includes("application/json")
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => undefined);
      throw new LangfuseUpstreamError(response.status, errorBody);
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
