export const BreakerState = {
  CLOSED: "closed",
  OPEN: "open",
  HALF_OPEN: "half-open"
} as const;

export type BreakerState = (typeof BreakerState)[keyof typeof BreakerState];

export class CircuitBreakerState {
  constructor(
    public readonly agentId: string,
    public readonly name: string,
    public state: BreakerState,
    public failCount: number,
    public lastStateChange: Date | null,
    public updatedAt: Date
  ) {}
}
