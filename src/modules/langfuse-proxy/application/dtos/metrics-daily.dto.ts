import type { ApiMetricsResponse } from "langfuse";

export class MetricsDailyDto {
  constructor(public readonly data: Record<string, unknown>[]) {}

  static fromLangfuse(d: ApiMetricsResponse): MetricsDailyDto {
    return new MetricsDailyDto((d.data ?? []) as Record<string, unknown>[]);
  }
}