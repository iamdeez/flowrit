# Flowrit 1.0.0 Launch Readiness Checklist

> Date: 2026-06-23
> Scope: `docs/specs/v1.0.0/001-launch-readiness`

## 1. Vercel Environment Variables

- [ ] `DATABASE_URL` is set to the production pooled database URL.
- [ ] `DIRECT_URL` is set when Prisma direct migration access is required.
- [ ] `AUTH_SECRET` is a strong production-only secret.
- [ ] `AUTH_URL` matches the production domain.
- [ ] `NEXT_PUBLIC_APP_URL` matches the production domain.
- [ ] `RESEND_API_KEY` is set.
- [ ] `RESEND_FROM_EMAIL` uses a verified sending domain.
- [ ] `R2_ACCOUNT_ID` is set.
- [ ] `R2_ACCESS_KEY_ID` is set.
- [ ] `R2_SECRET_ACCESS_KEY` is set.
- [ ] `R2_BUCKET_NAME` is set.
- [ ] `R2_PUBLIC_URL` is set.
- [ ] `NEXT_PUBLIC_NICEPAY_CLIENT_ID` uses the intended NicePayments environment.
- [ ] `NICEPAY_SECRET_KEY` uses the intended NicePayments environment.
- [ ] `CRON_SECRET` is set and matches Vercel Cron requests.
- [ ] `WEBHOOK_SECRET` is set for external intake webhooks.
- [ ] `DISCORD_WEBHOOK_URL` is set for production operations alerts.
- [ ] `HEALTHCHECK_TOKEN` is set for detailed health checks.
- [ ] `NEXT_PUBLIC_SENTRY_DSN` is set.
- [ ] `UPSTASH_REDIS_REST_URL` is set.
- [ ] `UPSTASH_REDIS_REST_TOKEN` is set.

## 2. Deploy And Database

- [ ] `prisma migrate deploy` runs successfully during production deploy.
- [ ] Production build succeeds with `next build`.
- [ ] `/api/health` public summary returns `status: "ok"`.
- [ ] `/api/health` detailed check with `HEALTHCHECK_TOKEN` returns database and env checks.
- [ ] Domain DNS points to Vercel.
- [ ] Production SSL certificate is active.

## 3. Cron And Operations

- [ ] Vercel Cron for `/api/cron/billing` is enabled.
- [ ] Vercel Cron for `/api/cron/deadline-reminder` is enabled.
- [ ] Cron schedule is reviewed against the intended daily UTC run time.
- [ ] Billing Cron failure sends Discord alert without billing keys or secrets.
- [ ] Deadline reminder failure sends Discord alert without customer-sensitive content.
- [ ] Discord alert channel receives a test production alert.
- [ ] Sentry receives production errors.

## 4. Billing

- [ ] NicePayments test card registration flow opens from the billing UI.
- [ ] First Pro payment callback succeeds in the intended NicePayments environment.
- [ ] Failed initial payment is shown to the user and sends an operations alert.
- [ ] Subscription renewal failure creates a failed payment record.
- [ ] Final retry failure marks subscription `past_due` and sends an operations alert.
- [ ] `@tosspayments/payment-sdk` is absent from `package.json` and `package-lock.json`.

## 5. Public Intake And Webhooks

- [ ] Public order form submits successfully and shows a success state.
- [ ] Public inquiry form submits successfully and shows a success state.
- [ ] External webhook rejects requests without `Authorization: Bearer WEBHOOK_SECRET`.
- [ ] External webhook applies rate limiting.
- [ ] Webhook notification failure sends a sanitized Discord alert.
- [ ] R2 upload works from public forms and customer revision forms.

## 6. Authentication And Abuse Prevention

- [ ] Login with valid credentials succeeds.
- [ ] Login with repeated attempts from the same IP is rate-limited.
- [ ] Rate-limited login shows "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요."
- [ ] Password reset request always shows a neutral success state.
- [ ] Password reset token expires as expected.

## 7. UI And Responsive QA

- [ ] Landing page explains Flowrit's value in the first viewport.
- [ ] Onboarding directs a new user to workspace setup and first action.
- [ ] Dashboard shows today's priority, pipeline, recent activity, and metrics.
- [ ] Project list remains readable with many projects.
- [ ] Project detail separates sharing, revisions, deliverables, and timeline.
- [ ] Orders page makes pending-to-project conversion obvious.
- [ ] Settings billing states are distinct for FREE, PRO, `past_due`, and cancellation scheduled.
- [ ] Public order/intake/project portal screens fit at 390px mobile width.
- [ ] No visible text overlap at 390px mobile and 1440px desktop.

## 8. Pre-Launch Test Commands

- [x] `tsc --noEmit`
- [x] `next build`
- [ ] `eslint`
- [ ] `vitest run`
- [ ] `playwright test --list`
- [ ] Core Playwright E2E scenarios pass.

## 9. Preview And Staging Strategy

- [ ] GitHub Actions `ci` job runs lint, typecheck, unit tests, and `next build`.
- [ ] GitHub Actions `e2e` job checks Playwright configuration.
- [ ] Preview E2E uses `PLAYWRIGHT_BASE_URL` instead of production by default.
- [ ] E2E account is managed with `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` secrets.
- [ ] Preview/staging database is separate from production.
- [ ] Preview/staging NicePayments keys use test credentials only.
- [ ] No E2E scenario mutates production customer or billing data.

## 10. Manual Production Smoke Test

- [ ] Sign up with a fresh account.
- [ ] Complete onboarding.
- [ ] Copy public order link.
- [ ] Submit a public order.
- [ ] Convert the order to a project.
- [ ] Open the customer project portal.
- [ ] Submit a customer revision request.
- [ ] Register a deliverable link and mark it shared.
- [ ] Open billing upgrade modal without real unintended charge.
- [ ] Trigger detailed health check using `HEALTHCHECK_TOKEN`.
