import type { HealthScoreRecord } from "@/shared/domain/entities/health-score-record.entity";

export abstract class IHealthScoreRepo {
  abstract createHealthScore(record: HealthScoreRecord): Promise<HealthScoreRecord>;
}
