export type DependencyStatus = "ok" | "unavailable";
export type HealthStatus = "ok" | "degraded" | "unavailable";

export class HealthCheckResult {
  constructor(
    public readonly status: HealthStatus,
    public readonly postgresql: DependencyStatus,
    public readonly langfuse: DependencyStatus,
    public readonly timestamp: string
  ) {}

  isUnavailable(): boolean {
    return this.status === "unavailable";
  }
}