import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvConfig } from "@/shared/config/env.config";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { extractHierarchy } from "@/shared/domain/services/extract-hierarchy.service";
import { computeHealthScore } from "@/shared/domain/services/health-score.service";
import { calculateKpis } from "@/shared/domain/services/kpi-calculator.service";
import { BreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { HealthScoreRecord } from "@/shared/domain/value-objects/health-score-record.vo";
import type { HealthScore } from "@/shared/domain/value-objects/health-score.vo";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";
import { IHealthScoreRepo } from "@/shared/repositories/interfaces/health-score-repo.interface";

@Injectable()
export class ComputeHealthScoreUseCase {
  private readonly logger = new Logger(ComputeHealthScoreUseCase.name);
  private readonly latencyThresholdMs: number;
  private readonly heartbeatTimeoutS: number;

  constructor(
    private readonly agentRepo: IAgentRepo,
    @Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient,
    private readonly healthRepo: IHealthScoreRepo,
    @Inject(ICircuitBreakerRepo) private readonly cbRepo: ICircuitBreakerRepo,
    config: ConfigService<EnvConfig, true>
  ) {
    this.latencyThresholdMs = config.getOrThrow<number>("conversationSlowThresholdMs");
    this.heartbeatTimeoutS = config.getOrThrow<number>("heartbeatTimeoutSeconds");
  }

  async execute(slug: string): Promise<HealthScore> {
    const agent = await this.agentRepo.getAgentBySlug(slug);
    if (agent === null) {
      throw new DomainNotFoundError(`Agent not found: ${slug}`);
    }

    const now = new Date();

    // Fetch traces from Langfuse and filter in-memory by agent slug (best-effort)
    let traces: Record<string, unknown>[] = [];
    try {
      const allTraces = await this.langfuse.getTraces();
      traces = allTraces.filter((t) => extractHierarchy(t).agent === slug);
    } catch (error) {
      this.logger.warn(
        `Failed to fetch traces for agent=${slug}, using empty list`,
        error instanceof Error ? error.stack : error
      );
    }

    const kpis = calculateKpis(traces);

    const heartbeatAgeS =
      agent.lastHeartbeatAt !== null
        ? Math.floor((now.getTime() - agent.lastHeartbeatAt.getTime()) / 1000)
        : this.heartbeatTimeoutS;

    // Fetch circuit breaker states (best-effort — never blocks health score)
    let cbOpenCount = 0;
    let cbHalfOpenCount = 0;
    try {
      const cbs = await this.cbRepo.listByAgent(agent.id);
      cbOpenCount = cbs.filter((cb) => cb.state === BreakerState.OPEN).length;
      cbHalfOpenCount = cbs.filter((cb) => cb.state === BreakerState.HALF_OPEN).length;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch circuit breakers for agent=${slug}, ignoring`,
        error instanceof Error ? error.stack : error
      );
    }

    const health = computeHealthScore({
      errorRate: kpis.errorRate,
      avgLatencyMs: kpis.avgLatencyMs,
      latencyThresholdMs: this.latencyThresholdMs,
      heartbeatAgeS,
      heartbeatTimeoutS: this.heartbeatTimeoutS,
      cbOpenCount,
      cbHalfOpenCount
    });

    // Persist to health_score_history (espelha legado: propaga em caso de falha)
    const record = new HealthScoreRecord(
      crypto.randomUUID(),
      agent.id,
      health.score,
      health.classification,
      health.errorRate,
      health.avgLatencyMs,
      health.heartbeatAgeS,
      now
    );
    await this.healthRepo.createHealthScore(record);

    return health;
  }
}
