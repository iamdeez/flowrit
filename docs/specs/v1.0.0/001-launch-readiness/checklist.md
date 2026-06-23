# Flowrit 1.0.0 Launch Readiness Checklist

> Date: 2026-06-24
> Scope: `docs/specs/v1.0.0/001-launch-readiness`
> Evidence: local `tsc --noEmit`, `eslint`, `vitest run`, `next build`, `playwright test`, responsive Playwright visual QA, production `/api/health`, production HTTPS response.

## 1. Vercel Environment Variables

- [x] `DATABASE_URL` is set to the production pooled database URL. — Vercel CLI confirmed.
- [ ] `DIRECT_URL` is set when Prisma direct migration access is required. — not present in Vercel production env; current deploy used pooled `DATABASE_URL` successfully.
- [x] `AUTH_SECRET` is a strong production-only secret. — Vercel CLI confirmed presence.
- [x] `AUTH_URL` matches the production domain. — Vercel CLI confirmed presence; value is encrypted.
- [x] `NEXT_PUBLIC_APP_URL` matches the production domain. — Vercel CLI confirmed presence; value is encrypted.
- [x] `RESEND_API_KEY` is set. — Vercel CLI confirmed presence.
- [x] `RESEND_FROM_EMAIL` uses a verified sending domain. — Vercel CLI confirmed presence; Resend dashboard domain verification still recommended.
- [x] `R2_ACCOUNT_ID` is set. — Vercel CLI confirmed.
- [x] `R2_ACCESS_KEY_ID` is set. — Vercel CLI confirmed.
- [x] `R2_SECRET_ACCESS_KEY` is set. — Vercel CLI confirmed.
- [x] `R2_BUCKET_NAME` is set. — Vercel CLI confirmed.
- [x] `R2_PUBLIC_URL` is set. — Vercel CLI confirmed.
- [x] `NEXT_PUBLIC_NICEPAY_CLIENT_ID` uses the intended NicePayments environment. — Vercel CLI confirmed presence; NicePayments dashboard environment still recommended.
- [x] `NICEPAY_SECRET_KEY` uses the intended NicePayments environment. — Vercel CLI confirmed presence; NicePayments dashboard environment still recommended.
- [x] `CRON_SECRET` is set and matches Vercel Cron requests. — Vercel CLI confirmed presence.
- [x] `WEBHOOK_SECRET` is set for external intake webhooks. — Vercel CLI confirmed presence.
- [ ] `DISCORD_WEBHOOK_URL` is set for production operations alerts. — not present in Vercel production env.
- [ ] `HEALTHCHECK_TOKEN` is set for detailed health checks. — not present in Vercel production env.
- [x] `NEXT_PUBLIC_SENTRY_DSN` is set. — Vercel CLI confirmed presence.
- [x] `UPSTASH_REDIS_REST_URL` is set. — Vercel CLI confirmed.
- [x] `UPSTASH_REDIS_REST_TOKEN` is set. — Vercel CLI confirmed.

## 2. Deploy And Database

- [x] `prisma migrate deploy` runs successfully during production deploy. — Vercel build log confirmed command ran and reported no pending migrations.
- [x] Production build succeeds with `next build`. — 2026-06-24 local production build passed.
- [x] `/api/health` public summary returns `status: "ok"`. — `https://flowrit.motionbit.kr/api/health` returned `status: "ok"`.
- [ ] `/api/health` detailed check with `HEALTHCHECK_TOKEN` returns database and env checks. — production token required; unit test coverage passed.
- [x] Domain DNS points to Vercel. — production response headers include `server: Vercel`.
- [x] Production SSL certificate is active. — HTTPS `HEAD` request returned HTTP/2 200 with HSTS.

## 3. Cron And Operations

- [x] Vercel Cron for `/api/cron/billing` is enabled. — Vercel CLI `crons list` found the job.
- [x] Vercel Cron for `/api/cron/deadline-reminder` is enabled. — Vercel CLI `crons list` found the job.
- [x] Cron schedule is reviewed against the intended daily UTC run time. — both jobs are `0 0 * * *`.
- [x] Billing Cron failure sends Discord alert without billing keys or secrets. — implementation and sanitized payload unit tests passed.
- [x] Deadline reminder failure sends Discord alert without customer-sensitive content. — implementation uses sanitized ops alert path; unit sanitization passed.
- [ ] Discord alert channel receives a test production alert. — actual Discord channel receipt confirmation required.
- [ ] Sentry receives production errors. — Sentry dashboard confirmation required.

## 4. Billing

- [x] NicePayments test card registration flow opens from the billing UI. — Playwright billing E2E opened the upgrade modal on desktop/mobile without charge.
- [ ] First Pro payment callback succeeds in the intended NicePayments environment. — external NicePayments test card callback confirmation required.
- [x] Failed initial payment is shown to the user and sends an operations alert. — callback failure path and ops alert wiring implemented; unit tests passed.
- [x] Subscription renewal failure creates a failed payment record. — billing cron failure path implemented; unit tests passed.
- [x] Final retry failure marks subscription `past_due` and sends an operations alert. — billing cron final retry path implemented; unit tests passed.
- [x] `@tosspayments/payment-sdk` is absent from `package.json` and `package-lock.json`.

## 5. Public Intake And Webhooks

- [x] Public order form submits successfully and shows a success state. — Playwright public order E2E passed on desktop/mobile.
- [x] Public inquiry form submits successfully and shows a success state. — server action unit coverage passed; public intake page passed responsive QA.
- [x] External webhook rejects requests without `Authorization: Bearer WEBHOOK_SECRET`. — webhook unit test passed.
- [x] External webhook applies rate limiting. — webhook rate-limit unit test passed.
- [x] Webhook notification failure sends a sanitized Discord alert. — ops alert sanitization unit test passed.
- [x] R2 upload works from public forms and customer revision forms. — upload UI paths present and responsive QA passed; production R2 credential confirmation remains in env section.

## 6. Authentication And Abuse Prevention

- [x] Login with valid credentials succeeds. — Playwright E2E passed on desktop/mobile.
- [x] Login with repeated attempts from the same IP is rate-limited. — rate-limit unit coverage passed.
- [x] Rate-limited login shows "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." — auth action test coverage passed.
- [x] Password reset request always shows a neutral success state. — auth/password reset unit coverage passed.
- [x] Password reset token expires as expected. — auth/password reset unit coverage passed.

## 7. UI And Responsive QA

- [x] Landing page explains Flowrit's value in the first viewport. — Playwright readiness E2E passed.
- [x] Onboarding directs a new user to workspace setup and first action. — Playwright auth/onboarding E2E passed.
- [x] Dashboard shows today's priority, pipeline, recent activity, and metrics. — responsive QA passed at 390/768/1440.
- [x] Project list remains readable with many projects. — responsive QA passed at 390/768/1440.
- [x] Project detail separates sharing, revisions, deliverables, and timeline. — implementation present; customer portal and project routes passed QA.
- [x] Orders page makes pending-to-project conversion obvious. — Playwright pending order CTA E2E passed.
- [x] Settings billing states are distinct for FREE, PRO, `past_due`, and cancellation scheduled. — billing UI unit tests passed.
- [x] Public order/intake/project portal screens fit at 390px mobile width. — responsive QA passed.
- [x] No visible text overlap at 390px mobile and 1440px desktop. — responsive QA found no horizontal overflow or error screens.

## 8. Pre-Launch Test Commands

- [x] `tsc --noEmit`
- [x] `next build`
- [x] `eslint`
- [x] `vitest run`
- [x] `playwright test --list`
- [x] Core Playwright E2E scenarios pass. — 12/12 passed on desktop/mobile.

## 9. Preview And Staging Strategy

- [x] GitHub Actions `ci` job runs lint, typecheck, unit tests, and `next build`.
- [x] GitHub Actions `e2e` job checks Playwright configuration.
- [x] Preview E2E uses `PLAYWRIGHT_BASE_URL` instead of production by default.
- [x] E2E account is managed with `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` secrets.
- [ ] Preview/staging database is separate from production. — external environment confirmation required.
- [ ] Preview/staging NicePayments keys use test credentials only. — external environment confirmation required.
- [x] No E2E scenario mutates production customer or billing data. — local E2E used localhost; billing E2E opens modal only and does not charge.

## 10. Manual Production Smoke Test

- [ ] Sign up with a fresh account. — production manual smoke required.
- [ ] Complete onboarding. — production manual smoke required.
- [ ] Copy public order link. — production manual smoke required.
- [ ] Submit a public order. — production manual smoke required.
- [ ] Convert the order to a project. — production manual smoke required.
- [ ] Open the customer project portal. — production manual smoke required.
- [ ] Submit a customer revision request. — production manual smoke required.
- [ ] Register a deliverable link and mark it shared. — production manual smoke required.
- [x] Open billing upgrade modal without real unintended charge. — local Playwright E2E passed; production manual smoke still recommended.
- [ ] Trigger detailed health check using `HEALTHCHECK_TOKEN`. — production token required.
