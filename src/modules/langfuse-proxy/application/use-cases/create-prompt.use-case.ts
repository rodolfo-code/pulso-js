import { Injectable, Logger } from "@nestjs/common";

import { buildPromptName } from "@/shared/domain/services/taxonomy";
import { AuditLogEntry } from "@/shared/domain/value-objects/audit-log-entry.vo";
import {
  ILangfuseClient,
  type LangfuseEntity
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

export interface CreatePromptRequest {
  tenantSlug?: string;
  systemSlug?: string;
  agentSlug?: string;
  name?: string;
  [key: string]: unknown;
}

@Injectable()
export class CreatePromptUseCase {
  private readonly logger = new Logger(CreatePromptUseCase.name);

  constructor(
    private readonly langfuse: ILangfuseClient,
    private readonly auditRepo: IAuditLogRepo
  ) {}

  async execute(request: CreatePromptRequest): Promise<LangfuseEntity> {
    const canonicalName = buildPromptName(
      request.tenantSlug ?? "",
      request.systemSlug ?? "",
      request.agentSlug ?? "",
      request.name ?? ""
    );

    const { tenantSlug, systemSlug, agentSlug, ...rest } = request;
    void tenantSlug;
    void systemSlug;
    void agentSlug;

    const payload: LangfuseEntity = {
      ...rest,
      name: canonicalName
    };

    const result = await this.langfuse.createPrompt(payload);

    const promptId = result["id"] as string;

    try {
      const entry = AuditLogEntry.create({
        entityType: "prompt",
        entityId: promptId,
        action: "prompt_published",
        actor: "system",
        payload: { name: canonicalName }
      });
      await this.auditRepo.append(entry);
    } catch (error) {
      this.logger.warn(
        `audit_log write failed for prompt_published name=${canonicalName}`,
        error instanceof Error ? error.stack : error
      );
    }

    return result;
  }
}
