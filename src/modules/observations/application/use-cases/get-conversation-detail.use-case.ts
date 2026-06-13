import { Inject, Injectable, Logger } from "@nestjs/common";

import type {
  ConversationDetailDto,
  EnrichedTraceDto
} from "@/modules/observations/application/dtos/conversation-detail.dto";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { extractHierarchy } from "@/shared/domain/services/extract-hierarchy.service";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import {
  ILangfuseClient,
  type LangfuseEntity
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetConversationDetailUseCase {
  private readonly logger = new Logger(GetConversationDetailUseCase.name);

  constructor(
    @Inject(ILangfuseClient) private readonly langfuse: ILangfuseClient
  ) {}

  async execute(sessionId: string): Promise<ConversationDetailDto> {
    let session: LangfuseEntity;
    try {
      session = await this.langfuse.getSession(sessionId);
    } catch (error) {
      // Só vira 404 quando o Langfuse explicitamente respondeu 404.
      // Outros erros (502 upstream, 504 timeout, auth, rede) propagam como vieram —
      // o DomainExceptionFilter global mapeia cada um pra o status apropriado.
      if (error instanceof LangfuseUpstreamError && error.httpStatus === 404) {
        throw new DomainNotFoundError(`Session not found: ${sessionId}`, { cause: error });
      }
      throw error;
    }

    let traces: Record<string, unknown>[] = [];
    try {
      traces = await this.langfuse.getTraces({ sessionId });
    } catch (error) {
      this.logger.warn(
        `Failed to fetch traces for session=${sessionId}`,
        error instanceof Error ? error.stack : error
      );
    }

    const enrichedTraces: EnrichedTraceDto[] = traces.map((trace) => {
      const h = extractHierarchy(trace);
      return {
        ...trace,
        hierarchy: {
          tenantId: h.tenantId,
          system: h.system,
          agent: h.agent,
          userId: h.userId,
          sessionId: h.sessionId
        }
      };
    });

    // Remove os traces que o Langfuse incluiu dentro do response da session —
    // ficam duplicados com `traces` (enriquecido). Decisão consciente de divergir
    // do legado pra eliminar payload redundante.
    const sessionWithoutTraces: LangfuseEntity = { ...session };
    delete sessionWithoutTraces["traces"];

    return { session: sessionWithoutTraces, traces: enrichedTraces };
  }
}