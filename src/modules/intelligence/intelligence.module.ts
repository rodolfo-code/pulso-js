import { Module } from "@nestjs/common";

import { ComputeHealthScoreUseCase } from "./application/use-cases/compute-health-score.use-case";
import { ListAgentsWithHealthScoresUseCase } from "./application/use-cases/list-agents-with-health-scores.use-case";
import { IntelligenceController } from "./presentation/controllers/intelligence.controller";

@Module({
  controllers: [IntelligenceController],
  providers: [ComputeHealthScoreUseCase, ListAgentsWithHealthScoresUseCase]
})
export class IntelligenceModule {}
