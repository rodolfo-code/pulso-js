export class HierarchyFields {
  constructor(
    public readonly tenantId: string,
    public readonly system: string,
    public readonly agent: string,
    public readonly userId: string,
    public readonly sessionId: string
  ) {}
}
