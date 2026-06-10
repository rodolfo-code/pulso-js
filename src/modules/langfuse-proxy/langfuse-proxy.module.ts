import { Module } from "@nestjs/common";

import { CreatePromptUseCase } from "./application/use-cases/create-prompt.use-case";
import { CreateScoreConfigUseCase } from "./application/use-cases/create-score-config.use-case";
import { WriteScoreUseCase } from "./application/use-cases/write-score.use-case";
import { LangfuseController } from "./presentation/controllers/langfuse.controller";

@Module({
  controllers: [LangfuseController],
  providers: [WriteScoreUseCase, CreatePromptUseCase, CreateScoreConfigUseCase]
})
export class LangfuseProxyModule {}
