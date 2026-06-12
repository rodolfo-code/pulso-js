export const SLOOperator = {
  LTE: "lte",
  GTE: "gte",
  LT: "lt",
  GT: "gt"
} as const;

export type SLOOperator = (typeof SLOOperator)[keyof typeof SLOOperator];

export class SLODefinition {
  constructor(
    public readonly id: string,
    public readonly agentId: string,
    public metric: string,
    public operator: SLOOperator,
    public threshold: number,
    public windowHours: number,
    public enabled: boolean,
    public readonly createdAt: Date
  ) {}
}
