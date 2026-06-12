import type { CircuitBreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import type { CircuitBreakerTransition } from "@/shared/domain/value-objects/circuit-breaker-transition.vo";

export abstract class ICircuitBreakerRepo {
  abstract listByAgent(agentId: string): Promise<CircuitBreakerState[]>;
  abstract upsertMany(states: CircuitBreakerState[]): Promise<void>;
  abstract appendTransitions(transitions: CircuitBreakerTransition[]): Promise<void>;
}
