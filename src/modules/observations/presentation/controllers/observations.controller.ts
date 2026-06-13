import { Controller, Get, Param } from "@nestjs/common";

import type { ClientOverviewDto } from "@/modules/observations/application/dtos/client-overview.dto";
import type { ConversationDetailDto } from "@/modules/observations/application/dtos/conversation-detail.dto";
import { GetClientOverviewUseCase } from "@/modules/observations/application/use-cases/get-client-overview.use-case";
import { GetConversationDetailUseCase } from "@/modules/observations/application/use-cases/get-conversation-detail.use-case";
import { GetConversationListUseCase } from "@/modules/observations/application/use-cases/get-conversation-list.use-case";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import type { LangfuseList } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Controller("observations")
export class ObservationsController {
  constructor(
    private readonly getClientOverview: GetClientOverviewUseCase,
    private readonly getConversationDetail: GetConversationDetailUseCase,
    private readonly getConversationList: GetConversationListUseCase
  ) {}

  @Get("clients")
  listClients(): Promise<ClientOverviewDto[]> {
    return this.getClientOverview.execute();
  }

  @Get("clients/:clientId")
  async getClient(@Param("clientId") clientId: string): Promise<ClientOverviewDto> {
    const results = await this.getClientOverview.execute({ userId: clientId });
    const first = results[0];
    if (first === undefined) {
      throw new DomainNotFoundError(`Client not found: ${clientId}`);
    }
    return first;
  }

  @Get("conversations")
  listConversations(): Promise<LangfuseList> {
    return this.getConversationList.execute();
  }

  @Get("conversations/:sessionId")
  getConversation(@Param("sessionId") sessionId: string): Promise<ConversationDetailDto> {
    return this.getConversationDetail.execute(sessionId);
  }
}