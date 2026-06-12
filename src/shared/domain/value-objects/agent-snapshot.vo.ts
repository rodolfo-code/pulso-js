export class AgentSnapshot {
  constructor(
    public readonly id: string,
    public readonly agentId: string,
    public readonly periodStart: Date,
    public readonly periodEnd: Date,
    public readonly totalTraces: number,
    public readonly errorCount: number,
    public readonly avgLatencyMs: number,
    public readonly p95LatencyMs: number,
    public readonly totalCostUsd: number,
    public readonly calculatedAt: Date
  ) {}
}
