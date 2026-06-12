import { Injectable } from "@nestjs/common";

import { Agent } from "@/shared/domain/entities/agent.entity";
import { System } from "@/shared/domain/entities/system.entity";
import { Tenant } from "@/shared/domain/entities/tenant.entity";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { IAgentRepo } from "./interfaces/agent-repo.interface";
import { AgentMapper } from "./mappers/agent.mapper";
import { SystemMapper } from "./mappers/system.mapper";
import { TenantMapper } from "./mappers/tenant.mapper";

@Injectable()
export class AgentRepository extends IAgentRepo {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  // ── Tenant ──────────────────────────────────────────────────────────
  async createTenant(tenant: Tenant): Promise<Tenant> {
    const row = TenantMapper.toPersistence(tenant);
    const created = await this.prisma.tenant.create({ data: row });
    return TenantMapper.toDomain(created);
  }

  async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({ where: { slug } });
    return row ? TenantMapper.toDomain(row) : null;
  }

  // ── System ──────────────────────────────────────────────────────────
  async createSystem(system: System): Promise<System> {
    const row = SystemMapper.toPersistence(system);
    const created = await this.prisma.system.create({ data: row });
    return SystemMapper.toDomain(created);
  }

  async getSystem(tenantId: string, slug: string): Promise<System | null> {
    const row = await this.prisma.system.findUnique({
      where: { tenantId_slug: { tenantId, slug } }
    });
    return row ? SystemMapper.toDomain(row) : null;
  }

  // ── Agent ───────────────────────────────────────────────────────────
  async createAgent(agent: Agent): Promise<Agent> {
    const row = AgentMapper.toPersistence(agent);
    const created = await this.prisma.agent.create({ data: row });
    return AgentMapper.toDomain(created);
  }

  async getAgentBySlug(slug: string): Promise<Agent | null> {
    const row = await this.prisma.agent.findUnique({ where: { slug } });
    return row ? AgentMapper.toDomain(row) : null;
  }

  async getAgentById(agentId: string): Promise<Agent | null> {
    const row = await this.prisma.agent.findUnique({ where: { id: agentId } });
    return row ? AgentMapper.toDomain(row) : null;
  }

  async listAgents(): Promise<Agent[]> {
    const rows = await this.prisma.agent.findMany();
    return rows.map((row) => AgentMapper.toDomain(row));
  }

  async updateAgent(agent: Agent): Promise<Agent> {
    const row = AgentMapper.toPersistence(agent);
    const updated = await this.prisma.agent.update({
      where: { id: agent.id },
      data: {
        slug: row.slug,
        name: row.name,
        description: row.description,
        version: row.version,
        baseUrl: row.baseUrl,
        status: row.status,
        lastHeartbeatAt: row.lastHeartbeatAt
      }
    });
    return AgentMapper.toDomain(updated);
  }
}
