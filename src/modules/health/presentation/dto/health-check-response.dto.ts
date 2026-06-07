import type { DependencyStatus, HealthStatus } from "../../domain/value-objects/health-check-result.vo";

export class HealthDependenciesDto {
  postgresql!: DependencyStatus;
  langfuse!: DependencyStatus;
}

export class HealthCheckResponseDto {
  status!: HealthStatus;
  dependencies!: HealthDependenciesDto;
  timestamp!: string;
}