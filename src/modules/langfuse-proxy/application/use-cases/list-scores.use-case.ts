import { Injectable } from "@nestjs/common";

import { ScoreDto } from "@/modules/langfuse-proxy/application/dtos/score.dto";
import {
  ILangfuseClient,
  type LangfuseFilters
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

@Injectable()
export class ListScoresUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(filters?: LangfuseFilters): Promise<ScoreDto[]> {
    const raw = await this.langfuse.getScores(filters);
    return raw.map((d) => ScoreDto.fromLangfuse(d));
  }
}
