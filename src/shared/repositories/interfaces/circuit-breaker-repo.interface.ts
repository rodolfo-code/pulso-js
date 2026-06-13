import type { CircuitBreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";
import type { CircuitBreakerTransition } from "@/shared/domain/entities/circuit-breaker-transition.entity";

export abstract class ICircuitBreakerRepo {
  abstract listByAgent(agentId: string): Promise<CircuitBreakerState[]>;
  abstract upsertMany(states: CircuitBreakerState[]): Promise<void>;
  abstract appendTransitions(transitions: CircuitBreakerTransition[]): Promise<void>;
  abstract listHistory(
    agentId: string,
    cbName: string,
    fromTime: Date
  ): Promise<CircuitBreakerTransition[]>;
}
