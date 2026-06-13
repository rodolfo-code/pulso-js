import { Injectable } from "@nestjs/common";

import { SessionDto } from "@/modules/langfuse-proxy/application/dtos/session.dto";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetSessionUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(sessionId: string): Promise<SessionDto> {
    try {
      const raw = await this.langfuse.getSession(sessionId);
      return SessionDto.fromLangfuse(raw);
    } catch (error) {
      if (error instanceof LangfuseUpstreamError && error.httpStatus === 404) {
        throw new DomainNotFoundError(`Session not found: ${sessionId}`, { cause: error });
      }
      throw error;
    }
  }
}
