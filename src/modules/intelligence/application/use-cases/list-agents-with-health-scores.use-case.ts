import { Injectable, Logger } from "@nestjs/common";

import { ComputeHealthScoreUseCase } from "@/modules/intelligence/application/use-cases/compute-health-score.use-case";
import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { HealthScore } from "@/shared/domain/value-objects/health-score.vo";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

export interface AgentWithHealthScore {
  agent: Agent;
  healthScore: HealthScore | null;
}

@Injectable()
export class ListAgentsWithHealthScoresUseCase {
  private readonly logger = new Logger(ListAgentsWithHealthScoresUseCase.name);

  constructor(
    private readonly agentRepo: IAgentRepo,
    private readonly computeHealthScore: ComputeHealthScoreUseCase
  ) {}

  async execute(): Promise<AgentWithHealthScore[]> {
    const agents = await this.agentRepo.listAgents();
    return Promise.all(
      agents.map(async (agent) => {
        try {
          const healthScore = await this.computeHealthScore.execute(agent.slug);
          return { agent, healthScore };
        } catch (error) {
          this.logger.warn(
            `Failed to compute health score for agent=${agent.slug}`,
            error instanceof Error ? error.stack : error
          );
          return { agent, healthScore: null };
        }
      })
    );
  }
}
