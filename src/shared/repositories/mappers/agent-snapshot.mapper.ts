import { AgentSnapshot } from "@/shared/domain/value-objects/agent-snapshot.vo";
import type { Prisma } from "@prisma-client/client";

interface AgentSnapshotRowRead {
  id: string;
  agentId: string;
  periodStart: Date;
  periodEnd: Date;
  totalTraces: number;
  errorCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalCostUsd: Prisma.Decimal;
  calculatedAt: Date;
}

interface AgentSnapshotRowWrite {
  id: string;
  agentId: string;
  periodStart: Date;
  periodEnd: Date;
  totalTraces: number;
  errorCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  totalCostUsd: Prisma.Decimal | number | string;
  calculatedAt: Date;
}

export class AgentSnapshotMapper {
  static toDomain(row: AgentSnapshotRowRead): AgentSnapshot {
    return new AgentSnapshot(
      row.id,
      row.agentId,
      row.periodStart,
      row.periodEnd,
      row.totalTraces,
      row.errorCount,
      row.avgLatencyMs,
      row.p95LatencyMs,
      Number(row.totalCostUsd),
      row.calculatedAt
    );
  }

  static toPersistence(snapshot: AgentSnapshot): AgentSnapshotRowWrite {
    return {
      id: snapshot.id,
      agentId: snapshot.agentId,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      totalTraces: snapshot.totalTraces,
      errorCount: snapshot.errorCount,
      avgLatencyMs: snapshot.avgLatencyMs,
      p95LatencyMs: snapshot.p95LatencyMs,
      totalCostUsd: snapshot.totalCostUsd,
      calculatedAt: snapshot.calculatedAt
    };
  }
}
