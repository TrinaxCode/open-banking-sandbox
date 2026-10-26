// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const directory = mkdtempSync(path.join(tmpdir(), "trinax-migrations-"));
const cli = path.resolve("node_modules/prisma/build/index.js");
const baseline = "20260918092738_init";

afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe("versioned SQLite migrations", () => {
  it.each([false, true])(
    "matches the schema with an existing database=%s",
    async (existing) => {
      const url = `file:${path.join(directory, `${existing}.db`)}`;
      const client = new PrismaClient({ datasources: { db: { url } } });
      const run = (...args: string[]) =>
        execFileSync(process.execPath, [cli, ...args], {
          env: { ...process.env, DATABASE_URL: url },
          stdio: "pipe",
        });

      try {
        if (existing) {
          run(
            "db",
            "execute",
            "--file",
            `prisma/migrations/${baseline}/migration.sql`,
            "--url",
            url,
          );
          run("migrate", "resolve", "--applied", baseline);
          await client.$executeRaw`
          INSERT INTO "User" (id, email, passwordHash, accountNumber, updatedAt)
          VALUES ('existing-user', 'migration@example.com', 'synthetic-hash', 'USR-MIGRATE', CURRENT_TIMESTAMP)
        `;
          await client.$executeRaw`
          INSERT INTO "Account" (id, userId, number, balanceCents, updatedAt)
          VALUES ('existing-account', 'existing-user', 'CHK-MIGRATE', 12345, CURRENT_TIMESTAMP)
        `;
          await client.$executeRaw`
          INSERT INTO "Transaction" (id, userId, accountId, type, amountCents)
          VALUES ('existing-transaction', 'existing-user', 'existing-account', 'deposit', 12345)
        `;
        }

        run("migrate", "deploy");
        // Exit code 2 signals schema drift; success proves every model is migrated.
        run(
          "migrate",
          "diff",
          "--from-url",
          url,
          "--to-schema-datamodel",
          "prisma/schema.prisma",
          "--exit-code",
        );

        if (existing) {
          const account = await client.account.findUniqueOrThrow({
            where: { id: "existing-account" },
          });
          expect(account.balanceCents).toBe(12345);
          expect(
            await client.transaction.findUniqueOrThrow({
              where: { id: "existing-transaction" },
            }),
          ).toMatchObject({ amountCents: 12345, notes: null });
          await client.transaction.update({
            where: { id: "existing-transaction" },
            data: { notes: "Preserved" },
          });
          await client.categoryBudget.create({
            data: { userId: "existing-user", category: "food", amountCents: 1000 },
          });
          await client.securityLog.create({
            data: { userId: "existing-user", action: "budget_set" },
          });
        }
      } finally {
        await client.$disconnect();
      }
    },
    15_000,
  );
});
