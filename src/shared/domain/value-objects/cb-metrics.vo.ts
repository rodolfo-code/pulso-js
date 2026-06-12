export class CBMetrics {
  constructor(
    public readonly cbOpenDurationMinutes: number,
    public readonly cbOpenCount: number,
    public readonly cbAvailabilityPct: number
  ) {}
}
