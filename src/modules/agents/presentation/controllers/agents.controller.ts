import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";

import type { AgentStatusViewDto } from "@/modules/agents/application/dtos/agent-status-view.dto";
import { GetAgentStatusUseCase } from "@/modules/agents/application/use-cases/get-agent-status.use-case";
import { GetAgentUseCase } from "@/modules/agents/application/use-cases/get-agent.use-case";
import { ListAgentCircuitBreakersUseCase } from "@/modules/agents/application/use-cases/list-agent-circuit-breakers.use-case";
import { ListAgentsUseCase } from "@/modules/agents/application/use-cases/list-agents.use-case";
import { ProcessHeartbeatUseCase } from "@/modules/agents/application/use-cases/process-heartbeat.use-case";
import { RegisterAgentUseCase } from "@/modules/agents/application/use-cases/register-agent.use-case";
import { HeartbeatBody } from "@/modules/agents/presentation/dtos/heartbeat.body";
import { RegisterAgentBody } from "@/modules/agents/presentation/dtos/register-agent.body";
import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { CircuitBreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";

@Controller("agents")
export class AgentsController {
  constructor(
    private readonly registerAgent: RegisterAgentUseCase,
    private readonly processHeartbeat: ProcessHeartbeatUseCase,
    private readonly listAgentsUseCase: ListAgentsUseCase,
    private readonly getAgentUseCase: GetAgentUseCase,
    private readonly getAgentStatus: GetAgentStatusUseCase,
    private readonly listAgentCircuitBreakers: ListAgentCircuitBreakersUseCase
  ) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterAgentBody): Promise<Agent> {
    return this.registerAgent.execute({
      slug: body.slug,
      name: body.name,
      description: body.description ?? "",
      version: body.version,
      baseUrl: body.baseUrl,
      tenantSlug: body.tenantSlug,
      systemSlug: body.systemSlug
    });
  }

  @Post(":slug/heartbeat")
  heartbeat(@Param("slug") slug: string, @Body() body: HeartbeatBody): Promise<Agent> {
    return this.processHeartbeat.execute(slug, {
      version: body.version,
      errorCount: body.errorCount,
      circuitBreakers: body.circuitBreakers?.map((cb) => ({
        name: cb.name,
        state: cb.state,
        failCount: cb.failCount,
        lastStateChange: cb.lastStateChange ?? null
      }))
    });
  }

  @Get()
  list(): Promise<Agent[]> {
    return this.listAgentsUseCase.execute();
  }

  @Get(":slug/circuit-breakers")
  listCircuitBreakers(@Param("slug") slug: string): Promise<CircuitBreakerState[]> {
    return this.listAgentCircuitBreakers.execute(slug);
  }

  @Get(":slug/status")
  getStatus(@Param("slug") slug: string): Promise<AgentStatusViewDto> {
    return this.getAgentStatus.execute(slug);
  }

  @Get(":slug")
  getOne(@Param("slug") slug: string): Promise<Agent> {
    return this.getAgentUseCase.execute(slug);
  }
}
