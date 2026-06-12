import { HierarchyFields } from "@/shared/domain/value-objects/hierarchy-fields.vo";

export function extractHierarchy(trace: Record<string, unknown>): HierarchyFields {
  const metadata = (trace["metadata"] as Record<string, unknown> | undefined) ?? {};
  const systemRaw = String(metadata["system"] ?? "");
  return new HierarchyFields(
    String(metadata["tenant_id"] ?? ""),
    systemRaw || "default",
    String(metadata["agent"] ?? ""),
    String(trace["userId"] ?? ""),
    String(trace["sessionId"] ?? "")
  );
}
