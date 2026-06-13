import type { AuditLogEntry } from "@/shared/domain/entities/audit-log-entry.entity";

export abstract class IAuditLogRepo {
  abstract append(entry: AuditLogEntry): Promise<void>;
}
