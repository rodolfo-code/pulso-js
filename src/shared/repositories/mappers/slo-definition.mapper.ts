import { SLODefinition, SLOOperator } from "@/shared/domain/entities/slo-definition.entity";
import type { Prisma } from "@prisma-client/client";

interface SLODefinitionRowRead {
  id: string;
  agentId: string;
  metric: string;
  operator: string;
  threshold: Prisma.Decimal;
  windowHours: number;
  enabled: boolean;
  createdAt: Date;
}

interface SLODefinitionRowWrite {
  id: string;
  agentId: string;
  metric: string;
  operator: string;
  threshold: Prisma.Decimal | number | string;
  windowHours: number;
  enabled: boolean;
  createdAt: Date;
}

function toOperator(raw: string): SLOOperator {
  switch (raw) {
    case SLOOperator.LTE:
    case SLOOperator.GTE:
    case SLOOperator.LT:
    case SLOOperator.GT:
      return raw;
    default:
      throw new Error(`Unknown SLOOperator value from database: ${raw}`);
  }
}

export class SLODefinitionMapper {
  static toDomain(row: SLODefinitionRowRead): SLODefinition {
    return new SLODefinition(
      row.id,
      row.agentId,
      row.metric,
      toOperator(row.operator),
      Number(row.threshold),
      row.windowHours,
      row.enabled,
      row.createdAt
    );
  }

  static toPersistence(slo: SLODefinition): SLODefinitionRowWrite {
    return {
      id: slo.id,
      agentId: slo.agentId,
      metric: slo.metric,
      operator: slo.operator,
      threshold: slo.threshold,
      windowHours: slo.windowHours,
      enabled: slo.enabled,
      createdAt: slo.createdAt
    };
  }
}
