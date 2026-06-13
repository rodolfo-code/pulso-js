import { Injectable } from "@nestjs/common";

import { DatasetItemDto } from "@/modules/langfuse-proxy/application/dtos/dataset-item.dto";
import {
  ILangfuseClient,
  type LangfuseEntity
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class CreateDatasetItemUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(datasetName: string, data: LangfuseEntity): Promise<DatasetItemDto> {
    const raw = await this.langfuse.createDatasetItem(datasetName, data);
    return DatasetItemDto.fromLangfuse(raw);
  }
}
