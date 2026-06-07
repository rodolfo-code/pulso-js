import { Module } from "@nestjs/common";

import { HealthModule } from "./modules/health/health.module";
import { ConfigModule } from "./shared/config/config.module";
import { LangfuseClientModule } from "./shared/langfuse-client/langfuse-client.module";
import { PrismaModule } from "./shared/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    LangfuseClientModule,
    HealthModule
  ]
})
export class AppModule {}