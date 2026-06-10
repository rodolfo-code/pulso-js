import { describe, expect, it } from "vitest";

import { AuditLogEntry } from "@/shared/domain/value-objects/audit-log-entry.vo";
import { AuditLogMapper } from "@/shared/repositories/mappers/audit-log.mapper";
import type { Prisma } from "@prisma-client/client";

describe("AuditLogMapper", () => {
  const occurredAt = new Date("2026-06-10T12:00:00.000Z");
  const id = "00000000-0000-0000-0000-000000000001";
  const entityId = "00000000-0000-0000-0000-000000000002";

  describe("toDomain", () => {
    it("maps a row to AuditLogEntry preserving all fields", () => {
      const row = {
        id,
        entityType: "trace",
        entityId,
        action: "deleted",
        actor: "user:eric",
        payload: { reason: "spam" } as Prisma.JsonValue,
        occurredAt
      };

      const entry = AuditLogMapper.toDomain(row);

      expect(entry).toBeInstanceOf(AuditLogEntry);
      expect(entry.id).toBe(id);
      expect(entry.entityType).toBe("trace");
      expect(entry.entityId).toBe(entityId);
      expect(entry.action).toBe("deleted");
      expect(entry.actor).toBe("user:eric");
      expect(entry.payload).toEqual({ reason: "spam" });
      expect(entry.occurredAt).toBe(occurredAt);
    });

    it("treats null payload from db as empty object", () => {
      const row = {
        id,
        entityType: "trace",
        entityId,
        action: "x",
        actor: "y",
        payload: null as Prisma.JsonValue,
        occurredAt
      };

      const entry = AuditLogMapper.toDomain(row);

      expect(entry.payload).toEqual({});
    });

    it("preserves nested payload structure", () => {
      const row = {
        id,
        entityType: "trace",
        entityId,
        action: "updated",
        actor: "system",
        payload: { meta: { user: "x", flags: [1, 2, 3] } } as Prisma.JsonValue,
        occurredAt
      };

      const entry = AuditLogMapper.toDomain(row);

      expect(entry.payload).toEqual({ meta: { user: "x", flags: [1, 2, 3] } });
    });
  });

  describe("toPersistence", () => {
    it("maps AuditLogEntry to a row preserving all fields", () => {
      const entry = new AuditLogEntry(
        id,
        "trace",
        entityId,
        "deleted",
        "user:eric",
        { reason: "spam" },
        occurredAt
      );

      const row = AuditLogMapper.toPersistence(entry);

      expect(row.id).toBe(id);
      expect(row.entityType).toBe("trace");
      expect(row.entityId).toBe(entityId);
      expect(row.action).toBe("deleted");
      expect(row.actor).toBe("user:eric");
      expect(row.payload).toEqual({ reason: "spam" });
      expect(row.occurredAt).toBe(occurredAt);
    });

    it("preserves nested payload structure", () => {
      const entry = AuditLogEntry.create({
        entityType: "trace",
        entityId,
        action: "x",
        actor: "y",
        payload: { meta: { user: "z", flags: [1, 2, 3] } }
      });

      const row = AuditLogMapper.toPersistence(entry);

      expect(row.payload).toEqual({ meta: { user: "z", flags: [1, 2, 3] } });
    });
  });
});
