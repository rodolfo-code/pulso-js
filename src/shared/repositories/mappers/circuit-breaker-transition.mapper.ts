import { BreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { CircuitBreakerTransition } from "@/shared/domain/value-objects/circuit-breaker-transition.vo";

interface CircuitBreakerTransitionRow {
  id: string;
  agentId: string;
  cbName: string;
  state: string;
  failCount: number;
  recordedAt: Date;
}

function toBreakerState(raw: string): BreakerState {
  switch (raw) {
    case BreakerState.CLOSED:
    case BreakerState.OPEN:
    case BreakerState.HALF_OPEN:
      return raw;
    default:
      throw new Error(`Unknown BreakerState value from database: ${raw}`);
  }
}

export class CircuitBreakerTransitionMapper {
  static toDomain(row: CircuitBreakerTransitionRow): CircuitBreakerTransition {
    return new CircuitBreakerTransition(
      row.id,
      row.agentId,
      row.cbName,
      toBreakerState(row.state),
      row.failCount,
      row.recordedAt
    );
  }

  static toPersistence(transition: CircuitBreakerTransition): CircuitBreakerTransitionRow {
    return {
      id: transition.id,
      agentId: transition.agentId,
      cbName: transition.cbName,
      state: transition.state,
      failCount: transition.failCount,
      recordedAt: transition.recordedAt
    };
  }
}
