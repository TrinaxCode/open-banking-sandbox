# Contributing

Thanks for helping improve Open Banking Sandbox.

## Before you start

- Read the [README](README.md) and [SECURITY.md](SECURITY.md).
- Keep all data synthetic; never include credentials, personal data, financial data, or private configuration.
- Open an issue first for large behavior or architecture changes.

## Development workflow

```bash
npm install
cp .env.example .env
npx prisma db push
npm run db:seed
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Keep changes focused, preserve existing routes and translations, and add or update a small regression test for non-trivial behavior.

## Pull requests

Describe the user impact, implementation, tests run, and any known limitations. Do not include screenshots containing personal or financial data. A maintainer may request a focused follow-up before merging.
