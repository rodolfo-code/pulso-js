import { Injectable } from "@nestjs/common";

import { ObservationDto } from "@/modules/langfuse-proxy/application/dtos/observation.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListTraceObservationsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(traceId: string): Promise<ObservationDto[]> {
    const raw = await this.langfuse.getTraceObservations(traceId);
    return raw.map((d) => ObservationDto.fromLangfuse(d));
  }
}
