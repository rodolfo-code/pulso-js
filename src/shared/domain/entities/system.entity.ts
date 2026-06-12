export class System {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly slug: string,
    public name: string,
    public readonly createdAt: Date
  ) {}
}
