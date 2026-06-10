import { vi } from "vitest";

import {
  ILangfuseClient,
  type LangfuseEntity,
  type LangfuseList
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

export class FakeLangfuseClientFull extends ILangfuseClient {
  getHealth = vi.fn<() => Promise<LangfuseEntity>>(() =>
    Promise.resolve({ status: "ok" })
  );

  getTraces = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  getTrace = vi.fn<() => Promise<LangfuseEntity>>(() => Promise.resolve({}));
  getTraceObservations = vi.fn<() => Promise<LangfuseList>>(() =>
    Promise.resolve([])
  );

  getSessions = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  getSession = vi.fn<() => Promise<LangfuseEntity>>(() => Promise.resolve({}));

  getScores = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  createScore = vi.fn<() => Promise<LangfuseEntity>>(() =>
    Promise.resolve({ id: "00000000-0000-4000-8000-000000000001" })
  );

  getMetricsDaily = vi.fn<() => Promise<LangfuseEntity>>(() =>
    Promise.resolve({})
  );

  getPrompts = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  getPrompt = vi.fn<() => Promise<LangfuseEntity>>(() => Promise.resolve({}));
  createPrompt = vi.fn<() => Promise<LangfuseEntity>>(() =>
    Promise.resolve({ id: "00000000-0000-4000-8000-000000000002" })
  );
  deletePrompt = vi.fn<() => Promise<void>>(() => Promise.resolve());

  getScoreConfigs = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  createScoreConfig = vi.fn<() => Promise<LangfuseEntity>>(() =>
    Promise.resolve({ id: "00000000-0000-4000-8000-000000000003" })
  );

  getDatasets = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  createDataset = vi.fn<() => Promise<LangfuseEntity>>(() => Promise.resolve({}));
  getDatasetItems = vi.fn<() => Promise<LangfuseList>>(() => Promise.resolve([]));
  createDatasetItem = vi.fn<() => Promise<LangfuseEntity>>(() =>
    Promise.resolve({})
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
