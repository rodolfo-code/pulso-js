import { Inject, Injectable } from "@nestjs/common";

import {
  ILangfuseClient,
  type LangfuseList
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetConversationListUseCase {
  constructor(@Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient) {}

  execute(): Promise<LangfuseList> {
    return this.langfuse.getSessions();
  }
}
