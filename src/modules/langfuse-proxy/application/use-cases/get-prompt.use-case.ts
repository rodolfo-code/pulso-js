import { Injectable } from "@nestjs/common";

import { PromptDto } from "@/modules/langfuse-proxy/application/dtos/prompt.dto";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetPromptUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(name: string): Promise<PromptDto> {
    try {
      const raw = await this.langfuse.getPrompt(name);
      return PromptDto.fromLangfuse(raw);
    } catch (error) {
      if (error instanceof LangfuseUpstreamError && error.httpStatus === 404) {
        throw new DomainNotFoundError(`Prompt not found: ${name}`, { cause: error });
      }
      throw error;
    }
  }
}
