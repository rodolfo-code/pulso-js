import { Inject, Injectable } from "@nestjs/common";
import type { ApiSession } from "langfuse";

import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetConversationListUseCase {
  constructor(@Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient) {}

  execute(): Promise<ApiSession[]> {
    return this.langfuse.getSessions();
  }
}