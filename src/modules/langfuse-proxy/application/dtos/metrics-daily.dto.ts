export class MetricsDailyDto {
  constructor(
    public readonly data: Record<string, unknown>[],
    public readonly meta: Record<string, unknown>
  ) {}

  static fromLangfuse(d: Record<string, unknown>): MetricsDailyDto {
    return new MetricsDailyDto(
      Array.isArray(d["data"]) ? (d["data"] as Record<string, unknown>[]) : [],
      (d["meta"] as Record<string, unknown>) ?? {}
    );
  }
}
