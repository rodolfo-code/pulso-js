import { KPIResult } from "@/shared/domain/value-objects/kpi-result.vo";

type RawTrace = Record<string, unknown>;

export function calculateKpis(traces: RawTrace[]): KPIResult {
  const totalRequests = traces.length;
  if (totalRequests === 0) {
    return new KPIResult(0, 0, 0, 0, 0, 0, 0);
  }

  const errorCount = traces.filter(isError).length;
  const errorRateRaw = errorCount / totalRequests;
  const latencies = traces.map(extractLatencyMs);
  const sum = latencies.reduce((acc, l) => acc + l, 0);
  const avgLatency = Math.floor(sum / latencies.length);
  const p95 = Math.floor(percentile(latencies, 95));
  const totalTokens = traces.reduce((acc, t) => acc + extractTokens(t), 0);
  const totalCost = traces.reduce((acc, t) => acc + extractCost(t), 0);

  return new KPIResult(
    totalRequests,
    totalTokens,
    totalCost,
    Math.min(errorCount, totalRequests),
    Math.max(0, Math.min(1, errorRateRaw)),
    Math.max(0, avgLatency),
    Math.max(p95, Math.max(0, avgLatency))
  );
}

function isError(trace: RawTrace): boolean {
  if (trace["level"] === "ERROR") return true;
  const tags = trace["tags"];
  if (Array.isArray(tags) && tags.includes("error")) return true;
  const metadata = (trace["metadata"] as Record<string, unknown> | undefined) ?? {};
  if (metadata["error"] === true) return true;
  return false;
}

function extractLatencyMs(trace: RawTrace): number {
  const raw = trace["latency"];
  if (raw === undefined || raw === null) return 0;
  const num = Number(raw);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.floor(num * 1000));
}

function extractTokens(trace: RawTrace): number {
  let raw = trace["totalTokens"];
  if (raw === undefined || raw === null) {
    const usage = (trace["usage"] as Record<string, unknown> | undefined) ?? {};
    raw = usage["totalTokens"];
  }
  if (raw === undefined || raw === null) return 0;
  const num = Number(raw);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.floor(num));
}

function extractCost(trace: RawTrace): number {
  const raw = trace["totalCost"];
  if (raw === undefined || raw === null) return 0;
  const num = Number(raw);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, num);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  if (n === 1) return sorted[0]!;
  const index = (p / 100) * (n - 1);
  const lower = Math.floor(index);
  const upper = lower + 1;
  if (upper >= n) return sorted[n - 1]!;
  const fraction = index - lower;
  return sorted[lower]! + fraction * (sorted[upper]! - sorted[lower]!);
}
