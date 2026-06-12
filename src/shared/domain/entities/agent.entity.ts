import type { AgentStatus } from "@/shared/domain/value-objects/agent-status.vo";

export class Agent {
  constructor(
    public readonly id: string,
    public readonly systemId: string,
    public slug: string,
    public name: string,
    public description: string,
    public version: string,
    public baseUrl: string,
    public status: AgentStatus,
    public lastHeartbeatAt: Date | null,
    public readonly registeredAt: Date
  ) {}
}
