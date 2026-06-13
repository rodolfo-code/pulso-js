import { Injectable } from "@nestjs/common";

import { GetAgentUseCase } from "@/modules/agents/application/use-cases/get-agent.use-case";
import type { CircuitBreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

@Injectable()
export class ListAgentCircuitBreakersUseCase {
  constructor(
    private readonly getAgent: GetAgentUseCase,
    private readonly cbRepo: ICircuitBreakerRepo
  ) {}

  async execute(slug: string): Promise<CircuitBreakerState[]> {
    const agent = await this.getAgent.execute(slug);
    return this.cbRepo.listByAgent(agent.id);
  }
}
