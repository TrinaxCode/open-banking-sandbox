/**
 * Security Audit Log Service.
 *
 * Tracks security-sensitive events including logins, password changes,
 * account creation, card freezes, and transfers. Provides a transparent
 * activity log for user peace of mind.
 */

import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { ok, type Result, toFailure } from "@/lib/services/result";

export type SecurityActionType =
  | "login"
  | "password_change"
  | "account_created"
  | "card_created"
  | "card_frozen"
  | "card_unfrozen"
  | "transfer"
  | "budget_set"
  | "profile_updated";

export interface SecurityLogItem {
  id: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export async function recordSecurityEvent(
  userId: string,
  action: SecurityActionType | string,
  details?: string,
  ipAddress = "127.0.0.1",
  client: PrismaClient = defaultPrisma,
): Promise<Result<SecurityLogItem>> {
  try {
    const entry = await client.securityLog.create({
      data: {
        userId,
        action,
        details: details ?? null,
        ipAddress,
      },
    });

    return ok({
      id: entry.id,
      action: entry.action,
      details: entry.details,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt,
    });
  } catch (err) {
    return toFailure(err, "Failed to record security event");
  }
}

export async function getSecurityLogs(
  userId: string,
  limit = 25,
  client: PrismaClient = defaultPrisma,
): Promise<Result<SecurityLogItem[]>> {
  try {
    const rows = await client.securityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(100, Math.max(1, limit)),
    });

    return ok(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        details: r.details,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
      })),
    );
  } catch (err) {
    return toFailure(err, "Failed to fetch security logs");
  }
}
