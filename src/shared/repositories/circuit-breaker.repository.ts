import { Injectable } from "@nestjs/common";

import { CircuitBreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";
import { CircuitBreakerTransition } from "@/shared/domain/value-objects/circuit-breaker-transition.vo";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { ICircuitBreakerRepo } from "./interfaces/circuit-breaker-repo.interface";
import { CircuitBreakerStateMapper } from "./mappers/circuit-breaker-state.mapper";
import { CircuitBreakerTransitionMapper } from "./mappers/circuit-breaker-transition.mapper";

@Injectable()
export class CircuitBreakerRepository extends ICircuitBreakerRepo {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByAgent(agentId: string): Promise<CircuitBreakerState[]> {
    const rows = await this.prisma.circuitBreakerState.findMany({ where: { agentId } });
    return rows.map((row) => CircuitBreakerStateMapper.toDomain(row));
  }

  async upsertMany(states: CircuitBreakerState[]): Promise<void> {
    await Promise.all(
      states.map((state) => {
        const row = CircuitBreakerStateMapper.toPersistence(state);
        return this.prisma.circuitBreakerState.upsert({
          where: { agentId_name: { agentId: row.agentId, name: row.name } },
          create: row,
          update: {
            state: row.state,
            failCount: row.failCount,
            lastStateChange: row.lastStateChange,
            updatedAt: row.updatedAt
          }
        });
      })
    );
  }

  async appendTransitions(transitions: CircuitBreakerTransition[]): Promise<void> {
    if (transitions.length === 0) return;
    const rows = transitions.map((t) => CircuitBreakerTransitionMapper.toPersistence(t));
    await this.prisma.circuitBreakerTransition.createMany({ data: rows });
  }

  async listHistory(
    agentId: string,
    cbName: string,
    fromTime: Date
  ): Promise<CircuitBreakerTransition[]> {
    const rows = await this.prisma.circuitBreakerTransition.findMany({
      where: { agentId, cbName, recordedAt: { gte: fromTime } },
      orderBy: { recordedAt: "asc" }
    });
    return rows.map((row) => CircuitBreakerTransitionMapper.toDomain(row));
  }
}
