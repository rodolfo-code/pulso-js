import type { Agent } from "@/shared/domain/entities/agent.entity";
import type { System } from "@/shared/domain/entities/system.entity";
import type { Tenant } from "@/shared/domain/entities/tenant.entity";

export abstract class IAgentRepo {
  abstract createTenant(tenant: Tenant): Promise<Tenant>;
  abstract getTenantBySlug(slug: string): Promise<Tenant | null>;

  abstract createSystem(system: System): Promise<System>;
  abstract getSystem(tenantId: string, slug: string): Promise<System | null>;

  abstract createAgent(agent: Agent): Promise<Agent>;
  abstract getAgentBySlug(slug: string): Promise<Agent | null>;
  abstract getAgentById(agentId: string): Promise<Agent | null>;
  abstract listAgents(): Promise<Agent[]>;
  abstract updateAgent(agent: Agent): Promise<Agent>;
}
