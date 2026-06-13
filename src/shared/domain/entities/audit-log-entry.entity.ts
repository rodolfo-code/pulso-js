export class AuditLogEntry {
  constructor(
    public readonly id: string,
    public readonly entityType: string,
    public readonly entityId: string,
    public readonly action: string,
    public readonly actor: string,
    public readonly payload: Record<string, unknown>,
    public readonly occurredAt: Date
  ) {}

  static create(params: {
    entityType: string;
    entityId: string;
    action: string;
    actor: string;
    payload: Record<string, unknown>;
  }): AuditLogEntry {
    return new AuditLogEntry(
      crypto.randomUUID(),
      params.entityType,
      params.entityId,
      params.action,
      params.actor,
      params.payload,
      new Date()
    );
  }
}
