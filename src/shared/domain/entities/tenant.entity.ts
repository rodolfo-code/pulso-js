export class Tenant {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public name: string,
    public plan: string,
    public readonly createdAt: Date
  ) {}
}
