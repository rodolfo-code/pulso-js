import { SLOOperator } from "@/shared/domain/entities/slo-definition.entity";
import type { KPIResult } from "@/shared/domain/value-objects/kpi-result.vo";

const CB_METRICS = new Set<string>([
  "cb_open_duration_minutes",
  "cb_open_count",
  "cb_availability_pct"
]);

export function evaluateOperator(
  measured: number,
  operator: SLOOperator,
  threshold: number
): boolean {
  switch (operator) {
    case SLOOperator.LTE:
      return measured <= threshold;
    case SLOOperator.GTE:
      return measured >= threshold;
    case SLOOperator.LT:
      return measured < threshold;
    case SLOOperator.GT:
      return measured > threshold;
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unknown SLO operator: ${String(exhaustive)}`);
    }
  }
}

/**
 * Extract the relevant KPI value by metric name. Returns null if unknown.
 *
 * NOTE: espelha decisão silenciosa do legado (marcada como tech debt v2.0
 * lá: substituir mapping str-keyed por DTO tipado).
 */
export function extractMetric(kpis: KPIResult, metric: string): number | null {
  switch (metric) {
    case "error_rate":
      return kpis.errorRate;
    case "avg_latency_ms":
      return kpis.avgLatencyMs;
    case "p95_latency_ms":
      return kpis.p95LatencyMs;
    case "total_requests":
      return kpis.totalRequests;
    case "error_count":
      return kpis.errorCount;
    case "total_cost_usd":
      return kpis.totalCostUsd;
    case "total_tokens":
      return kpis.totalTokens;
    default:
      return null;
  }
}

/**
 * Parse a CB metric string into (baseMetric, cbName | null).
 *
 *   "cb_open_duration_minutes"              → { base: "cb_open_duration_minutes", cbName: null }
 *   "cb_open_duration_minutes:llm-provider" → { base: "cb_open_duration_minutes", cbName: "llm-provider" }
 */
export function parseCbMetric(metric: string): { base: string; cbName: string | null } {
  const colonIdx = metric.indexOf(":");
  if (colonIdx === -1) {
    return { base: metric, cbName: null };
  }
  const base = metric.slice(0, colonIdx).trim();
  const cbName = metric.slice(colonIdx + 1).trim();
  return { base, cbName: cbName === "" ? null : cbName };
}

export function isCbMetric(metric: string): boolean {
  const { base } = parseCbMetric(metric);
  return CB_METRICS.has(base);
}
