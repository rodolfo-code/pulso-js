import { describe, expect, it, vi } from "vitest";

import { AuditLogEntry } from "@/shared/domain/value-objects/audit-log-entry.vo";
import type { PrismaService } from "@/shared/prisma/prisma.service";
import { AuditLogRepository } from "@/shared/repositories/audit-log.repository";

function makeRepoWithFakePrisma() {
  const create = vi.fn().mockResolvedValue({});
  const fakePrisma = { auditLog: { create } } as unknown as PrismaService;
  const repo = new AuditLogRepository(fakePrisma);
  return { repo, create };
}

describe("AuditLogRepository", () => {
  it("calls prisma.auditLog.create with mapped row", async () => {
    const { repo, create } = makeRepoWithFakePrisma();
    const entry = AuditLogEntry.create({
      entityType: "trace",
      entityId: "00000000-0000-0000-0000-000000000001",
      action: "deleted",
      actor: "user:eric",
      payload: { reason: "spam" }
    });

    await repo.append(entry);

    expect(create).toHaveBeenCalledTimes(1);
    const callArg = create.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(callArg.data.id).toBe(entry.id);
    expect(callArg.data.entityType).toBe("trace");
    expect(callArg.data.entityId).toBe(entry.entityId);
    expect(callArg.data.action).toBe("deleted");
    expect(callArg.data.actor).toBe("user:eric");
    expect(callArg.data.payload).toEqual({ reason: "spam" });
    expect(callArg.data.occurredAt).toBe(entry.occurredAt);
  });

  it("propagates errors from prisma", async () => {
    const create = vi.fn().mockRejectedValue(new Error("db down"));
    const fakePrisma = { auditLog: { create } } as unknown as PrismaService;
    const repo = new AuditLogRepository(fakePrisma);
    const entry = AuditLogEntry.create({
      entityType: "trace",
      entityId: "00000000-0000-0000-0000-000000000001",
      action: "x",
      actor: "y",
      payload: {}
    });

    await expect(repo.append(entry)).rejects.toThrow("db down");
  });
});
