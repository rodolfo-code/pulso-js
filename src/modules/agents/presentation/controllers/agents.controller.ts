import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from "@nestjs/common";

import { ProcessHeartbeatUseCase } from "@/modules/agents/application/use-cases/process-heartbeat.use-case";
import { RegisterAgentUseCase } from "@/modules/agents/application/use-cases/register-agent.use-case";
import { HeartbeatBody } from "@/modules/agents/presentation/dtos/heartbeat.body";
import { RegisterAgentBody } from "@/modules/agents/presentation/dtos/register-agent.body";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { CircuitBreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

interface AgentStatusResponse {
  slug: string;
  status: Agent["status"];
  lastHeartbeatAt: Date | null;
  circuitBreakers: CircuitBreakerState[];
}

@Controller("agents")
export class AgentsController {
  constructor(
    private readonly registerAgent: RegisterAgentUseCase,
    private readonly processHeartbeat: ProcessHeartbeatUseCase,
    private readonly agentRepo: IAgentRepo,
    private readonly cbRepo: ICircuitBreakerRepo
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
    return this.agentRepo.listAgents();
  }

  @Get(":slug/circuit-breakers")
  async listCircuitBreakers(@Param("slug") slug: string): Promise<CircuitBreakerState[]> {
    const agent = await this.requireAgent(slug);
    return this.cbRepo.listByAgent(agent.id);
  }

  @Get(":slug/status")
  async getStatus(@Param("slug") slug: string): Promise<AgentStatusResponse> {
    const agent = await this.requireAgent(slug);
    const circuitBreakers = await this.cbRepo.listByAgent(agent.id);
    return {
      slug: agent.slug,
      status: agent.status,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      circuitBreakers
    };
  }

  @Get(":slug")
  getOne(@Param("slug") slug: string): Promise<Agent> {
    return this.requireAgent(slug);
  }

  private async requireAgent(slug: string): Promise<Agent> {
    const agent = await this.agentRepo.getAgentBySlug(slug);
    if (agent === null) {
      throw new DomainNotFoundError(`Agent not found: ${slug}`);
    }
    return agent;
  }
}
