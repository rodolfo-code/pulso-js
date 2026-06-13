import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { CircuitBreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";

export interface AgentStatusViewDto {
  readonly slug: string;
  readonly status: Agent["status"];
  readonly lastHeartbeatAt: Date | null;
  readonly circuitBreakers: CircuitBreakerState[];
}