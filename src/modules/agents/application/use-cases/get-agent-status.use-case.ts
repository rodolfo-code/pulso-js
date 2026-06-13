import { Injectable } from "@nestjs/common";

import type { AgentStatusViewDto } from "@/modules/agents/application/dtos/agent-status-view.dto";
import { GetAgentUseCase } from "@/modules/agents/application/use-cases/get-agent.use-case";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

@Injectable()
export class GetAgentStatusUseCase {
  constructor(
    private readonly getAgent: GetAgentUseCase,
    private readonly cbRepo: ICircuitBreakerRepo
  ) {}

  async execute(slug: string): Promise<AgentStatusViewDto> {
    const agent = await this.getAgent.execute(slug);
    const circuitBreakers = await this.cbRepo.listByAgent(agent.id);
    return {
      slug: agent.slug,
      status: agent.status,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      circuitBreakers
    };
  }
}