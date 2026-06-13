import { Module } from "@nestjs/common";

import { CreateDatasetItemUseCase } from "./application/use-cases/create-dataset-item.use-case";
import { CreateDatasetUseCase } from "./application/use-cases/create-dataset.use-case";
import { CreatePromptUseCase } from "./application/use-cases/create-prompt.use-case";
import { CreateScoreConfigUseCase } from "./application/use-cases/create-score-config.use-case";
import { DeletePromptUseCase } from "./application/use-cases/delete-prompt.use-case";
import { GetLangfuseHealthUseCase } from "./application/use-cases/get-langfuse-health.use-case";
import { GetMetricsDailyUseCase } from "./application/use-cases/get-metrics-daily.use-case";
import { GetPromptUseCase } from "./application/use-cases/get-prompt.use-case";
import { GetSessionUseCase } from "./application/use-cases/get-session.use-case";
import { GetTraceUseCase } from "./application/use-cases/get-trace.use-case";
import { ListDatasetItemsUseCase } from "./application/use-cases/list-dataset-items.use-case";
import { ListDatasetsUseCase } from "./application/use-cases/list-datasets.use-case";
import { ListPromptsUseCase } from "./application/use-cases/list-prompts.use-case";
import { ListScoreConfigsUseCase } from "./application/use-cases/list-score-configs.use-case";
import { ListScoresUseCase } from "./application/use-cases/list-scores.use-case";
import { ListSessionsUseCase } from "./application/use-cases/list-sessions.use-case";
import { ListTraceObservationsUseCase } from "./application/use-cases/list-trace-observations.use-case";
import { ListTracesUseCase } from "./application/use-cases/list-traces.use-case";
import { WriteScoreUseCase } from "./application/use-cases/write-score.use-case";
import { LangfuseController } from "./presentation/controllers/langfuse.controller";

@Module({
  controllers: [LangfuseController],
  providers: [
    GetLangfuseHealthUseCase,
    ListTracesUseCase,
    GetTraceUseCase,
    ListTraceObservationsUseCase,
    ListSessionsUseCase,
    GetSessionUseCase,
    ListScoresUseCase,
    WriteScoreUseCase,
    GetMetricsDailyUseCase,
    ListPromptsUseCase,
    CreatePromptUseCase,
    GetPromptUseCase,
    DeletePromptUseCase,
    ListScoreConfigsUseCase,
    CreateScoreConfigUseCase,
    ListDatasetsUseCase,
    CreateDatasetUseCase,
    ListDatasetItemsUseCase,
    CreateDatasetItemUseCase
  ]
})
export class LangfuseProxyModule {}
