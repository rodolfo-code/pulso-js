export class KPIResult {
  constructor(
    public readonly totalRequests: number,
    public readonly totalTokens: number,
    public readonly totalCostUsd: number,
    public readonly errorCount: number,
    public readonly errorRate: number,
    public readonly avgLatencyMs: number,
    public readonly p95LatencyMs: number
  ) {}
}
