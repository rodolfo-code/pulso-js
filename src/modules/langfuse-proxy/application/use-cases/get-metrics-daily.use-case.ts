import { Injectable } from "@nestjs/common";

import { MetricsDailyDto } from "@/modules/langfuse-proxy/application/dtos/metrics-daily.dto";
import {
  ILangfuseClient,
  type LangfuseFilters
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class GetMetricsDailyUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(filters?: LangfuseFilters): Promise<MetricsDailyDto> {
    const raw = await this.langfuse.getMetricsDaily(filters);
    return MetricsDailyDto.fromLangfuse(raw);
  }
}
