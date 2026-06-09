import { Module } from "@nestjs/common";

import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./shared/auth/auth.module";
import { ConfigModule } from "./shared/config/config.module";
import { HttpModule } from "./shared/http/http.module";
import { LangfuseClientModule } from "./shared/langfuse-client/langfuse-client.module";
import { PrismaModule } from "./shared/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    HttpModule,
    LangfuseClientModule,
    HealthModule
  ]
})
export class AppModule {}