import { Injectable, Logger } from "@nestjs/common";

import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { HealthCheckResult } from "../../domain/value-objects/health-check-result.vo";

@Injectable()
export class CheckSystemHealthUseCase {
  private readonly logger = new Logger(CheckSystemHealthUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly langfuse: ILangfuseClient
  ) {}

  async execute(): Promise<HealthCheckResult> {
    const [postgresqlOk, langfuseOk] = await Promise.all([
      this.checkPostgresql(),
      this.checkLangfuse()
    ]);

    const timestamp = new Date().toISOString();

    if (!postgresqlOk) {
      return new HealthCheckResult(
        "unavailable",
        "unavailable",
        langfuseOk ? "ok" : "unavailable",
        timestamp
      );
    }

    return new HealthCheckResult(
      langfuseOk ? "ok" : "degraded",
      "ok",
      langfuseOk ? "ok" : "unavailable",
      timestamp
    );
  }

  private async checkPostgresql(): Promise<boolean> {
    try {
      await this.prisma.ping();
      return true;
    } catch (error) {
      this.logger.warn("PostgreSQL health check failed", error instanceof Error ? error.stack : String(error));
      return false;
    }
  }

  private async checkLangfuse(): Promise<boolean> {
    try {
      await this.langfuse.getHealth();
      return true;
    } catch (error) {
      this.logger.warn("Langfuse health check failed", error instanceof Error ? error.stack : String(error));
      return false;
    }
  }
}