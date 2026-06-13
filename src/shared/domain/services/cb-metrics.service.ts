import { BreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";
import type { CircuitBreakerTransition } from "@/shared/domain/entities/circuit-breaker-transition.entity";
import { CBMetrics } from "@/shared/domain/value-objects/cb-metrics.vo";

/**
 * Calcula métricas SLO de Circuit Breaker a partir de uma série temporal de
 * registros (transitions) dentro de uma janela.
 *
 * Cada registro representa "em T, o CB estava no estado S". A duração é
 * inferida tratando registros consecutivos como intervalos.
 *
 * Edge cases:
 *  - janela <= 0 ou history vazia → assume CB closed → availability 100%
 *  - registro único → CB ficou nesse estado pelo resto da janela
 */
export function calculateCbMetrics(
  history: CircuitBreakerTransition[],
  windowStart: Date,
  windowEnd: Date
): CBMetrics {
  const windowSeconds = (windowEnd.getTime() - windowStart.getTime()) / 1000;
  if (windowSeconds <= 0) {
    return new CBMetrics(0, 0, 100);
  }
  if (history.length === 0) {
    return new CBMetrics(0, 0, 100);
  }

  let openSeconds = 0;
  let openCount = 0;
  let prevState: string | null = null;

  for (let i = 0; i < history.length; i++) {
    const entry = history[i]!;
    const entryStartMs = Math.max(entry.recordedAt.getTime(), windowStart.getTime());

    const next = history[i + 1];
    const entryEndMs =
      next !== undefined
        ? Math.min(next.recordedAt.getTime(), windowEnd.getTime())
        : windowEnd.getTime();

    const intervalSeconds = Math.max(0, (entryEndMs - entryStartMs) / 1000);

    if (entry.state === BreakerState.OPEN) {
      openSeconds += intervalSeconds;
      if (prevState !== BreakerState.OPEN) {
        openCount += 1;
      }
    }
    prevState = entry.state;
  }

  const openMinutes = openSeconds / 60;
  const closedSeconds = Math.max(0, windowSeconds - openSeconds);
  const availabilityPct = Math.max(0, Math.min(100, (closedSeconds / windowSeconds) * 100));

  return new CBMetrics(openMinutes, openCount, availabilityPct);
}
