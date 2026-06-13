import { Injectable } from "@nestjs/common";

import type { Agent } from "@/shared/domain/entities/agent.entity";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

@Injectable()
export class ListAgentsUseCase {
  constructor(private readonly agentRepo: IAgentRepo) {}

  execute(): Promise<Agent[]> {
    return this.agentRepo.listAgents();
  }
}
