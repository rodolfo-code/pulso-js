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
import { ListSLOEvaluationsUseCase } from "@/modules/slos/application/use-cases/list-slo-evaluations.use-case";
import { ListSLOsUseCase } from "@/modules/slos/application/use-cases/list-slos.use-case";
import { CreateSLOBody } from "@/modules/slos/presentation/dtos/create-slo.body";
import type { SLODefinition } from "@/shared/domain/entities/slo-definition.entity";
import type { SLOEvaluation } from "@/shared/domain/entities/slo-evaluation.entity";

@Controller("slos")
export class SLOsController {
  constructor(
    private readonly createSlo: CreateSLOUseCase,
    private readonly evaluateSlo: EvaluateSLOUseCase,
    private readonly listSlosUseCase: ListSLOsUseCase,
    private readonly listSloEvaluations: ListSLOEvaluationsUseCase
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
    return this.listSlosUseCase.execute();
  }

  @Post(":id/evaluate")
  @HttpCode(HttpStatus.CREATED)
  evaluate(@Param("id", new ParseUUIDPipe()) id: string): Promise<SLOEvaluation> {
    return this.evaluateSlo.execute(id);
  }

  @Get(":id/evaluations")
  listEvaluations(@Param("id", new ParseUUIDPipe()) id: string): Promise<SLOEvaluation[]> {
    return this.listSloEvaluations.execute(id);
  }
}
