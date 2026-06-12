import type { HealthScoreRecord } from "@/shared/domain/value-objects/health-score-record.vo";

export abstract class IHealthScoreRepo {
  abstract createHealthScore(record: HealthScoreRecord): Promise<HealthScoreRecord>;
}
