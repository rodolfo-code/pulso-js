import { Injectable } from "@nestjs/common";

import { DatasetDto } from "@/modules/langfuse-proxy/application/dtos/dataset.dto";
import {
  ILangfuseClient,
  type LangfuseEntity
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class CreateDatasetUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(data: LangfuseEntity): Promise<DatasetDto> {
    const raw = await this.langfuse.createDataset(data);
    return DatasetDto.fromLangfuse(raw);
  }
}
