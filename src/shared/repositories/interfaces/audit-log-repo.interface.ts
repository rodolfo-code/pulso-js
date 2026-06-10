import type { AuditLogEntry } from "@/shared/domain/value-objects/audit-log-entry.vo";

export abstract class IAuditLogRepo {
  abstract append(entry: AuditLogEntry): Promise<void>;
}
