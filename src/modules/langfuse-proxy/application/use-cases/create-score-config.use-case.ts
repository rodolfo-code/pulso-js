import { Injectable } from "@nestjs/common";

import { buildScoreConfigName } from "@/shared/domain/services/taxonomy";
import {
  ILangfuseClient,
  type LangfuseEntity
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

export interface CreateScoreConfigRequest {
  tenantSlug?: string;
  name?: string;
  [key: string]: unknown;
}

@Injectable()
export class CreateScoreConfigUseCase {
  constructor(private readonly langfuse: ILangfuseClient) {}

  async execute(request: CreateScoreConfigRequest): Promise<LangfuseEntity> {
    const canonicalName = buildScoreConfigName(
      request.tenantSlug ?? "",
      request.name ?? ""
    );

    const { tenantSlug, ...rest } = request;
    void tenantSlug;

    const payload: LangfuseEntity = {
      ...rest,
      name: canonicalName
    };

    return this.langfuse.createScoreConfig(payload);
  }
}
