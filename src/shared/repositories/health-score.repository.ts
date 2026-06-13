import { Injectable } from "@nestjs/common";

import { HealthScoreRecord } from "@/shared/domain/entities/health-score-record.entity";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { IHealthScoreRepo } from "./interfaces/health-score-repo.interface";
import { HealthScoreRecordMapper } from "./mappers/health-score-record.mapper";

@Injectable()
export class HealthScoreRepository extends IHealthScoreRepo {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createHealthScore(record: HealthScoreRecord): Promise<HealthScoreRecord> {
    const row = HealthScoreRecordMapper.toPersistence(record);
    const created = await this.prisma.healthScoreHistory.create({ data: row });
    return HealthScoreRecordMapper.toDomain(created);
  }
}
