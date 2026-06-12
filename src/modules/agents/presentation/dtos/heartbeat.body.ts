import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

import { BreakerState } from "@/shared/domain/value-objects/circuit-breaker-state.vo";

export class CircuitBreakerBody {
  @IsString()
  name!: string;

  @IsIn([BreakerState.CLOSED, BreakerState.OPEN, BreakerState.HALF_OPEN])
  state!: BreakerState;

  @IsInt()
  @Min(0)
  failCount!: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  lastStateChange?: Date | null;
}

export class HeartbeatBody {
  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  errorCount?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CircuitBreakerBody)
  circuitBreakers?: CircuitBreakerBody[];
}
