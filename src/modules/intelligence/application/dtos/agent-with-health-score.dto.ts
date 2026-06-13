import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { HealthScore } from "@/shared/domain/value-objects/health-score.vo";

export interface AgentWithHealthScoreDto {
  readonly agent: Agent;
  readonly healthScore: HealthScore | null;
}