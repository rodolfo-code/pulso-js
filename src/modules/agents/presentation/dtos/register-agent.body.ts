import { IsOptional, IsString } from "class-validator";

export class RegisterAgentBody {
  @IsString()
  slug!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  version!: string;

  @IsString()
  baseUrl!: string;

  @IsString()
  tenantSlug!: string;

  @IsString()
  systemSlug!: string;
}
