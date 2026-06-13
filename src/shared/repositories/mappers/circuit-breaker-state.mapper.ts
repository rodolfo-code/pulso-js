import {
  BreakerState,
  CircuitBreakerState
} from "@/shared/domain/entities/circuit-breaker-state.entity";

interface CircuitBreakerStateRow {
  agentId: string;
  name: string;
  state: string;
  failCount: number;
  lastStateChange: Date | null;
  updatedAt: Date;
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

export class CircuitBreakerStateMapper {
  static toDomain(row: CircuitBreakerStateRow): CircuitBreakerState {
    return new CircuitBreakerState(
      row.agentId,
      row.name,
      toBreakerState(row.state),
      row.failCount,
      row.lastStateChange,
      row.updatedAt
    );
  }

  static toPersistence(state: CircuitBreakerState): CircuitBreakerStateRow {
    return {
      agentId: state.agentId,
      name: state.name,
      state: state.state,
      failCount: state.failCount,
      lastStateChange: state.lastStateChange,
      updatedAt: state.updatedAt
    };
  }
}
