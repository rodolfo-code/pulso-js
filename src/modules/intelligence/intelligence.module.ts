import { Module } from "@nestjs/common";

import { ComputeHealthScoreUseCase } from "./application/use-cases/compute-health-score.use-case";
import { IntelligenceController } from "./presentation/controllers/intelligence.controller";

@Module({
  controllers: [IntelligenceController],
  providers: [ComputeHealthScoreUseCase]
})
export class IntelligenceModule {}
