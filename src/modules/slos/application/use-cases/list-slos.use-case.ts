import { Injectable } from "@nestjs/common";

import type { SLODefinition } from "@/shared/domain/value-objects/slo-definition.vo";
import { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";

@Injectable()
export class ListSLOsUseCase {
  constructor(private readonly sloRepo: ISLORepo) {}

  execute(): Promise<SLODefinition[]> {
    return this.sloRepo.listSlos();
  }
}
