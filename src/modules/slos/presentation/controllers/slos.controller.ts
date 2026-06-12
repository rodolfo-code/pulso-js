import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post
} from "@nestjs/common";

import { CreateSLOUseCase } from "@/modules/slos/application/use-cases/create-slo.use-case";
import { EvaluateSLOUseCase } from "@/modules/slos/application/use-cases/evaluate-slo.use-case";
import { CreateSLOBody } from "@/modules/slos/presentation/dtos/create-slo.body";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import type { SLODefinition } from "@/shared/domain/value-objects/slo-definition.vo";
import type { SLOEvaluation } from "@/shared/domain/value-objects/slo-evaluation.vo";
import { ISLORepo } from "@/shared/repositories/interfaces/slo-repo.interface";

@Controller("slos")
export class SLOsController {
  constructor(
    private readonly createSlo: CreateSLOUseCase,
    private readonly evaluateSlo: EvaluateSLOUseCase,
    private readonly sloRepo: ISLORepo
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateSLOBody): Promise<SLODefinition> {
    return this.createSlo.execute({
      agentId: body.agentId,
      metric: body.metric,
      operator: body.operator,
      threshold: body.threshold,
      windowHours: body.windowHours,
      enabled: body.enabled
    });
  }

  @Get()
  list(): Promise<SLODefinition[]> {
    return this.sloRepo.listSlos();
  }

  @Post(":id/evaluate")
  @HttpCode(HttpStatus.CREATED)
  evaluate(@Param("id", new ParseUUIDPipe()) id: string): Promise<SLOEvaluation> {
    return this.evaluateSlo.execute(id);
  }

  @Get(":id/evaluations")
  async listEvaluations(
    @Param("id", new ParseUUIDPipe()) id: string
  ): Promise<SLOEvaluation[]> {
    const slo = await this.sloRepo.getSlo(id);
    if (slo === null) {
      throw new DomainNotFoundError(`SLO not found: ${id}`);
    }
    return this.sloRepo.listEvaluations(id);
  }
}
