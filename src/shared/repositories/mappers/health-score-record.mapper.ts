import { HealthScoreRecord } from "@/shared/domain/entities/health-score-record.entity";
import {
  HealthClassification,
  type HealthClassification as HealthClassificationType
} from "@/shared/domain/value-objects/health-score.vo";

interface HealthScoreRecordRow {
  id: string;
  agentId: string;
  score: number;
  classification: string;
  errorRate: number;
  avgLatencyMs: number;
  heartbeatAgeS: number;
  calculatedAt: Date;
}

function toClassification(raw: string): HealthClassificationType {
  switch (raw) {
    case HealthClassification.HEALTHY:
    case HealthClassification.DEGRADED:
    case HealthClassification.CRITICAL:
      return raw;
    default:
      throw new Error(`Unknown HealthClassification value from database: ${raw}`);
  }
}

export class HealthScoreRecordMapper {
  static toDomain(row: HealthScoreRecordRow): HealthScoreRecord {
    return new HealthScoreRecord(
      row.id,
      row.agentId,
      row.score,
      toClassification(row.classification),
      row.errorRate,
      row.avgLatencyMs,
      row.heartbeatAgeS,
      row.calculatedAt
    );
  }

  static toPersistence(record: HealthScoreRecord): HealthScoreRecordRow {
    return {
      id: record.id,
      agentId: record.agentId,
      score: record.score,
      classification: record.classification,
      errorRate: record.errorRate,
      avgLatencyMs: record.avgLatencyMs,
      heartbeatAgeS: record.heartbeatAgeS,
      calculatedAt: record.calculatedAt
    };
  }
}
