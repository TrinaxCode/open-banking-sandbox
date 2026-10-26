# Migrating from SQLite to PostgreSQL

SQLite is the development default. This app is a simulation: the seed login
`demo@banking.app` / `demo-password` (peer `alice@banking.app`, same password)
is synthetic data, not a production account. Secondary text is still below
WCAG AA, and `color-contrast` stays excluded in `e2e/a11y.e2e.ts`.

Everything in the app is written to be
portable. The local and CI schema stays on SQLite, while `npm run build`
automatically generates the Prisma client for PostgreSQL when `DATABASE_URL`
contains a PostgreSQL URL (the Vercel path). A new PostgreSQL database still
needs one schema initialization before the first deploy.

## What already works on both

- The Prisma schema: every column type used here (`Int`, `String`, `Float`,
  `Boolean`, `DateTime`) is supported by both providers.
- All queries: no raw SQL, no SQLite-specific date functions. Analytics uses
  `groupBy` and `aggregate`, which both providers implement.
- Case-insensitive search (`contains`) relies on SQLite's `LIKE` being
  case-insensitive for ASCII. PostgreSQL's `LIKE` is case-sensitive, so see
  "Search behaviour" below if that matters to you.

## Steps

1. **Point `DATABASE_URL` at PostgreSQL.** Use the pooled URL for the running
   application and keep the direct URL for schema work:

   ```bash
   # .env
   DATABASE_URL="postgresql://user:password@localhost:5432/trinaxbank?schema=public"
   ```

   Neon exposes these as `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

2. **Create the PostgreSQL baseline.** Prisma migrations are provider-specific,
   so the existing SQLite migration cannot be replayed on PostgreSQL. For the
   initial empty database, temporarily set the datasource provider in
   `prisma/schema.prisma` to `postgresql`, then run the schema push with the
   direct connection:

   ```bash
   DATABASE_URL="$DATABASE_URL_UNPOOLED" npx prisma db push --accept-data-loss
   ```

   Restore the SQLite provider for local development and CI. For a long-lived
   production database, commit a PostgreSQL-specific baseline/migration instead
   of repeating `db push`.

3. **Seed it if you want demo data.**

   ```bash
   DATABASE_URL="$DATABASE_URL_UNPOOLED" npx tsx prisma/seed.ts
   ```

   Restore the SQLite provider and run `npx prisma generate` after this one-time
   setup if you will continue local development.

4. **Verify.**

   ```bash
   npm run typecheck
   npm run test:run     # tests build their own SQLite databases, so they keep passing
   npm run build
   npm run dev
   ```

## Notes and gotchas

- **Money stays in cents.** `Int` is a 32-bit integer on both providers, so the
  ceiling of `2_147_483_647` cents ($21,474,836.47) per column is identical.
  `MAX_TRANSACTION_CENTS` in `src/lib/money.ts` caps a single operation well
  below that.
- **Search behaviour.** The history search uses Prisma's `contains`. On SQLite
  that is case-insensitive; on PostgreSQL it is case-sensitive. To keep the old
  behaviour, add `mode: "insensitive"` to the two `contains` filters in
  `src/lib/services/transactions.ts`. That option is _not_ accepted by SQLite, so
  the code deliberately omits it.
- **Rate limiting.** `RATE_LIMIT_DRIVER=memory` keeps counters in the process,
  which is wrong for more than one instance. Set it to `database` (the
  `RateLimitEntry` table) or replace the store in `src/lib/rate-limit.ts`.
- **Job locks.** `JobLock` is an ordinary table, so it works unchanged. If you run
  more than one worker, the job endpoint stays safe because each rule is claimed
  with a conditional write before it is executed.
- **Connection pooling.** Serverless deployments need a pooler (e.g. PgBouncer or
  your provider's). Add `?pgbouncer=true&connection_limit=1` to the URL when the
  pooler does not support prepared statements.
- **Backups.** `prisma/dev.db` is a file you can copy; PostgreSQL is not. Set up
  real backups before storing anything you care about — although this project is
  a simulation, and synthetic data is the point.
