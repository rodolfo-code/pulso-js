import { AuditLogEntry } from "@/shared/domain/entities/audit-log-entry.entity";
import type { Prisma } from "@prisma-client/client";

interface AuditLogRowRead {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  payload: Prisma.JsonValue;
  occurredAt: Date;
}

interface AuditLogRowWrite {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actor: string;
  payload: Prisma.InputJsonValue;
  occurredAt: Date;
}

export class AuditLogMapper {
  static toDomain(row: AuditLogRowRead): AuditLogEntry {
    return new AuditLogEntry(
      row.id,
      row.entityType,
      row.entityId,
      row.action,
      row.actor,
      (row.payload ?? {}) as Record<string, unknown>,
      row.occurredAt
    );
  }

  static toPersistence(entry: AuditLogEntry): AuditLogRowWrite {
    return {
      id: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actor: entry.actor,
      payload: entry.payload as Prisma.InputJsonValue,
      occurredAt: entry.occurredAt
    };
  }
}
