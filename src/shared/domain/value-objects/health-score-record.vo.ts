import type { HealthClassification } from "./health-score.vo";

export class HealthScoreRecord {
  constructor(
    public readonly id: string,
    public readonly agentId: string,
    public readonly score: number,
    public readonly classification: HealthClassification,
    public readonly errorRate: number,
    public readonly avgLatencyMs: number,
    public readonly heartbeatAgeS: number,
    public readonly calculatedAt: Date
  ) {}
}
