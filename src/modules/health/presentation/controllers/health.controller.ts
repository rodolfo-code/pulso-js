import { Controller, Get, HttpStatus, Res } from "@nestjs/common";
import type { Response } from "express";

import { CheckSystemHealthUseCase } from "../../application/use-cases/check-system-health.use-case";
import { HealthCheckResponseDto } from "../dto/health-check-response.dto";

@Controller("/health")
export class HealthController {
  constructor(private readonly checkHealth: CheckSystemHealthUseCase) {}

  @Get()
  async getHealth(@Res({ passthrough: true }) res: Response): Promise<HealthCheckResponseDto> {
    const result = await this.checkHealth.execute();

    if (result.isUnavailable()) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: result.status,
      dependencies: {
        postgresql: result.postgresql,
        langfuse: result.langfuse
      },
      timestamp: result.timestamp
    };
  }
}