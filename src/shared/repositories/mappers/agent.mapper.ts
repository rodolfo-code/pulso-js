import { Agent } from "@/shared/domain/entities/agent.entity";
import { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";

interface AgentRow {
  id: string;
  systemId: string;
  slug: string;
  name: string;
  description: string;
  version: string;
  baseUrl: string;
  status: AgentStatus;
  lastHeartbeatAt: Date | null;
  registeredAt: Date;
}

function toAgentStatus(raw: string): AgentStatus {
  switch (raw) {
    case AgentStatus.UNKNOWN:
    case AgentStatus.HEALTHY:
    case AgentStatus.DEGRADED:
    case AgentStatus.UNHEALTHY:
      return raw;
    default:
      throw new Error(`Unknown AgentStatus value from database: ${raw}`);
  }
}

export class AgentMapper {
  static toDomain(row: AgentRow): Agent {
    return new Agent(
      row.id,
      row.systemId,
      row.slug,
      row.name,
      row.description,
      row.version,
      row.baseUrl,
      toAgentStatus(row.status),
      row.lastHeartbeatAt,
      row.registeredAt
    );
  }

  static toPersistence(agent: Agent): AgentRow {
    return {
      id: agent.id,
      systemId: agent.systemId,
      slug: agent.slug,
      name: agent.name,
      description: agent.description,
      version: agent.version,
      baseUrl: agent.baseUrl,
      status: agent.status,
      lastHeartbeatAt: agent.lastHeartbeatAt,
      registeredAt: agent.registeredAt
    };
  }
}
