import type {
  ApiCreateDatasetItemRequest,
  ApiCreateDatasetRequest,
  ApiCreatePromptRequest,
  ApiCreateScoreConfigRequest,
  ApiCreateScoreRequest,
  ApiCreateScoreResponse,
  ApiDataset,
  ApiDatasetItem,
  ApiGetScoresResponseData,
  ApiHealthResponse,
  ApiMetricsResponse,
  ApiObservation,
  ApiPrompt,
  ApiPromptMeta,
  ApiScoreConfig,
  ApiSession,
  ApiSessionWithTraces,
  ApiTraceWithDetails,
  ApiTraceWithFullDetails
} from "langfuse";

export type LangfuseFilters = Record<string, string | string[] | number | boolean | undefined>;

export abstract class ILangfuseClient {
  // Health
  abstract getHealth(): Promise<ApiHealthResponse>;

  // Traces
  abstract getTraces(filters?: LangfuseFilters): Promise<ApiTraceWithDetails[]>;
  abstract getTrace(traceId: string): Promise<ApiTraceWithFullDetails>;
  abstract getTraceObservations(traceId: string): Promise<ApiObservation[]>;

  // Sessions
  abstract getSessions(filters?: LangfuseFilters): Promise<ApiSession[]>;
  abstract getSession(sessionId: string): Promise<ApiSessionWithTraces>;

  // Scores
  abstract getScores(filters?: LangfuseFilters): Promise<ApiGetScoresResponseData[]>;
  abstract createScore(data: ApiCreateScoreRequest): Promise<ApiCreateScoreResponse>;

  // Metrics
  abstract getMetricsDaily(filters?: LangfuseFilters): Promise<ApiMetricsResponse>;

  // Prompts
  abstract getPrompts(): Promise<ApiPromptMeta[]>;
  abstract getPrompt(name: string): Promise<ApiPrompt>;
  abstract createPrompt(data: ApiCreatePromptRequest): Promise<ApiPrompt>;
  abstract deletePrompt(name: string): Promise<void>;

  // Score Configs
  abstract getScoreConfigs(): Promise<ApiScoreConfig[]>;
  abstract createScoreConfig(data: ApiCreateScoreConfigRequest): Promise<ApiScoreConfig>;

  // Datasets
  abstract getDatasets(): Promise<ApiDataset[]>;
  abstract createDataset(data: ApiCreateDatasetRequest): Promise<ApiDataset>;
  abstract getDatasetItems(name: string): Promise<ApiDatasetItem[]>;
  abstract createDatasetItem(
    name: string,
    data: ApiCreateDatasetItemRequest
  ): Promise<ApiDatasetItem>;
}