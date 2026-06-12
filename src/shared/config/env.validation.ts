import { plainToInstance, Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsPositive, IsString, validateSync } from "class-validator";

export class EnvConfig {
  @IsString()
  @IsNotEmpty()
  databaseUrl!: string;

  @IsString()
  @IsNotEmpty()
  langfuseBaseUrl!: string;

  @IsString()
  @IsNotEmpty()
  langfusePublicKey!: string;

  @IsString()
  @IsNotEmpty()
  langfuseSecretKey!: string;

  @IsString()
  @IsNotEmpty()
  observatoryApiKey!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  heartbeatTimeoutSeconds!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  conversationSlowThresholdMs!: number;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  sloMinTracesForEvaluation!: number;
}

export function validateEnv(rawEnv: Record<string, unknown>): EnvConfig {
  const mapped = {
    databaseUrl: rawEnv["DATABASE_URL"],
    langfuseBaseUrl: rawEnv["LANGFUSE_BASE_URL"],
    langfusePublicKey: rawEnv["LANGFUSE_PUBLIC_KEY"],
    langfuseSecretKey: rawEnv["LANGFUSE_SECRET_KEY"],
    observatoryApiKey: rawEnv["OBSERVATORY_API_KEY"],
    heartbeatTimeoutSeconds: rawEnv["HEARTBEAT_TIMEOUT_SECONDS"] ?? 120,
    conversationSlowThresholdMs: rawEnv["CONVERSATION_SLOW_THRESHOLD_MS"] ?? 8000,
    sloMinTracesForEvaluation: rawEnv["SLO_MIN_TRACES_FOR_EVALUATION"] ?? 10
  };
  const validated = plainToInstance(EnvConfig, mapped);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${JSON.stringify(errors)}`);
  }
  return validated;
}