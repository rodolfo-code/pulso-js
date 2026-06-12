import type { AgentSnapshot } from "@/shared/domain/value-objects/agent-snapshot.vo";

export abstract class ISnapshotRepo {
  abstract createSnapshot(snapshot: AgentSnapshot): Promise<AgentSnapshot>;
  abstract getLatestSnapshot(agentId: string): Promise<AgentSnapshot | null>;
}
