import { Module } from "@nestjs/common";

import { ProcessHeartbeatUseCase } from "./application/use-cases/process-heartbeat.use-case";
import { RegisterAgentUseCase } from "./application/use-cases/register-agent.use-case";
import { AgentsController } from "./presentation/controllers/agents.controller";

@Module({
  controllers: [AgentsController],
  providers: [RegisterAgentUseCase, ProcessHeartbeatUseCase]
})
export class AgentsModule {}
