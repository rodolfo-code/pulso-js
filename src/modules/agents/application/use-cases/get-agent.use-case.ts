import { Injectable } from "@nestjs/common";

import type { Agent } from "@/shared/domain/entities/agent.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

@Injectable()
export class GetAgentUseCase {
  constructor(private readonly agentRepo: IAgentRepo) {}

  async execute(slug: string): Promise<Agent> {
    const agent = await this.agentRepo.getAgentBySlug(slug);
    if (agent === null) {
      throw new DomainNotFoundError(`Agent not found: ${slug}`);
    }
    return agent;
  }
}
