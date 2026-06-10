import { IsOptional, IsString } from "class-validator";

export class CreateScoreConfigBody {
  @IsOptional()
  @IsString()
  tenantSlug?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
