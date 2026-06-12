import { Injectable } from "@nestjs/common";

import { AgentSnapshot } from "@/shared/domain/value-objects/agent-snapshot.vo";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { ISnapshotRepo } from "./interfaces/snapshot-repo.interface";
import { AgentSnapshotMapper } from "./mappers/agent-snapshot.mapper";

@Injectable()
export class SnapshotRepository extends ISnapshotRepo {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createSnapshot(snapshot: AgentSnapshot): Promise<AgentSnapshot> {
    const row = AgentSnapshotMapper.toPersistence(snapshot);
    const created = await this.prisma.agentSnapshot.create({ data: row });
    return AgentSnapshotMapper.toDomain(created);
  }

  async getLatestSnapshot(agentId: string): Promise<AgentSnapshot | null> {
    const row = await this.prisma.agentSnapshot.findFirst({
      where: { agentId },
      orderBy: { calculatedAt: "desc" }
    });
    return row ? AgentSnapshotMapper.toDomain(row) : null;
  }
}
