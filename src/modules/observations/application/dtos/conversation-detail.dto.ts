import type { HierarchyFields } from "@/shared/domain/value-objects/hierarchy-fields.vo";
import type { LangfuseEntity } from "@/shared/langfuse-client/interfaces/langfuse-client.interface";

export interface EnrichedTraceDto extends Record<string, unknown> {
  hierarchy: {
    tenantId: HierarchyFields["tenantId"];
    system: HierarchyFields["system"];
    agent: HierarchyFields["agent"];
    userId: HierarchyFields["userId"];
    sessionId: HierarchyFields["sessionId"];
  };
}

export interface ConversationDetailDto {
  readonly session: LangfuseEntity;
  readonly traces: EnrichedTraceDto[];
}