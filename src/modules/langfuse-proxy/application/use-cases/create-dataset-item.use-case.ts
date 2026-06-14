import { Injectable } from "@nestjs/common";
import type { ApiCreateDatasetItemRequest } from "langfuse";

import { DatasetItemDto } from "@/modules/langfuse-proxy/application/dtos/dataset-item.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class CreateDatasetItemUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(
    datasetName: string,
    data: ApiCreateDatasetItemRequest
  ): Promise<DatasetItemDto> {
    const raw = await this.langfuse.createDatasetItem(datasetName, data);
    return DatasetItemDto.fromLangfuse(raw);
  }
}
