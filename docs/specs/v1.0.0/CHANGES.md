# v1.0.0 Changes

## 001-launch-readiness

Date: 2026-06-23

### Implemented

- Refined launch-facing UI across landing, auth, onboarding, dashboard, projects, orders, public forms, customer portal, settings, and global state screens.
- Added shared Flowrit UI classes for empty states, page headers, tables, skeletons, badges, icon buttons, and form help/error states.
- Added Discord operations alerts with sanitized context.
- Connected operations alerts to Cron failures, billing failures, email failures, notification creation failures, and webhook notification failures.
- Added login rate limiting through Upstash-backed `checkLoginRateLimit`.
- Added `/api/health` with public summary and `HEALTHCHECK_TOKEN` protected detailed checks.
- Removed unused `@tosspayments/payment-sdk`.
- Added 1.0.0 launch readiness checklist.
- Added Playwright configuration with desktop/mobile projects and guarded E2E scenarios.
- Updated CI to include build and E2E readiness.
- Updated project context and infra docs.

### Verification

- `tsc --noEmit` passed.
- `next build` passed.
- `eslint` passed with 0 errors and 7 existing warnings.
- `vitest run` passed with 18 files and 146 tests.
- `playwright test --list` passed with 12 listed tests.
- Public visual QA passed for landing, login, register, forgot-password, and not-found at 390px and 1440px. Screenshots were written to `/private/tmp/flowrit-t020`.

### Follow-Up Notes

- Authenticated visual QA for dashboard/project/settings still requires `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD`.
- Mutating E2E scenarios require `E2E_ALLOW_MUTATION=true` and must target preview/staging data only.
- Production Discord alert receipt, Vercel env, and Cron dashboard status must be verified in Vercel/Discord.
- Existing ESLint warnings remain in unrelated files:
  - `app/(dashboard)/projects/[id]/message-panel.tsx`
  - `app/layout.tsx`
  - `lib/actions/settings.ts`
  - `lib/actions/testWebhook.ts`
