import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { EnvConfig } from "@/shared/config/env.config";
import { Agent } from "@/shared/domain/entities/agent.entity";
import { AuditLogEntry } from "@/shared/domain/entities/audit-log-entry.entity";
import { CircuitBreakerState } from "@/shared/domain/entities/circuit-breaker-state.entity";
import { CircuitBreakerTransition } from "@/shared/domain/entities/circuit-breaker-transition.entity";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { computeStatus } from "@/shared/domain/services/status-engine.service";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";
import { ICircuitBreakerRepo } from "@/shared/repositories/interfaces/circuit-breaker-repo.interface";

export interface HeartbeatRequest {
  version?: string;
  errorCount?: number;
  circuitBreakers?: Array<{
    name: string;
    state: CircuitBreakerState["state"];
    failCount: number;
    lastStateChange: Date | null;
  }>;
}

@Injectable()
export class ProcessHeartbeatUseCase {
  private readonly logger = new Logger(ProcessHeartbeatUseCase.name);
  private readonly timeoutSeconds: number;

  constructor(
    private readonly agentRepo: IAgentRepo,
    private readonly auditRepo: IAuditLogRepo,
    @Inject(ICircuitBreakerRepo) private readonly cbRepo: ICircuitBreakerRepo,
    config: ConfigService<EnvConfig, true>
  ) {
    this.timeoutSeconds = config.getOrThrow<number>("heartbeatTimeoutSeconds");
  }

  async execute(slug: string, payload: HeartbeatRequest): Promise<Agent> {
    const agent = await this.agentRepo.getAgentBySlug(slug);
    if (agent === null) {
      throw new DomainNotFoundError(`Agent not found: ${slug}`);
    }

    const now = new Date();
    agent.lastHeartbeatAt = now;
    if (payload.version !== undefined) {
      agent.version = payload.version;
    }

    agent.status = computeStatus({
      lastHeartbeatAt: agent.lastHeartbeatAt,
      now,
      timeoutSeconds: this.timeoutSeconds,
      errorCount: payload.errorCount
    });

    const updated = await this.agentRepo.updateAgent(agent);

    // Persist circuit breaker states (best-effort, never blocks the heartbeat)
    if (payload.circuitBreakers && payload.circuitBreakers.length > 0) {
      try {
        const states = payload.circuitBreakers.map(
          (cb) =>
            new CircuitBreakerState(
              updated.id,
              cb.name,
              cb.state,
              cb.failCount,
              cb.lastStateChange,
              now
            )
        );
        await this.cbRepo.upsertMany(states);

        const transitions = payload.circuitBreakers.map(
          (cb) =>
            new CircuitBreakerTransition(
              crypto.randomUUID(),
              updated.id,
              cb.name,
              cb.state,
              cb.failCount,
              now
            )
        );
        await this.cbRepo.appendTransitions(transitions);
      } catch (error) {
        this.logger.warn(
          `circuit_breaker upsert failed for agent=${updated.slug}`,
          error instanceof Error ? error.stack : error
        );
      }
    }

    try {
      const entry = AuditLogEntry.create({
        entityType: "agent",
        entityId: updated.id,
        action: "heartbeat",
        actor: "system",
        payload: {
          slug: updated.slug,
          status: updated.status,
          version: updated.version,
          circuitBreakers: (payload.circuitBreakers ?? []).map((cb) => ({
            name: cb.name,
            state: cb.state
          }))
        }
      });
      await this.auditRepo.append(entry);
    } catch (error) {
      this.logger.warn(
        `audit_log write failed for heartbeat agent=${updated.slug}`,
        error instanceof Error ? error.stack : error
      );
    }

    return updated;
  }
}
