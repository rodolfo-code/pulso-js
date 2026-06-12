import { Injectable } from "@nestjs/common";

import { SLODefinition } from "@/shared/domain/value-objects/slo-definition.vo";
import { SLOEvaluation } from "@/shared/domain/value-objects/slo-evaluation.vo";
import { PrismaService } from "@/shared/prisma/prisma.service";

import { ISLORepo } from "./interfaces/slo-repo.interface";
import { SLODefinitionMapper } from "./mappers/slo-definition.mapper";
import { SLOEvaluationMapper } from "./mappers/slo-evaluation.mapper";

@Injectable()
export class SLORepository extends ISLORepo {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createSlo(slo: SLODefinition): Promise<SLODefinition> {
    const row = SLODefinitionMapper.toPersistence(slo);
    const created = await this.prisma.sLODefinition.create({ data: row });
    return SLODefinitionMapper.toDomain(created);
  }

  async getSlo(sloId: string): Promise<SLODefinition | null> {
    const row = await this.prisma.sLODefinition.findUnique({ where: { id: sloId } });
    return row ? SLODefinitionMapper.toDomain(row) : null;
  }

  async listSlos(): Promise<SLODefinition[]> {
    const rows = await this.prisma.sLODefinition.findMany();
    return rows.map((row) => SLODefinitionMapper.toDomain(row));
  }

  async createEvaluation(evaluation: SLOEvaluation): Promise<SLOEvaluation> {
    const row = SLOEvaluationMapper.toPersistence(evaluation);
    const created = await this.prisma.sLOEvaluation.create({ data: row });
    return SLOEvaluationMapper.toDomain(created);
  }

  async listEvaluations(sloId: string): Promise<SLOEvaluation[]> {
    const rows = await this.prisma.sLOEvaluation.findMany({
      where: { sloId },
      orderBy: { evaluatedAt: "desc" }
    });
    return rows.map((row) => SLOEvaluationMapper.toDomain(row));
  }
}
