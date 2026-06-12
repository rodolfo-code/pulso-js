import type { BreakerState } from "./circuit-breaker-state.vo";

export class CircuitBreakerTransition {
  constructor(
    public readonly id: string,
    public readonly agentId: string,
    public readonly cbName: string,
    public readonly state: BreakerState,
    public readonly failCount: number,
    public readonly recordedAt: Date
  ) {}
}
