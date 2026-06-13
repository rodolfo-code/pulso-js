import type { AgentSnapshot } from "@/shared/domain/entities/agent-snapshot.entity";

export abstract class ISnapshotRepo {
  abstract createSnapshot(snapshot: AgentSnapshot): Promise<AgentSnapshot>;
  abstract getLatestSnapshot(agentId: string): Promise<AgentSnapshot | null>;
}
