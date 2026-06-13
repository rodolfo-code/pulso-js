import { Controller, Get, Param } from "@nestjs/common";

import { ComputeHealthScoreUseCase } from "@/modules/intelligence/application/use-cases/compute-health-score.use-case";
import { ListAgentsWithHealthScoresUseCase } from "@/modules/intelligence/application/use-cases/list-agents-with-health-scores.use-case";
import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { HealthClassification } from "@/shared/domain/value-objects/health-score.vo";

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
  constructor(
    private readonly computeHealthScore: ComputeHealthScoreUseCase,
    private readonly listAgentsWithHealthScores: ListAgentsWithHealthScoresUseCase
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
  async list(): Promise<AgentWithHealthScoreResponse[]> {
    const items = await this.listAgentsWithHealthScores.execute();
    return items.map(({ agent, healthScore }) => ({
      agent,
      healthScore:
        healthScore === null
          ? null
          : {
              agentSlug: agent.slug,
              score: healthScore.score,
              classification: healthScore.classification,
              errorRate: healthScore.errorRate,
              avgLatencyMs: healthScore.avgLatencyMs,
              heartbeatAgeS: healthScore.heartbeatAgeS,
              cbOpenCount: healthScore.cbOpenCount,
              cbHalfOpenCount: healthScore.cbHalfOpenCount,
              calculatedAt: new Date()
            }
    }));
  }
}
