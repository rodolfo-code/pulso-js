import { Module } from "@nestjs/common";

import { CreateSLOUseCase } from "./application/use-cases/create-slo.use-case";
import { EvaluateSLOUseCase } from "./application/use-cases/evaluate-slo.use-case";
import { SLOsController } from "./presentation/controllers/slos.controller";

@Module({
  controllers: [SLOsController],
  providers: [CreateSLOUseCase, EvaluateSLOUseCase]
})
export class SLOsModule {}
