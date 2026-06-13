import { Module } from "@nestjs/common";

import { GetAgentStatusUseCase } from "./application/use-cases/get-agent-status.use-case";
import { GetAgentUseCase } from "./application/use-cases/get-agent.use-case";
import { ListAgentCircuitBreakersUseCase } from "./application/use-cases/list-agent-circuit-breakers.use-case";
import { ListAgentsUseCase } from "./application/use-cases/list-agents.use-case";
import { ProcessHeartbeatUseCase } from "./application/use-cases/process-heartbeat.use-case";
import { RegisterAgentUseCase } from "./application/use-cases/register-agent.use-case";
import { AgentsController } from "./presentation/controllers/agents.controller";

@Module({
  controllers: [AgentsController],
  providers: [
    RegisterAgentUseCase,
    ProcessHeartbeatUseCase,
    ListAgentsUseCase,
    GetAgentUseCase,
    GetAgentStatusUseCase,
    ListAgentCircuitBreakersUseCase
  ]
})
export class AgentsModule {}
