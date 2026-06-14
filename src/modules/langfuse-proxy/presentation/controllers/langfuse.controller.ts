import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query
} from "@nestjs/common";
import type {
  ApiCreateDatasetItemRequest,
  ApiCreateDatasetRequest
} from "langfuse";

import type { DatasetItemDto } from "@/modules/langfuse-proxy/application/dtos/dataset-item.dto";
import type { DatasetDto } from "@/modules/langfuse-proxy/application/dtos/dataset.dto";
import type { LangfuseHealthDto } from "@/modules/langfuse-proxy/application/dtos/langfuse-health.dto";
import type { MetricsDailyDto } from "@/modules/langfuse-proxy/application/dtos/metrics-daily.dto";
import type { ObservationDto } from "@/modules/langfuse-proxy/application/dtos/observation.dto";
import type { PromptMetaDto } from "@/modules/langfuse-proxy/application/dtos/prompt-meta.dto";
import type { PromptDto } from "@/modules/langfuse-proxy/application/dtos/prompt.dto";
import type { ScoreConfigDto } from "@/modules/langfuse-proxy/application/dtos/score-config.dto";
import type { ScoreDto } from "@/modules/langfuse-proxy/application/dtos/score.dto";
import type { SessionDto } from "@/modules/langfuse-proxy/application/dtos/session.dto";
import type { TraceDto } from "@/modules/langfuse-proxy/application/dtos/trace.dto";
import { CreateDatasetItemUseCase } from "@/modules/langfuse-proxy/application/use-cases/create-dataset-item.use-case";
import { CreateDatasetUseCase } from "@/modules/langfuse-proxy/application/use-cases/create-dataset.use-case";
import {
  CreatePromptUseCase,
  type CreatePromptRequest
} from "@/modules/langfuse-proxy/application/use-cases/create-prompt.use-case";
import {
  CreateScoreConfigUseCase,
  type CreateScoreConfigRequest
} from "@/modules/langfuse-proxy/application/use-cases/create-score-config.use-case";
import { DeletePromptUseCase } from "@/modules/langfuse-proxy/application/use-cases/delete-prompt.use-case";
import { GetLangfuseHealthUseCase } from "@/modules/langfuse-proxy/application/use-cases/get-langfuse-health.use-case";
import { GetMetricsDailyUseCase } from "@/modules/langfuse-proxy/application/use-cases/get-metrics-daily.use-case";
import { GetPromptUseCase } from "@/modules/langfuse-proxy/application/use-cases/get-prompt.use-case";
import { GetSessionUseCase } from "@/modules/langfuse-proxy/application/use-cases/get-session.use-case";
import { GetTraceUseCase } from "@/modules/langfuse-proxy/application/use-cases/get-trace.use-case";
import { ListDatasetItemsUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-dataset-items.use-case";
import { ListDatasetsUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-datasets.use-case";
import { ListPromptsUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-prompts.use-case";
import { ListScoreConfigsUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-score-configs.use-case";
import { ListScoresUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-scores.use-case";
import { ListSessionsUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-sessions.use-case";
import { ListTraceObservationsUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-trace-observations.use-case";
import { ListTracesUseCase } from "@/modules/langfuse-proxy/application/use-cases/list-traces.use-case";
import { WriteScoreUseCase } from "@/modules/langfuse-proxy/application/use-cases/write-score.use-case";
import { CreatePromptBody } from "@/modules/langfuse-proxy/presentation/dtos/create-prompt.body";
import { CreateScoreConfigBody } from "@/modules/langfuse-proxy/presentation/dtos/create-score-config.body";
import { WriteScoreBody } from "@/modules/langfuse-proxy/presentation/dtos/write-score.body";
import type { LangfuseFilters } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Controller("langfuse")
export class LangfuseController {
  constructor(
    private readonly getHealthUseCase: GetLangfuseHealthUseCase,
    private readonly listTracesUseCase: ListTracesUseCase,
    private readonly getTraceUseCase: GetTraceUseCase,
    private readonly listTraceObservationsUseCase: ListTraceObservationsUseCase,
    private readonly listSessionsUseCase: ListSessionsUseCase,
    private readonly getSessionUseCase: GetSessionUseCase,
    private readonly listScoresUseCase: ListScoresUseCase,
    private readonly writeScoreUseCase: WriteScoreUseCase,
    private readonly getMetricsDailyUseCase: GetMetricsDailyUseCase,
    private readonly listPromptsUseCase: ListPromptsUseCase,
    private readonly createPromptUseCase: CreatePromptUseCase,
    private readonly getPromptUseCase: GetPromptUseCase,
    private readonly deletePromptUseCase: DeletePromptUseCase,
    private readonly listScoreConfigsUseCase: ListScoreConfigsUseCase,
    private readonly createScoreConfigUseCase: CreateScoreConfigUseCase,
    private readonly listDatasetsUseCase: ListDatasetsUseCase,
    private readonly createDatasetUseCase: CreateDatasetUseCase,
    private readonly listDatasetItemsUseCase: ListDatasetItemsUseCase,
    private readonly createDatasetItemUseCase: CreateDatasetItemUseCase
  ) {}

  // ── Health ──────────────────────────────────────────────────────────
  @Get("health")
  getHealth(): Promise<LangfuseHealthDto> {
    return this.getHealthUseCase.execute();
  }

  // ── Traces ──────────────────────────────────────────────────────────
  @Get("traces")
  listTraces(@Query() filters: LangfuseFilters): Promise<TraceDto[]> {
    return this.listTracesUseCase.execute(filters);
  }

  @Get("traces/:traceId/observations")
  getTraceObservations(@Param("traceId") traceId: string): Promise<ObservationDto[]> {
    return this.listTraceObservationsUseCase.execute(traceId);
  }

  @Get("traces/:traceId")
  getTrace(@Param("traceId") traceId: string): Promise<TraceDto> {
    return this.getTraceUseCase.execute(traceId);
  }

  // ── Sessions ────────────────────────────────────────────────────────
  @Get("sessions")
  listSessions(@Query() filters: LangfuseFilters): Promise<SessionDto[]> {
    return this.listSessionsUseCase.execute(filters);
  }

  @Get("sessions/:sessionId")
  getSession(@Param("sessionId") sessionId: string): Promise<SessionDto> {
    return this.getSessionUseCase.execute(sessionId);
  }

  // ── Scores ──────────────────────────────────────────────────────────
  @Get("scores")
  listScores(@Query() filters: LangfuseFilters): Promise<ScoreDto[]> {
    return this.listScoresUseCase.execute(filters);
  }

  @Post("scores")
  createScore(@Body() body: WriteScoreBody): Promise<ScoreDto> {
    return this.writeScoreUseCase.execute({
      traceId: body.traceId,
      name: body.name,
      value: body.value,
      comment: body.comment
    });
  }

  // ── Metrics ─────────────────────────────────────────────────────────
  @Get("metrics/daily")
  getMetricsDaily(@Query() filters: LangfuseFilters): Promise<MetricsDailyDto> {
    return this.getMetricsDailyUseCase.execute(filters);
  }

  // ── Prompts ─────────────────────────────────────────────────────────
  @Get("prompts")
  listPrompts(): Promise<PromptMetaDto[]> {
    return this.listPromptsUseCase.execute();
  }

  @Post("prompts")
  createPromptRoute(
    @Body() body: CreatePromptBody & Record<string, unknown>
  ): Promise<PromptDto> {
    return this.createPromptUseCase.execute(body as CreatePromptRequest);
  }

  @Get("prompts/*path")
  getPrompt(@Param("path") path: string | string[]): Promise<PromptDto> {
    return this.getPromptUseCase.execute(this.joinPath(path));
  }

  @Delete("prompts/*path")
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePrompt(@Param("path") path: string | string[]): Promise<void> {
    return this.deletePromptUseCase.execute(this.joinPath(path));
  }

  // ── Score Configs ───────────────────────────────────────────────────
  @Get("score-configs")
  listScoreConfigs(): Promise<ScoreConfigDto[]> {
    return this.listScoreConfigsUseCase.execute();
  }

  @Post("score-configs")
  createScoreConfigRoute(
    @Body() body: CreateScoreConfigBody & Record<string, unknown>
  ): Promise<ScoreConfigDto> {
    return this.createScoreConfigUseCase.execute(body as CreateScoreConfigRequest);
  }

  // ── Datasets ────────────────────────────────────────────────────────
  @Get("datasets")
  listDatasets(): Promise<DatasetDto[]> {
    return this.listDatasetsUseCase.execute();
  }

  @Post("datasets")
  createDataset(@Body() body: ApiCreateDatasetRequest): Promise<DatasetDto> {
    return this.createDatasetUseCase.execute(body);
  }

  @Get("datasets/:name/items")
  getDatasetItems(@Param("name") name: string): Promise<DatasetItemDto[]> {
    return this.listDatasetItemsUseCase.execute(name);
  }

  @Post("datasets/:name/items")
  createDatasetItem(
    @Param("name") name: string,
    @Body() body: ApiCreateDatasetItemRequest
  ): Promise<DatasetItemDto> {
    return this.createDatasetItemUseCase.execute(name, body);
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private joinPath(path: string | string[]): string {
    return Array.isArray(path) ? path.join("/") : path;
  }
}
