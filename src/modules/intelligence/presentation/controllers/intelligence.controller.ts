import { Controller, Get, Logger, Param } from "@nestjs/common";

import { ComputeHealthScoreUseCase } from "@/modules/intelligence/application/use-cases/compute-health-score.use-case";
import { Agent } from "@/shared/domain/entities/agent.entity";
import type { HealthClassification } from "@/shared/domain/value-objects/health-score.vo";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

interface HealthScoreResponse {
  agentSlug: string;
  score: number;
  classification: HealthClassification;
  errorRate: number;
  avgLatencyMs: number;
  heartbeatAgeS: number;
  cbOpenCount: number;
  cbHalfOpenCount: number;
  calculatedAt: Date;
}

interface AgentWithHealthScoreResponse {
  agent: Agent;
  healthScore: HealthScoreResponse | null;
}

@Controller("intelligence")
export class IntelligenceController {
  private readonly logger = new Logger(IntelligenceController.name);

  constructor(
    private readonly computeHealthScore: ComputeHealthScoreUseCase,
    private readonly agentRepo: IAgentRepo
  ) {}

  @Get("agents/:slug/health-score")
  async getAgentHealthScore(@Param("slug") slug: string): Promise<HealthScoreResponse> {
    const health = await this.computeHealthScore.execute(slug);
    return {
      agentSlug: slug,
      score: health.score,
      classification: health.classification,
      errorRate: health.errorRate,
      avgLatencyMs: health.avgLatencyMs,
      heartbeatAgeS: health.heartbeatAgeS,
      cbOpenCount: health.cbOpenCount,
      cbHalfOpenCount: health.cbHalfOpenCount,
      calculatedAt: new Date()
    };
  }

  @Get("agents")
  async listAgentsWithHealthScores(): Promise<AgentWithHealthScoreResponse[]> {
    const agents = await this.agentRepo.listAgents();
    return Promise.all(
      agents.map(async (agent) => {
        try {
          const health = await this.computeHealthScore.execute(agent.slug);
          return {
            agent,
            healthScore: {
              agentSlug: agent.slug,
              score: health.score,
              classification: health.classification,
              errorRate: health.errorRate,
              avgLatencyMs: health.avgLatencyMs,
              heartbeatAgeS: health.heartbeatAgeS,
              cbOpenCount: health.cbOpenCount,
              cbHalfOpenCount: health.cbHalfOpenCount,
              calculatedAt: new Date()
            }
          };
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
