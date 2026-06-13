import { Injectable } from "@nestjs/common";

import { TraceDto } from "@/modules/langfuse-proxy/application/dtos/trace.dto";
import {
  ILangfuseClient,
  type LangfuseFilters
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListTracesUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(filters?: LangfuseFilters): Promise<TraceDto[]> {
    const raw = await this.langfuse.getTraces(filters);
    return raw.map((d) => TraceDto.fromLangfuse(d));
  }
}
