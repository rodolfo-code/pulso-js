import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from "class-validator";

import { SLOOperator } from "@/shared/domain/entities/slo-definition.entity";

export class CreateSLOBody {
  @IsUUID()
  agentId!: string;

  @IsString()
  metric!: string;

  @IsIn([SLOOperator.LTE, SLOOperator.GTE, SLOOperator.LT, SLOOperator.GT])
  operator!: SLOOperator;

  @IsNumber()
  threshold!: number;

  @IsInt()
  @Min(1)
  windowHours!: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
