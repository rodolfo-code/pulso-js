import { Injectable } from "@nestjs/common";

import { DatasetItemDto } from "@/modules/langfuse-proxy/application/dtos/dataset-item.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListDatasetItemsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(datasetName: string): Promise<DatasetItemDto[]> {
    const raw = await this.langfuse.getDatasetItems(datasetName);
    return raw.map((d) => DatasetItemDto.fromLangfuse(d));
  }
}
