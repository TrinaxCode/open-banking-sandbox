import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const schemaPath = "prisma/schema.prisma";
const originalSchema = readFileSync(schemaPath, "utf8");
const databaseUrl = process.env.DATABASE_URL ?? "";
const usePostgres = /^postgres(?:ql)?:/i.test(databaseUrl);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

if (!usePostgres) {
  run("npx", ["next", "build"]);
} else {
  const postgresSchema = originalSchema.replace(
    'provider = "sqlite"',
    'provider = "postgresql"',
  );
  if (postgresSchema === originalSchema) {
    throw new Error("Could not switch Prisma schema to PostgreSQL");
  }

  writeFileSync(schemaPath, postgresSchema);
  try {
    run("npx", ["prisma", "db", "push", "--skip-generate"]);
    run("npx", ["prisma", "generate"]);
    run("npx", ["next", "build"]);
  } finally {
    writeFileSync(schemaPath, originalSchema);
  }
}
