import type { ApiSession } from "langfuse";

import type { HierarchyFields } from "@/shared/domain/value-objects/hierarchy-fields.vo";

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
  readonly session: ApiSession;
  readonly traces: EnrichedTraceDto[];
}