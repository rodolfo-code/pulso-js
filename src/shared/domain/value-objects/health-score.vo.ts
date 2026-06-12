export const HealthClassification = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
  CRITICAL: "critical"
} as const;

export type HealthClassification =
  (typeof HealthClassification)[keyof typeof HealthClassification];

export class HealthScore {
  constructor(
    public readonly score: number,
    public readonly classification: HealthClassification,
    public readonly errorRate: number,
    public readonly avgLatencyMs: number,
    public readonly heartbeatAgeS: number,
    public readonly cbOpenCount: number = 0,
    public readonly cbHalfOpenCount: number = 0
  ) {}
}
