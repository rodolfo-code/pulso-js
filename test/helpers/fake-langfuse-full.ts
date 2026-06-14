import { vi } from "vitest";

import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

export class FakeLangfuseClientFull extends ILangfuseClient {
  getHealth = vi.fn<ILangfuseClient["getHealth"]>(() =>
    Promise.resolve({ status: "ok", version: "1.0.0" })
  );

  getTraces = vi.fn<ILangfuseClient["getTraces"]>(() => Promise.resolve([]));
  getTrace = vi.fn<ILangfuseClient["getTrace"]>(() =>
    Promise.reject(new Error("getTrace mock not set"))
  );
  getTraceObservations = vi.fn<ILangfuseClient["getTraceObservations"]>(() =>
    Promise.resolve([])
  );

  getSessions = vi.fn<ILangfuseClient["getSessions"]>(() => Promise.resolve([]));
  getSession = vi.fn<ILangfuseClient["getSession"]>(() =>
    Promise.reject(new Error("getSession mock not set"))
  );

  getScores = vi.fn<ILangfuseClient["getScores"]>(() => Promise.resolve([]));
  createScore = vi.fn<ILangfuseClient["createScore"]>(() =>
    Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" })
  );

  getMetricsDaily = vi.fn<ILangfuseClient["getMetricsDaily"]>(() =>
    Promise.resolve({ data: [] })
  );

  getPrompts = vi.fn<ILangfuseClient["getPrompts"]>(() => Promise.resolve([]));
  getPrompt = vi.fn<ILangfuseClient["getPrompt"]>(() =>
    Promise.reject(new Error("getPrompt mock not set"))
  );
  createPrompt = vi.fn<ILangfuseClient["createPrompt"]>(() =>
    Promise.reject(new Error("createPrompt mock not set"))
  );
  deletePrompt = vi.fn<ILangfuseClient["deletePrompt"]>(() => Promise.resolve());

  getScoreConfigs = vi.fn<ILangfuseClient["getScoreConfigs"]>(() =>
    Promise.resolve([])
  );
  createScoreConfig = vi.fn<ILangfuseClient["createScoreConfig"]>(() =>
    Promise.reject(new Error("createScoreConfig mock not set"))
  );

  getDatasets = vi.fn<ILangfuseClient["getDatasets"]>(() => Promise.resolve([]));
  createDataset = vi.fn<ILangfuseClient["createDataset"]>(() =>
    Promise.reject(new Error("createDataset mock not set"))
  );
  getDatasetItems = vi.fn<ILangfuseClient["getDatasetItems"]>(() =>
    Promise.resolve([])
  );
  createDatasetItem = vi.fn<ILangfuseClient["createDatasetItem"]>(() =>
    Promise.reject(new Error("createDatasetItem mock not set"))
  );

  resetAll(): void {
    this.getHealth.mockClear();
    this.getTraces.mockClear();
    this.getTrace.mockClear();
    this.getTraceObservations.mockClear();
    this.getSessions.mockClear();
    this.getSession.mockClear();
    this.getScores.mockClear();
    this.createScore.mockClear();
    this.getMetricsDaily.mockClear();
    this.getPrompts.mockClear();
    this.getPrompt.mockClear();
    this.createPrompt.mockClear();
    this.deletePrompt.mockClear();
    this.getScoreConfigs.mockClear();
    this.createScoreConfig.mockClear();
    this.getDatasets.mockClear();
    this.createDataset.mockClear();
    this.getDatasetItems.mockClear();
    this.createDatasetItem.mockClear();
  }
}