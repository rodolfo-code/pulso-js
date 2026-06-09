import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import type { EnvConfig } from "@/shared/config/env.config";
import { PrismaClient } from "@prisma-client/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly pingPool: Pool;

  constructor(config: ConfigService<EnvConfig, true>) {
    const connectionString = config.getOrThrow<string>("databaseUrl");
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
    this.pingPool = new Pool({ connectionString, max: 1, idleTimeoutMillis: 1000 });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Prisma connected to database");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    await this.pingPool.end();
    this.logger.log("Prisma disconnected from database");
  }

  async ping(): Promise<void> {
    await this.pingPool.query("SELECT 1");
  }
}