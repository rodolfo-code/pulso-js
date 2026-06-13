import { Injectable, Logger } from "@nestjs/common";

import type { AgentWithHealthScoreDto } from "@/modules/intelligence/application/dtos/agent-with-health-score.dto";
import { ComputeHealthScoreUseCase } from "@/modules/intelligence/application/use-cases/compute-health-score.use-case";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

@Injectable()
export class ListAgentsWithHealthScoresUseCase {
  private readonly logger = new Logger(ListAgentsWithHealthScoresUseCase.name);

  constructor(
    private readonly agentRepo: IAgentRepo,
    private readonly computeHealthScore: ComputeHealthScoreUseCase
  ) {}

  async execute(): Promise<AgentWithHealthScoreDto[]> {
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