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

import {
  CreatePromptUseCase,
  type CreatePromptRequest
} from "@/modules/langfuse-proxy/application/use-cases/create-prompt.use-case";
import {
  CreateScoreConfigUseCase,
  type CreateScoreConfigRequest
} from "@/modules/langfuse-proxy/application/use-cases/create-score-config.use-case";
import { WriteScoreUseCase } from "@/modules/langfuse-proxy/application/use-cases/write-score.use-case";
import { CreatePromptBody } from "@/modules/langfuse-proxy/presentation/dtos/create-prompt.body";
import { CreateScoreConfigBody } from "@/modules/langfuse-proxy/presentation/dtos/create-score-config.body";
import { WriteScoreBody } from "@/modules/langfuse-proxy/presentation/dtos/write-score.body";
import {
  ILangfuseClient,
  type LangfuseEntity,
  type LangfuseFilters,
  type LangfuseList
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Controller("langfuse")
export class LangfuseController {
  constructor(
    private readonly langfuse: ILangfuseClient,
    private readonly writeScore: WriteScoreUseCase,
    private readonly createPrompt: CreatePromptUseCase,
    private readonly createScoreConfig: CreateScoreConfigUseCase
  ) {}

  // ── Health ──────────────────────────────────────────────────────────
  @Get("health")
  health(): Promise<LangfuseEntity> {
    return this.langfuse.getHealth();
  }

  // ── Traces ──────────────────────────────────────────────────────────
  @Get("traces")
  listTraces(@Query() filters: LangfuseFilters): Promise<LangfuseList> {
    return this.langfuse.getTraces(filters);
  }

  @Get("traces/:traceId/observations")
  getTraceObservations(@Param("traceId") traceId: string): Promise<LangfuseList> {
    return this.langfuse.getTraceObservations(traceId);
  }

  @Get("traces/:traceId")
  getTrace(@Param("traceId") traceId: string): Promise<LangfuseEntity> {
    return this.langfuse.getTrace(traceId);
  }

  // ── Sessions ────────────────────────────────────────────────────────
  @Get("sessions")
  listSessions(@Query() filters: LangfuseFilters): Promise<LangfuseList> {
    return this.langfuse.getSessions(filters);
  }

  @Get("sessions/:sessionId")
  getSession(@Param("sessionId") sessionId: string): Promise<LangfuseEntity> {
    return this.langfuse.getSession(sessionId);
  }

  // ── Scores ──────────────────────────────────────────────────────────
  @Get("scores")
  listScores(@Query() filters: LangfuseFilters): Promise<LangfuseList> {
    return this.langfuse.getScores(filters);
  }

  @Post("scores")
  createScore(@Body() body: WriteScoreBody): Promise<LangfuseEntity> {
    return this.writeScore.execute({
      traceId: body.traceId,
      name: body.name,
      value: body.value,
      comment: body.comment
    });
  }

  // ── Metrics ─────────────────────────────────────────────────────────
  @Get("metrics/daily")
  getMetricsDaily(@Query() filters: LangfuseFilters): Promise<LangfuseEntity> {
    return this.langfuse.getMetricsDaily(filters);
  }

  // ── Prompts ─────────────────────────────────────────────────────────
  @Get("prompts")
  listPrompts(): Promise<LangfuseList> {
    return this.langfuse.getPrompts();
  }

  @Post("prompts")
  createPromptRoute(
    @Body() body: CreatePromptBody & Record<string, unknown>
  ): Promise<LangfuseEntity> {
    return this.createPrompt.execute(body as CreatePromptRequest);
  }

  @Get("prompts/*path")
  getPrompt(@Param("path") path: string | string[]): Promise<LangfuseEntity> {
    return this.langfuse.getPrompt(this.joinPath(path));
  }

  @Delete("prompts/*path")
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePrompt(@Param("path") path: string | string[]): Promise<void> {
    return this.langfuse.deletePrompt(this.joinPath(path));
  }

  // ── Score Configs ───────────────────────────────────────────────────
  @Get("score-configs")
  listScoreConfigs(): Promise<LangfuseList> {
    return this.langfuse.getScoreConfigs();
  }

  @Post("score-configs")
  createScoreConfigRoute(
    @Body() body: CreateScoreConfigBody & Record<string, unknown>
  ): Promise<LangfuseEntity> {
    return this.createScoreConfig.execute(body as CreateScoreConfigRequest);
  }

  // ── Datasets ────────────────────────────────────────────────────────
  @Get("datasets")
  listDatasets(): Promise<LangfuseList> {
    return this.langfuse.getDatasets();
  }

  @Post("datasets")
  createDataset(@Body() body: Record<string, unknown>): Promise<LangfuseEntity> {
    return this.langfuse.createDataset(body);
  }

  @Get("datasets/:name/items")
  getDatasetItems(@Param("name") name: string): Promise<LangfuseList> {
    return this.langfuse.getDatasetItems(name);
  }

  @Post("datasets/:name/items")
  createDatasetItem(
    @Param("name") name: string,
    @Body() body: Record<string, unknown>
  ): Promise<LangfuseEntity> {
    return this.langfuse.createDatasetItem(name, body);
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  private joinPath(path: string | string[]): string {
    return Array.isArray(path) ? path.join("/") : path;
  }
}
