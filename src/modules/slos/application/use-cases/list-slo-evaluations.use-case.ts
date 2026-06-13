import { Injectable } from "@nestjs/common";

import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import type { SLOEvaluation } from "@/shared/domain/value-objects/slo-evaluation.vo";
import { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";

@Injectable()
export class ListSLOEvaluationsUseCase {
  constructor(private readonly sloRepo: ISLORepo) {}

  async execute(sloId: string): Promise<SLOEvaluation[]> {
    const slo = await this.sloRepo.getSlo(sloId);
    if (slo === null) {
      throw new DomainNotFoundError(`SLO not found: ${sloId}`);
    }
    return this.sloRepo.listEvaluations(sloId);
  }
}
