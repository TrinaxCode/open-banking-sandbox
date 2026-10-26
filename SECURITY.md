# Security Policy

## Scope

This project is an educational banking simulation. It must not receive real financial data, production credentials, or personal information. The seeded sign-in `demo@banking.app` / `demo-password` (and the peer `alice@banking.app` with the same password) is public demo data, not a secret.

Secondary text in the dark palette is still below WCAG AA contrast. The accessibility suite excludes `color-contrast` on purpose. That is a known design limit, not a vulnerability to report.

## Supported versions

Only the latest `main` branch is supported for security fixes.

## Reporting a vulnerability

Please use a private GitHub security advisory for this repository when available. If that option is unavailable, contact [TrinaxCode](https://github.com/TrinaxCode) privately before public disclosure.

Include the affected area, reproduction steps using synthetic data, impact, and a suggested mitigation. Do not include secrets in the report.

The maintainer will acknowledge valid reports, assess severity, and coordinate disclosure after a fix is available.
