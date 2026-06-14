import { Injectable } from "@nestjs/common";

import { PromptMetaDto } from "@/modules/langfuse-proxy/application/dtos/prompt-meta.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListPromptsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(): Promise<PromptMetaDto[]> {
    const raw = await this.langfuse.getPrompts();
    return raw.map((d) => PromptMetaDto.fromLangfuse(d));
  }
}