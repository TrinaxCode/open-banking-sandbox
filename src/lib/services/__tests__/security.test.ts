// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cleanupTestDbs,
  createTestDb,
  seedPeerUser,
  seedTestUser,
  type TestUser,
} from "@/__tests__/db-helpers";
import { recordSecurityEvent, getSecurityLogs } from "@/lib/services/security";

describe("security service", () => {
  let prisma: PrismaClient;
  let user: TestUser;

  beforeAll(async () => {
    prisma = await createTestDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    cleanupTestDbs();
  });

  beforeEach(async () => {
    user = await seedTestUser(prisma);
  });

  describe("recordSecurityEvent", () => {
    it("creates a log entry with action, details and default IP", async () => {
      const result = await recordSecurityEvent(
        user.user.id,
        "login",
        "Successful password login",
        undefined,
        prisma,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.action).toBe("login");
      expect(result.data.details).toBe("Successful password login");
      expect(result.data.ipAddress).toBe("127.0.0.1");
      expect(result.data.id).toBeDefined();
    });

    it("records a custom IP address", async () => {
      const result = await recordSecurityEvent(
        user.user.id,
        "password_change",
        "User updated security credentials",
        "198.51.100.42",
        prisma,
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.ipAddress).toBe("198.51.100.42");
    });
  });

  describe("getSecurityLogs", () => {
    it("returns empty list if user has no security events", async () => {
      const result = await getSecurityLogs(user.user.id, 25, prisma);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toHaveLength(0);
    });

    it("returns events in descending chronological order", async () => {
      await recordSecurityEvent(user.user.id, "login", "First event", undefined, prisma);
      await recordSecurityEvent(
        user.user.id,
        "transfer",
        "Second event",
        undefined,
        prisma,
      );
      await recordSecurityEvent(
        user.user.id,
        "card_created",
        "Third event",
        undefined,
        prisma,
      );

      const result = await getSecurityLogs(user.user.id, 10, prisma);
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data).toHaveLength(3);
      expect(result.data[0]?.action).toBe("card_created");
      expect(result.data[1]?.action).toBe("transfer");
      expect(result.data[2]?.action).toBe("login");
    });

    it("respects the limit parameter", async () => {
      for (let i = 0; i < 5; i++) {
        await recordSecurityEvent(
          user.user.id,
          "login",
          `Login #${i}`,
          undefined,
          prisma,
        );
      }

      const result = await getSecurityLogs(user.user.id, 2, prisma);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toHaveLength(2);
    });

    it("isolates logs between different users", async () => {
      const peer = await seedPeerUser(prisma);

      await recordSecurityEvent(
        user.user.id,
        "account_created",
        "User event",
        undefined,
        prisma,
      );
      await recordSecurityEvent(
        peer.user.id,
        "account_created",
        "Peer event",
        undefined,
        prisma,
      );

      const userLogs = await getSecurityLogs(user.user.id, 10, prisma);
      expect(userLogs.ok).toBe(true);
      if (!userLogs.ok) return;
      expect(userLogs.data).toHaveLength(1);
      expect(userLogs.data[0]?.details).toBe("User event");

      const peerLogs = await getSecurityLogs(peer.user.id, 10, prisma);
      expect(peerLogs.ok).toBe(true);
      if (!peerLogs.ok) return;
      expect(peerLogs.data).toHaveLength(1);
      expect(peerLogs.data[0]?.details).toBe("Peer event");
    });
  });
});
