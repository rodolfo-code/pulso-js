import { Injectable } from "@nestjs/common";

import { PromptDto } from "@/modules/langfuse-proxy/application/dtos/prompt.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListPromptsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(): Promise<PromptDto[]> {
    const raw = await this.langfuse.getPrompts();
    return raw.map((d) => PromptDto.fromLangfuse(d));
  }
}
