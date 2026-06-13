import { Injectable } from "@nestjs/common";

import { DatasetDto } from "@/modules/langfuse-proxy/application/dtos/dataset.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListDatasetsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(): Promise<DatasetDto[]> {
    const raw = await this.langfuse.getDatasets();
    return raw.map((d) => DatasetDto.fromLangfuse(d));
  }
}
