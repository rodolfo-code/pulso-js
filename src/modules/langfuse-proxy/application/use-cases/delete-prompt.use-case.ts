import { Injectable } from "@nestjs/common";

import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class DeletePromptUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(name: string): Promise<void> {
    await this.langfuse.deletePrompt(name);
  }
}
