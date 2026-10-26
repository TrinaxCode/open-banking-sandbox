# Contributing

Thanks for helping improve Open Banking Sandbox.

## Before you start

- Read the [README](README.md) and [SECURITY.md](SECURITY.md).
- This is a simulated bank. It does not move real money. Keep every fixture synthetic.
- After `npm run db:seed`, sign in as `demo@banking.app` / `demo-password`. The peer account `alice@banking.app` uses the same password and exists so external transfers have a destination.
- Secondary text in the dark palette is still below WCAG AA. `color-contrast` stays excluded in `e2e/a11y.e2e.ts`. Do not mark that work done in the README.
- Open an issue first for large behavior or architecture changes.

## Development workflow

```bash
npm install
cp .env.example .env
npm run db:deploy
npm run db:seed
npm run typecheck
npm run lint
npm run test:run
npm run build
```

Keep changes focused, preserve existing routes and translations, and add or update a small regression test for non-trivial behavior.

## Pull requests

Describe the user impact, implementation, tests run, and any known limitations. Do not include screenshots containing personal or financial data. A maintainer may request a focused follow-up before merging.
