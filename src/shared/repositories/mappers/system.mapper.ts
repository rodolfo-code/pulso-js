import { System } from "@/shared/domain/entities/system.entity";

interface SystemRow {
  id: string;
  tenantId: string;
  slug: string;
  name: string;
  createdAt: Date;
}

export class SystemMapper {
  static toDomain(row: SystemRow): System {
    return new System(row.id, row.tenantId, row.slug, row.name, row.createdAt);
  }

  static toPersistence(system: System): SystemRow {
    return {
      id: system.id,
      tenantId: system.tenantId,
      slug: system.slug,
      name: system.name,
      createdAt: system.createdAt
    };
  }
}
