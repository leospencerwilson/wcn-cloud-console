# Console E2E tests (Playwright)

Smoke tests that drive the running Next.js console with a real browser. They
are intentionally shallow — they verify routes render and high-value UI
elements (forms, action buttons, tab strips, paginated tables) are present and
don't 500. They do not seed a database or mock services.

## Running

From `console/`:

```
npm run test:e2e         # headless
npm run test:e2e:ui      # interactive UI mode
```

Playwright will boot `npm run dev` automatically on port 3000 (or reuse an
already-running dev server outside CI). On a clean checkout you need to
install the chromium browser binary once:

```
npx playwright install chromium
```

## Environment variables

All specs skip cleanly when their required env vars are missing — they will
never fail because of unset env.

| Var | Used by | Purpose |
| --- | --- | --- |
| `E2E_ADMIN_EMAIL` | auth fixture | Real wcn_admin account email |
| `E2E_ADMIN_PASSWORD` | auth fixture | Password for the above |
| `E2E_CUSTOMER_SLUG` | `admin-customer-detail`, `provisioning-log`, `audit` (per-customer half) | A real customer slug to load |
| `E2E_JOB_ID` | `provisioning-log` | A real provisioning job id under that customer |

On Windows PowerShell:

```
$env:E2E_ADMIN_EMAIL = "you@western-communication.com"
$env:E2E_ADMIN_PASSWORD = "..."
$env:E2E_CUSTOMER_SLUG = "acme"
$env:E2E_JOB_ID = "00000000-0000-0000-0000-000000000000"
npm run test:e2e
```

## Layout

```
tests/
  fixtures/auth.ts      # logs in via the real /login form once, reuses storage state
  specs/
    login.spec.ts
    admin-home.spec.ts
    admin-customers-list.spec.ts
    admin-customer-detail.spec.ts
    admin-new-customer.spec.ts
    provisioning-log.spec.ts
    audit.spec.ts
  .auth/                # generated storage state (gitignored)
```

The auth fixture re-uses cached storage state for up to 30 minutes per run, so
specs don't each pay the login cost.

## TODO: CI integration

The repo's CI is not on GitHub Actions today (no `.github/workflows`), so this
change deliberately does **not** add a workflow file. Wiring `npm run test:e2e`
into whatever CI we settle on is a follow-up — at minimum it needs:

- `npx playwright install --with-deps chromium` in the setup step
- The four `E2E_*` env vars provided as secrets
- A Postgres + Supabase target the console can talk to (staging, ideally)
