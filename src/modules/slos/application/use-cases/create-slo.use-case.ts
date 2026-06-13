import { Injectable } from "@nestjs/common";

import {
  SLODefinition,
  type SLOOperator
} from "@/shared/domain/entities/slo-definition.entity";
import { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";

export interface CreateSLORequest {
  agentId: string;
  metric: string;
  operator: SLOOperator;
  threshold: number;
  windowHours: number;
  enabled?: boolean;
}

@Injectable()
export class CreateSLOUseCase {
  constructor(private readonly sloRepo: ISLORepo) {}

  async execute(data: CreateSLORequest): Promise<SLODefinition> {
    const slo = new SLODefinition(
      crypto.randomUUID(),
      data.agentId,
      data.metric,
      data.operator,
      data.threshold,
      data.windowHours,
      data.enabled ?? true,
      new Date()
    );
    return this.sloRepo.createSlo(slo);
  }
}
