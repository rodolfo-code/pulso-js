import { Injectable } from "@nestjs/common";

import { GetAgentUseCase } from "@/modules/agents/application/use-cases/get-agent.use-case";
import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { CircuitBreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

export interface AgentStatusView {
  slug: string;
  status: Agent["status"];
  lastHeartbeatAt: Date | null;
  circuitBreakers: CircuitBreakerState[];
}

@Injectable()
export class GetAgentStatusUseCase {
  constructor(
    private readonly getAgent: GetAgentUseCase,
    private readonly cbRepo: ICircuitBreakerRepo
  ) {}

  async execute(slug: string): Promise<AgentStatusView> {
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
