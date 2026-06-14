import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvConfig } from "@/shared/config/env.config";
import type { AgentSnapshot } from "@/shared/domain/entities/agent-snapshot.entity";
import { AuditLogEntry } from "@/shared/domain/entities/audit-log-entry.entity";
import type { SLODefinition } from "@/shared/domain/entities/slo-definition.entity";
import { SLOEvaluation, SLOStatus } from "@/shared/domain/entities/slo-evaluation.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { calculateCbMetrics } from "@/shared/domain/services/cb-metrics.service";
import { extractHierarchy } from "@/shared/domain/services/extract-hierarchy.service";
import { calculateKpis } from "@/shared/domain/services/kpi-calculator.service";
import {
  evaluateOperator,
  extractMetric,
  isCbMetric,
  parseCbMetric
} from "@/shared/domain/services/slo-evaluator.service";
import { KPIResult } from "@/shared/domain/value-objects/kpi-result.vo";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";
import { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";
import { ISnapshotRepo } from "@/shared/repositories/interfaces/snapshot-repo.interface";

@Injectable()
export class EvaluateSLOUseCase {
  private readonly logger = new Logger(EvaluateSLOUseCase.name);
  private readonly minTraces: number;

  constructor(
    private readonly sloRepo: ISLORepo,
    private readonly snapshotRepo: ISnapshotRepo,
    private readonly agentRepo: IAgentRepo,
    @Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient,
    private readonly auditRepo: IAuditLogRepo,
    @Inject(ICircuitBreakerRepo) private readonly cbRepo: ICircuitBreakerRepo,
    config: ConfigService<EnvConfig, true>
  ) {
    this.minTraces = config.getOrThrow<number>("sloMinTracesForEvaluation");
  }

  async execute(sloId: string): Promise<SLOEvaluation> {
    const slo = await this.sloRepo.getSlo(sloId);
    if (slo === null) {
      throw new DomainNotFoundError(`SLO not found: ${sloId}`);
    }

    const now = new Date();

    if (isCbMetric(slo.metric)) {
      return this.evaluateCbMetric(slo, now);
    }

    let measuredValue: number | null = null;
    let langfuseTraceRef: string | null = null;

    const snapshot = await this.snapshotRepo.getLatestSnapshot(slo.agentId);
    if (snapshot !== null) {
      measuredValue = extractMetric(snapshotToKpis(snapshot), slo.metric);
    } else {
      let agentSlug: string | null = null;
      try {
        const agent = await this.agentRepo.getAgentById(slo.agentId);
        agentSlug = agent?.slug ?? null;
      } catch (error) {
        this.logger.warn(
          `Failed to resolve agent slug for sloId=${sloId} agentId=${slo.agentId}`,
          error instanceof Error ? error.stack : error
        );
      }

      try {
        const windowStart = new Date(now.getTime() - slo.windowHours * 3600_000);
        const allTraces = await this.langfuse.getTraces({
          fromTimestamp: windowStart.toISOString(),
          toTimestamp: now.toISOString()
        });
        const traces = agentSlug
          ? allTraces.filter((t) => extractHierarchy(t).agent === agentSlug)
          : [];
        // Sort descending by timestamp (most recent first)
        traces.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        if (traces.length > 0) {
          const kpis = calculateKpis(traces);
          if (kpis.totalRequests < this.minTraces) {
            measuredValue = null;
          } else {
            measuredValue = extractMetric(kpis, slo.metric);
            const firstTrace = traces[0];
            langfuseTraceRef = firstTrace?.id ?? null;
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch traces for SLO evaluation sloId=${sloId}`,
          error instanceof Error ? error.stack : error
        );
      }
    }

    return this.persistEvaluation(slo, measuredValue, langfuseTraceRef, now);
  }

  private async evaluateCbMetric(slo: SLODefinition, now: Date): Promise<SLOEvaluation> {
    const { base: baseMetric, cbName: cbNameFilter } = parseCbMetric(slo.metric);
    const windowStart = new Date(now.getTime() - slo.windowHours * 3600_000);

    let worstValue: number | null = null;

    try {
      const currentStates = await this.cbRepo.listByAgent(slo.agentId);
      const cbNames =
        cbNameFilter !== null
          ? [cbNameFilter]
          : Array.from(new Set(currentStates.map((cb) => cb.name)));

      if (cbNames.length === 0) {
        return this.persistEvaluation(slo, null, null, now);
      }

      for (const cbName of cbNames) {
        const history = await this.cbRepo.listHistory(slo.agentId, cbName, windowStart);
        const metrics = calculateCbMetrics(history, windowStart, now);

        let value: number | null;
        if (baseMetric === "cb_open_duration_minutes") {
          value = round(metrics.cbOpenDurationMinutes, 4);
        } else if (baseMetric === "cb_open_count") {
          value = metrics.cbOpenCount;
        } else if (baseMetric === "cb_availability_pct") {
          value = round(metrics.cbAvailabilityPct, 4);
        } else {
          value = null; // unreachable — guarded by isCbMetric
        }

        if (value === null) continue;

        if (worstValue === null) {
          worstValue = value;
        } else if (baseMetric === "cb_availability_pct") {
          worstValue = Math.min(worstValue, value);
        } else {
          worstValue = Math.max(worstValue, value);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to evaluate CB metric sloId=${slo.id} metric=${slo.metric}`,
        error instanceof Error ? error.stack : error
      );
      return this.persistEvaluation(slo, null, null, now);
    }

    return this.persistEvaluation(slo, worstValue, null, now);
  }

  private async persistEvaluation(
    slo: SLODefinition,
    measuredValue: number | null,
    langfuseTraceRef: string | null,
    now: Date
  ): Promise<SLOEvaluation> {
    let status: SLOStatus;
    let breach: boolean;
    if (measuredValue === null) {
      status = SLOStatus.INSUFFICIENT_DATA;
      breach = false;
    } else {
      const isOk = evaluateOperator(measuredValue, slo.operator, slo.threshold);
      breach = !isOk;
      status = breach ? SLOStatus.BREACH : SLOStatus.OK;
    }

    const evaluation = new SLOEvaluation(
      crypto.randomUUID(),
      slo.id,
      slo.agentId,
      status,
      measuredValue,
      breach,
      langfuseTraceRef,
      now
    );
    const persisted = await this.sloRepo.createEvaluation(evaluation);

    if (breach) {
      try {
        const entry = AuditLogEntry.create({
          entityType: "slo",
          entityId: slo.id,
          action: "slo_breach",
          actor: "system",
          payload: {
            sloId: slo.id,
            agentId: slo.agentId,
            metric: slo.metric,
            operator: slo.operator,
            threshold: slo.threshold,
            measuredValue
          }
        });
        await this.auditRepo.append(entry);
      } catch (error) {
        this.logger.warn(
          `audit_log write failed for slo_breach sloId=${slo.id}`,
          error instanceof Error ? error.stack : error
        );
      }
    }

    return persisted;
  }
}

function snapshotToKpis(snapshot: AgentSnapshot): KPIResult {
  const total = snapshot.totalTraces;
  const errors = snapshot.errorCount;
  const errorRate = total > 0 ? errors / total : 0;
  // total_tokens não é armazenado em AgentSnapshot (espelha o legado, marcado como tech debt)
  return new KPIResult(
    total,
    0,
    snapshot.totalCostUsd,
    errors,
    errorRate,
    snapshot.avgLatencyMs,
    snapshot.p95LatencyMs
  );
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
