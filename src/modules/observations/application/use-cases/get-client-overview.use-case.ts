import { Inject, Injectable, Logger } from "@nestjs/common";

import { extractHierarchy } from "@/shared/domain/services/extract-hierarchy.service";
import {
  ILangfuseClient,
  type LangfuseFilters
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAgentRepo } from "@/shared/repositories/interfaces/agent-repo.interface";

export interface ClientOverview {
  userId: string;
  tenantId: string;
  system: string;
  agent: {
    slug: string;
    name: string;
    status: string;
    version: string;
  } | null;
  traceCount: number;
  traceIds: (string | null)[];
}

@Injectable()
export class GetClientOverviewUseCase {
  private readonly logger = new Logger(GetClientOverviewUseCase.name);

  constructor(
    private readonly agentRepo: IAgentRepo,
    @Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient
  ) {}

  async execute(filters?: LangfuseFilters): Promise<ClientOverview[]> {
    const agents = await this.agentRepo.listAgents();
    const agentMap = new Map(agents.map((a) => [a.slug, a]));

    let traces: Record<string, unknown>[] = [];
    try {
      traces = await this.langfuse.getTraces(filters);
    } catch (error) {
      this.logger.warn(
        "Failed to fetch traces for client overview",
        error instanceof Error ? error.stack : error
      );
    }

    const clients = new Map<string, ClientOverview>();

    for (const trace of traces) {
      const h = extractHierarchy(trace);
      const userId = h.userId || "__anonymous__";

      let entry = clients.get(userId);
      if (entry === undefined) {
        entry = {
          userId,
          tenantId: h.tenantId,
          system: h.system,
          agent: null,
          traceCount: 0,
          traceIds: []
        };
        clients.set(userId, entry);
      }

      entry.tenantId = h.tenantId;
      entry.system = h.system;
      entry.traceCount += 1;
      const rawId = trace["id"];
      entry.traceIds.push(typeof rawId === "string" ? rawId : null);

      // Enriquece com identidade do agent quando possível (1ª vez encontrado)
      if (h.agent && entry.agent === null) {
        const agent = agentMap.get(h.agent);
        if (agent !== undefined) {
          entry.agent = {
            slug: agent.slug,
            name: agent.name,
            status: agent.status,
            version: agent.version
          };
        }
      }
    }

    return Array.from(clients.values());
  }
}
