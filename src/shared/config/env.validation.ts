import { plainToInstance } from "class-transformer";
import { IsNotEmpty, IsString, validateSync } from "class-validator";

export class EnvConfig {
  @IsString()
  @IsNotEmpty()
  databaseUrl!: string;

  @IsString()
  @IsNotEmpty()
  langfuseBaseUrl!: string;
}

export function validateEnv(rawEnv: Record<string, unknown>): EnvConfig {
  const mapped = {
    databaseUrl: rawEnv["DATABASE_URL"],
    langfuseBaseUrl: rawEnv["LANGFUSE_BASE_URL"]
  };
  const validated = plainToInstance(EnvConfig, mapped);
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment: ${JSON.stringify(errors)}`);
  }
  return validated;
}