import { IsNumber, IsOptional, IsString } from "class-validator";

export class WriteScoreBody {
  @IsString()
  traceId!: string;

  @IsString()
  name!: string;

  @IsNumber()
  value!: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
