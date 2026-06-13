import { Injectable } from "@nestjs/common";

import { SessionDto } from "@/modules/langfuse-proxy/application/dtos/session.dto";
import {
  ILangfuseClient,
  type LangfuseFilters
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListSessionsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(filters?: LangfuseFilters): Promise<SessionDto[]> {
    const raw = await this.langfuse.getSessions(filters);
    return raw.map((d) => SessionDto.fromLangfuse(d));
  }
}
