import { Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";

import { AgentsModule } from "./modules/agents/agents.module";
import { HealthModule } from "./modules/health/health.module";
import { LangfuseProxyModule } from "./modules/langfuse-proxy/langfuse-proxy.module";
import { AuthModule } from "./shared/auth/auth.module";
import { ConfigModule } from "./shared/config/config.module";
import { HttpModule } from "./shared/http/http.module";
import { LangfuseClientModule } from "./shared/langfuse-client/langfuse-client.module";
import { PrismaModule } from "./shared/prisma/prisma.module";
import { RepositoriesModule } from "./shared/repositories/repositories.module";

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    HttpModule,
    LangfuseClientModule,
    RepositoriesModule,
    HealthModule,
    LangfuseProxyModule,
    AgentsModule
  ],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: false,
        forbidNonWhitelisted: false
      })
    }
  ]
})
export class AppModule {}