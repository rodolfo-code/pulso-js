import { Module } from "@nestjs/common";

import { GetClientOverviewUseCase } from "./application/use-cases/get-client-overview.use-case";
import { GetConversationDetailUseCase } from "./application/use-cases/get-conversation-detail.use-case";
import { GetConversationListUseCase } from "./application/use-cases/get-conversation-list.use-case";
import { ObservationsController } from "./presentation/controllers/observations.controller";

@Module({
  controllers: [ObservationsController],
  providers: [
    GetClientOverviewUseCase,
    GetConversationDetailUseCase,
    GetConversationListUseCase
  ]
})
export class ObservationsModule {}
