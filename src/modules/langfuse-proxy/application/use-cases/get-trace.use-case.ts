import { Injectable } from "@nestjs/common";

import { TraceDto } from "@/modules/langfuse-proxy/application/dtos/trace.dto";
import { DomainNotFoundError } from "@/shared/domain/errors/domain-not-found.error";
import { LangfuseUpstreamError } from "@/shared/langfuse-client/errors/langfuse-upstream.error";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetTraceUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(traceId: string): Promise<TraceDto> {
    try {
      const raw = await this.langfuse.getTrace(traceId);
      return TraceDto.fromLangfuse(raw);
    } catch (error) {
      if (error instanceof LangfuseUpstreamError && error.httpStatus === 404) {
        throw new DomainNotFoundError(`Trace not found: ${traceId}`, { cause: error });
      }
      throw error;
    }
  }
}
