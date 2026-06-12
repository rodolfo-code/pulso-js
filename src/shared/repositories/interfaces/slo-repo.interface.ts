import type { SLODefinition } from "@/shared/domain/value-objects/slo-definition.vo";
import type { SLOEvaluation } from "@/shared/domain/value-objects/slo-evaluation.vo";

export abstract class ISLORepo {
  abstract createSlo(slo: SLODefinition): Promise<SLODefinition>;
  abstract getSlo(sloId: string): Promise<SLODefinition | null>;
  abstract listSlos(): Promise<SLODefinition[]>;
  abstract createEvaluation(evaluation: SLOEvaluation): Promise<SLOEvaluation>;
  abstract listEvaluations(sloId: string): Promise<SLOEvaluation[]>;
}
