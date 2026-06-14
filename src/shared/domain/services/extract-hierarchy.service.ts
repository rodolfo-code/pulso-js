import { HierarchyFields } from "@/shared/domain/value-objects/hierarchy-fields.vo";

interface TraceLike {
  metadata?: unknown;
  userId?: string | null;
  sessionId?: string | null;
}

export function extractHierarchy(trace: TraceLike): HierarchyFields {
  const metadata = (trace.metadata as Record<string, unknown> | undefined) ?? {};
  const systemRaw = String(metadata["system"] ?? "");
  return new HierarchyFields(
    String(metadata["tenant_id"] ?? ""),
    systemRaw || "default",
    String(metadata["agent"] ?? ""),
    String(trace.userId ?? ""),
    String(trace.sessionId ?? "")
  );
}