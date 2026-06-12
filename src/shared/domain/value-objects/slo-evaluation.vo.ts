export const SLOStatus = {
  OK: "ok",
  BREACH: "breach",
  INSUFFICIENT_DATA: "insufficient_data"
} as const;

export type SLOStatus = (typeof SLOStatus)[keyof typeof SLOStatus];

export class SLOEvaluation {
  constructor(
    public readonly id: string,
    public readonly sloId: string,
    public readonly agentId: string,
    public readonly status: SLOStatus,
    public readonly measuredValue: number | null,
    public readonly breach: boolean,
    public readonly langfuseTraceRef: string | null,
    public readonly evaluatedAt: Date
  ) {}
}
