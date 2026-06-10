import { IsOptional, IsString } from "class-validator";

export class CreatePromptBody {
  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsOptional()
  @IsString()
  systemSlug?: string;

  @IsOptional()
  @IsString()
  agentSlug?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
