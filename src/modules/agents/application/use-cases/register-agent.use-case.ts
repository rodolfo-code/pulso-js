import { Injectable, Logger } from "@nestjs/common";

import { Agent } from "@/shared/domain/entities/agent.entity";
import { AuditLogEntry } from "@/shared/domain/entities/audit-log-entry.entity";
import { System } from "@/shared/domain/entities/system.entity";
import { Tenant } from "@/shared/domain/entities/tenant.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

export interface RegisterAgentRequest {
  slug: string;
  name: string;
  description: string;
  version: string;
  baseUrl: string;
  tenantSlug: string;
  systemSlug: string;
}

@Injectable()
export class RegisterAgentUseCase {
  private readonly logger = new Logger(RegisterAgentUseCase.name);

  constructor(
    private readonly agentRepo: IAgentRepo,
    private readonly auditRepo: IAuditLogRepo
  ) {}

  async execute(data: RegisterAgentRequest): Promise<Agent> {
    const now = new Date();

    // Resolve or create tenant
    let tenant = await this.agentRepo.getTenantBySlug(data.tenantSlug);
    if (tenant === null) {
      tenant = await this.agentRepo.createTenant(
        new Tenant(crypto.randomUUID(), data.tenantSlug, data.tenantSlug, "default", now)
      );
    }

    // Resolve or create system
    let system = await this.agentRepo.getSystem(tenant.id, data.systemSlug);
    if (system === null) {
      system = await this.agentRepo.createSystem(
        new System(crypto.randomUUID(), tenant.id, data.systemSlug, data.systemSlug, now)
      );
    }

    // Idempotent upsert: update mutable fields if agent already exists
    const existing = await this.agentRepo.getAgentBySlug(data.slug);
    let agent: Agent;
    let auditAction: string;
    if (existing !== null) {
      existing.name = data.name;
      existing.description = data.description;
      existing.version = data.version;
      existing.baseUrl = data.baseUrl;
      agent = await this.agentRepo.updateAgent(existing);
      auditAction = "agent_re_registered";
    } else {
      agent = await this.agentRepo.createAgent(
        new Agent(
          crypto.randomUUID(),
          system.id,
          data.slug,
          data.name,
          data.description,
          data.version,
          data.baseUrl,
          AgentStatus.UNKNOWN,
          null,
          now
        )
      );
      auditAction = "agent_registered";
    }

    try {
      const entry = AuditLogEntry.create({
        entityType: "agent",
        entityId: agent.id,
        action: auditAction,
        actor: "system",
        payload: { slug: agent.slug, version: agent.version }
      });
      await this.auditRepo.append(entry);
    } catch (error) {
      this.logger.warn(
        `audit_log write failed for ${auditAction} agent=${agent.slug}`,
        error instanceof Error ? error.stack : error
      );
    }

    return agent;
  }
}
