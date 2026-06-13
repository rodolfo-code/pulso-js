import { Injectable, Logger } from "@nestjs/common";

import { AuditLogEntry } from "@/shared/domain/entities/audit-log-entry.entity";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { IAuditLogRepo } from "./interfaces/audit-log-repo.interface";
import { AuditLogMapper } from "./mappers/audit-log.mapper";

@Injectable()
export class AuditLogRepository extends IAuditLogRepo {
  private readonly logger = new Logger(AuditLogRepository.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async append(entry: AuditLogEntry): Promise<void> {
    const row = AuditLogMapper.toPersistence(entry);
    await this.prisma.auditLog.create({ data: row });
    this.logger.debug(
      `audit appended: ${entry.action} on ${entry.entityType}/${entry.entityId}`
    );
  }
}
