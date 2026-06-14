import { Injectable } from "@nestjs/common";
import type { ApiCreateDatasetRequest } from "langfuse";

import { DatasetDto } from "@/modules/langfuse-proxy/application/dtos/dataset.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class CreateDatasetUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(data: ApiCreateDatasetRequest): Promise<DatasetDto> {
    const raw = await this.langfuse.createDataset(data);
    return DatasetDto.fromLangfuse(raw);
  }
}
