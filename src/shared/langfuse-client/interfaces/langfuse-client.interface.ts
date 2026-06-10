export type LangfuseFilters = Record<string, string | string[] | number | boolean | undefined>;
export type LangfuseEntity = Record<string, unknown>;
export type LangfuseList = LangfuseEntity[];

export abstract class ILangfuseClient {
  // Health
  abstract getHealth(): Promise<LangfuseEntity>;

  // Traces
  abstract getTraces(filters?: LangfuseFilters): Promise<LangfuseList>;
  abstract getTrace(traceId: string): Promise<LangfuseEntity>;
  abstract getTraceObservations(traceId: string): Promise<LangfuseList>;

  // Sessions
  abstract getSessions(filters?: LangfuseFilters): Promise<LangfuseList>;
  abstract getSession(sessionId: string): Promise<LangfuseEntity>;

  // Scores
  abstract getScores(filters?: LangfuseFilters): Promise<LangfuseList>;
  abstract createScore(data: LangfuseEntity): Promise<LangfuseEntity>;

  // Metrics
  abstract getMetricsDaily(filters?: LangfuseFilters): Promise<LangfuseEntity>;

  // Prompts
  abstract getPrompts(): Promise<LangfuseList>;
  abstract getPrompt(name: string): Promise<LangfuseEntity>;
  abstract createPrompt(data: LangfuseEntity): Promise<LangfuseEntity>;
  abstract deletePrompt(name: string): Promise<void>;

  // Score Configs
  abstract getScoreConfigs(): Promise<LangfuseList>;
  abstract createScoreConfig(data: LangfuseEntity): Promise<LangfuseEntity>;

  // Datasets
  abstract getDatasets(): Promise<LangfuseList>;
  abstract createDataset(data: LangfuseEntity): Promise<LangfuseEntity>;
  abstract getDatasetItems(name: string): Promise<LangfuseList>;
  abstract createDatasetItem(name: string, data: LangfuseEntity): Promise<LangfuseEntity>;
}
