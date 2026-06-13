import { Injectable } from "@nestjs/common";

import { ScoreConfigDto } from "@/modules/langfuse-proxy/application/dtos/score-config.dto";
import { ILangfuseClient } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListScoreConfigsUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(): Promise<ScoreConfigDto[]> {
    const raw = await this.langfuse.getScoreConfigs();
    return raw.map((d) => ScoreConfigDto.fromLangfuse(d));
  }
}
