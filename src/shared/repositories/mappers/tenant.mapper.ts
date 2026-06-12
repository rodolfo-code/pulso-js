import { Tenant } from "@/shared/domain/entities/tenant.entity";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  plan: string;
  createdAt: Date;
}

export class TenantMapper {
  static toDomain(row: TenantRow): Tenant {
    return new Tenant(row.id, row.slug, row.name, row.plan, row.createdAt);
  }

  static toPersistence(tenant: Tenant): TenantRow {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      plan: tenant.plan,
      createdAt: tenant.createdAt
    };
  }
}
