import { Module } from "@nestjs/common";

import { CheckSystemHealthUseCase } from "./application/use-cases/check-system-health.use-case";
import { HealthController } from "./presentation/controllers/health.controller";

@Module({
  controllers: [HealthController],
  providers: [CheckSystemHealthUseCase]
})
export class HealthModule {}