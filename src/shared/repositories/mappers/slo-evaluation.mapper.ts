import { SLOEvaluation, SLOStatus } from "@/shared/domain/entities/slo-evaluation.entity";
import type { Prisma } from "@prisma-client/client";

interface SLOEvaluationRowRead {
  id: string;
  sloId: string;
  agentId: string;
  status: string;
  measuredValue: Prisma.Decimal | null;
  breach: boolean;
  langfuseTraceRef: string | null;
  evaluatedAt: Date;
}

interface SLOEvaluationRowWrite {
  id: string;
  sloId: string;
  agentId: string;
  status: string;
  measuredValue: Prisma.Decimal | number | string | null;
  breach: boolean;
  langfuseTraceRef: string | null;
  evaluatedAt: Date;
}

function toStatus(raw: string): SLOStatus {
  switch (raw) {
    case SLOStatus.OK:
    case SLOStatus.BREACH:
    case SLOStatus.INSUFFICIENT_DATA:
      return raw;
    default:
      throw new Error(`Unknown SLOStatus value from database: ${raw}`);
  }
}

export class SLOEvaluationMapper {
  static toDomain(row: SLOEvaluationRowRead): SLOEvaluation {
    return new SLOEvaluation(
      row.id,
      row.sloId,
      row.agentId,
      toStatus(row.status),
      row.measuredValue === null ? null : Number(row.measuredValue),
      row.breach,
      row.langfuseTraceRef,
      row.evaluatedAt
    );
  }

  static toPersistence(evaluation: SLOEvaluation): SLOEvaluationRowWrite {
    return {
      id: evaluation.id,
      sloId: evaluation.sloId,
      agentId: evaluation.agentId,
      status: evaluation.status,
      measuredValue: evaluation.measuredValue,
      breach: evaluation.breach,
      langfuseTraceRef: evaluation.langfuseTraceRef,
      evaluatedAt: evaluation.evaluatedAt
    };
  }
}
