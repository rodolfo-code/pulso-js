import { Injectable, Logger } from "@nestjs/common";

import { AuditLogEntry } from "@/shared/domain/value-objects/audit-log-entry.vo";
import {
  ILangfuseClient,
  type LangfuseEntity
} from "@/shared/langfuse-client/interfaces/langfuse-client.interface";
import { IAuditLogRepo } from "@/shared/repositories/interfaces/audit-log-repo.interface";

export interface WriteScoreRequest {
  traceId: string;
  name: string;
  value: number;
  comment?: string;
}

@Injectable()
export class WriteScoreUseCase {
  private readonly logger = new Logger(WriteScoreUseCase.name);

  constructor(
    private readonly langfuse: ILangfuseClient,
    private readonly auditRepo: IAuditLogRepo
  ) {}

  async execute(request: WriteScoreRequest): Promise<LangfuseEntity> {
    const data: LangfuseEntity = {
      traceId: request.traceId,
      name: request.name,
      value: request.value
    };
    if (request.comment !== undefined) {
      data["comment"] = request.comment;
    }

    const result = await this.langfuse.createScore(data);

    const scoreId = result["id"] as string;

    try {
      const entry = AuditLogEntry.create({
        entityType: "score",
        entityId: scoreId,
        action: "score_written",
        actor: "system",
        payload: {
          traceId: request.traceId,
          name: request.name,
          value: request.value
        }
      });
      await this.auditRepo.append(entry);
    } catch (error) {
      this.logger.warn(
        `audit_log write failed for score_written traceId=${request.traceId} name=${request.name}`,
        error instanceof Error ? error.stack : error
      );
    }

    return result;
  }
}
