import {
  HealthClassification,
  HealthScore
} from "@/shared/domain/value-objects/health-score.vo";

export interface ComputeHealthScoreInput {
  errorRate: number;
  avgLatencyMs: number;
  latencyThresholdMs: number;
  heartbeatAgeS: number;
  heartbeatTimeoutS: number;
  cbOpenCount?: number;
  cbHalfOpenCount?: number;
}

export function computeHealthScore(input: ComputeHealthScoreInput): HealthScore {
  const {
    errorRate,
    avgLatencyMs,
    latencyThresholdMs,
    heartbeatAgeS,
    heartbeatTimeoutS,
    cbOpenCount = 0,
    cbHalfOpenCount = 0
  } = input;

  const latencyPenalty =
    latencyThresholdMs > 0 ? Math.min(1.0, avgLatencyMs / latencyThresholdMs) : 0.0;
  const heartbeatPenalty =
    heartbeatTimeoutS > 0 ? Math.min(1.0, heartbeatAgeS / heartbeatTimeoutS) : 0.0;

  let raw = 100.0;
  raw -= errorRate * 50;
  raw -= latencyPenalty * 30;
  raw -= heartbeatPenalty * 20;
  raw -= cbOpenCount * 30;
  raw -= cbHalfOpenCount * 15;
  const score = Math.max(0, Math.min(100, Math.floor(raw)));

  let classification: HealthClassification;
  if (score >= 80) classification = HealthClassification.HEALTHY;
  else if (score >= 50) classification = HealthClassification.DEGRADED;
  else classification = HealthClassification.CRITICAL;

  // CB override: any open or half-open CB caps classification at "degraded"
  if (cbOpenCount > 0 || cbHalfOpenCount > 0) {
    if (classification === HealthClassification.HEALTHY) {
      classification = HealthClassification.DEGRADED;
    }
  }

  return new HealthScore(
    score,
    classification,
    errorRate,
    avgLatencyMs,
    heartbeatAgeS,
    cbOpenCount,
    cbHalfOpenCount
  );
}
