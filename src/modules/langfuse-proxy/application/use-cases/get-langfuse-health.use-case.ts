import { Injectable } from "@nestjs/common";

import { LangfuseHealthDto } from "@/modules/langfuse-proxy/application/dtos/langfuse-health.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetLangfuseHealthUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(): Promise<LangfuseHealthDto> {
    const raw = await this.langfuse.getHealth();
    return LangfuseHealthDto.fromLangfuse(raw);
  }
}
