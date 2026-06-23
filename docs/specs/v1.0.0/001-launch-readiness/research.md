# Research: 1.0.0 런칭 준비 및 제품 완성도 개선

## 기존 코드베이스 분석

### 클래스·모듈 계층 구조

Flowrit은 Next.js App Router 기반이며 클래스 상속 구조보다 라우트, Server Component, Client Component, Server Action 중심으로 구성된다.

```
app/layout.tsx
  └─ app/(dashboard)/layout.tsx
       ├─ components/sidebar-nav.tsx
       ├─ components/notification-bell.tsx
       ├─ components/mobile-nav-wrapper.tsx
       └─ app/(dashboard)/*/page.tsx

Client Component
  └─ form action 또는 fetch
       └─ lib/actions/*.ts / app/api/**/route.ts
            └─ lib/db.ts → Prisma → PostgreSQL
```

주요 UI 기반:

- `app/globals.css`: Flowrit 디자인 토큰과 공통 클래스(`flowrit-page`, `flowrit-panel`, `flowrit-button-*`, `flowrit-input`)가 존재한다.
- `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx`: 전역 상태 화면이 존재한다.
- `components/sidebar-nav.tsx`, `components/mobile-tab-bar.tsx`, `components/mobile-more-drawer.tsx`: 데스크톱/모바일 내비게이션 구조가 분리되어 있다.
- `sonner` Toaster가 `app/layout.tsx`에 전역 적용되어 있다.

주요 운영 기반:

- `@sentry/nextjs`가 설치되어 있고 `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` 설정 파일이 존재한다. `lib/billing.ts`에서 결제 API 실패를 `Sentry.captureException`으로 기록한다. `.env.example`에 `NEXT_PUBLIC_SENTRY_DSN` placeholder가 있으므로 Vercel에 실제 DSN 값 설정 여부를 배포 전 확인해야 한다.
- `vercel.json`에는 `/api/cron/deadline-reminder`, `/api/cron/billing` 두 개의 Cron이 `0 0 * * *`(매일 자정 UTC) 스케줄로 등록되어 있다. 두 Cron 모두 `CRON_SECRET` Bearer 토큰으로 보호된다.
- `.github/workflows/ci.yml`이 존재하며 `push`/`PR` 시 lint, typecheck, test를 실행한다. Playwright E2E는 CI에 포함되어 있지 않으며 본 스펙에서 추가 예정이다.
- `lib/ratelimit.ts`에 Upstash Redis 기반 rate limiting이 구현되어 있다. `intakeLimiter`(10분/5회), `webhookLimiter`(1분/60회)가 존재하며, 각각 `/intake/[workspaceSlug]` 공개 폼과 `/api/webhooks/intake/[workspaceSlug]`에 적용되어 있다. 로그인 rate limiter(`loginLimiter`)는 미구현으로 본 스펙에서 추가한다.
- `tests/`에는 Vitest 단위 테스트가 존재하지만, Playwright E2E 파일은 현재 없다.

### 영향 범위 분석

| 영역 | 확인된 현재 상태 | 1.0.0 영향 |
|---|---|---|
| 디자인 토큰 | `app/globals.css`에 Flowrit 토큰과 공통 클래스 존재 | 공통 컴포넌트/상태 UI 정리 기준으로 사용 |
| 대시보드 | `app/(dashboard)/dashboard/page.tsx`가 운영 데이터와 통계를 함께 조회 | 정보 구조 개선, 로딩/빈 상태, 성능 점검 필요 |
| 설정 | `app/(dashboard)/settings/page.tsx`와 다수 하위 컴포넌트 존재 | 섹션 구조, 결제, 웹훅, 주문서 설정 UX 개선 |
| 주문서 | `/orders`, `/order/[workspaceSlug]` 존재 | 접수→전환 흐름, 공개 제출 완료 UX 개선 |
| 고객 포털 | `/p/[token]` 존재 | 고객용 신뢰감, 수정 요청/댓글 흐름 개선 |
| 결제 | NICE 결제 API route와 billing tab 존재 | 상태별 메시지, 결제 실패/취소 UX 보강 |
| 알림 | 인앱/이메일 알림 존재 | 운영자용 Discord 알림은 별도 모듈 필요 |
| Health Check | 전용 API 확인되지 않음 | 신규 API route 필요 |
| CI/E2E | CI 구성 완료 (lint/typecheck/test), Playwright dependency 설치됨, E2E 파일 없음 | Playwright 설정과 시나리오 추가 필요 |

### 관련 파일 후보

| 파일 | 용도 |
|---|---|
| `app/page.tsx` | 랜딩 첫인상 |
| `app/(auth)/login/page.tsx` | 로그인 |
| `app/(auth)/register/page.tsx` | 회원가입 |
| `app/onboarding/page.tsx` | 온보딩 |
| `app/(dashboard)/dashboard/page.tsx` | 메인 대시보드 |
| `app/(dashboard)/projects/page.tsx` | 프로젝트 목록 |
| `app/(dashboard)/projects/[id]/page.tsx` | 프로젝트 상세 |
| `app/(dashboard)/orders/page.tsx` | 주문서 관리 |
| `app/(dashboard)/settings/page.tsx` | 설정 |
| `app/(dashboard)/settings/billing-tab.tsx` | 결제/구독 UI |
| `app/(dashboard)/settings/webhook-info.tsx` | 웹훅 설정 UI |
| `app/order/[workspaceSlug]/page.tsx` | 공개 주문서 |
| `app/intake/[workspaceSlug]/page.tsx` | 공개 일반 문의 |
| `app/p/[token]/page.tsx` | 고객 포털 |
| `app/error.tsx` | 전역 에러 |
| `app/not-found.tsx` | 전역 404 |
| `app/loading.tsx` | 전역 로딩 |
| `lib/notifications.ts` | 인앱/이메일 알림 |
| `lib/email.ts` | 이메일 발송 |
| `lib/billing.ts` | 결제 API 실패 Sentry 기록 |
| `vercel.json` | Cron 설정 |
| `.github/workflows/ci.yml` | CI |
| `.env.example` | 환경변수 기준 문서 |

## 기술 선택 조사

### UI/UX 개선

기존 Tailwind CSS v4와 Flowrit 디자인 토큰을 유지한다. 새 디자인 시스템 라이브러리를 도입하지 않고, 현재 토큰과 공통 클래스를 확장하는 방식이 가장 낮은 리스크다.

선택 기준:

- 기존 화면에 이미 `flowrit-*` 클래스가 사용된다.
- SaaS 운영 도구에 적합한 조용하고 밀도 있는 UI가 필요하다.
- 새 UI 라이브러리 도입은 스타일 충돌과 작업량 증가를 만든다.

### Discord 운영 알림

Discord Incoming Webhook을 사용한다. 별도 SDK 없이 `fetch`로 전송할 수 있으며, Vercel Serverless 환경에서 사용이 단순하다.

대안:

| 대안 | 장점 | 단점 |
|---|---|---|
| Discord Webhook | 빠른 구축, 운영자 알림에 충분 | 알림 라우팅/에스컬레이션 기능 제한 |
| Slack Webhook | 팀 운영 표준으로 흔함 | 현재 요구사항은 Discord |
| Sentry Alert Rule만 사용 | 에러 그룹핑 우수 | 결제/Cron/헬스체크 같은 도메인 이벤트 알림은 별도 설정 필요 |

### Health Check

`app/api/health/route.ts`를 추가하여 애플리케이션 상태를 확인한다. 공개 응답에는 민감한 상세를 노출하지 않고, 내부 로그 또는 Discord 알림에는 sanitized context만 포함한다.

### E2E

Playwright dependency가 이미 존재하므로 Playwright 설정과 테스트만 추가한다. 외부 결제 실청구는 자동화하지 않고, 결제 모달 진입과 NICE script 의존 지점까지만 검증한다.

## 엣지 케이스 및 한계

- **[BLOCKER 위험] v0.7.0/001-nicepayments 미완성**: FR-009, SC-008, T014(billing callback 알림)는 NicePayments 구현 완료를 전제로 한다. 현재 해당 스펙 tasks.md 기준 25개 태스크 중 2개만 완료 상태다. 본 스펙 착수 전 완료 여부를 반드시 확인해야 한다.
- **Vercel Cron 2개**: `vercel.json`에 두 Cron이 모두 `0 0 * * *`(매일 자정 UTC) 스케줄로 등록되어 있다. infra.md에 Vercel 플랜별 Cron 제한이 명시되어 있으나 실제 동작 중인 Cron 수량을 Vercel 대시보드에서 확인해야 한다. **참고**: infra.md의 `0 * * * *`(매시간) 기술은 오류이며 실제는 `0 0 * * *`(매일 자정)이다.
- Discord Webhook URL은 민감 정보이므로 `.env.example`에는 변수명만 placeholder로 기록하고 실제 값은 Vercel 환경변수에 둔다.
- Health Check가 DB를 매번 강하게 조회하면 오히려 장애 요인이 될 수 있으므로 lightweight query를 사용해야 한다.
- E2E는 seeded data 또는 테스트 전용 계정 전략이 필요하다. production 데이터에 영향을 주는 테스트는 금지한다.
- 공개 고객 화면은 비인증 경로이므로 내부 워크스페이스 정보나 운영 상세가 노출되지 않아야 한다.
- 대시보드는 이미 여러 DB query를 수행한다. UI 개선 중 쿼리 수가 증가하지 않도록 `Promise.all`, select 최소화, 캐시 정책을 검토해야 한다.
- `@tosspayments/payment-sdk` dependency가 `package.json`에 남아 있다. NICE 결제 전환 후 미사용이면 별도 cleanup 또는 본 스펙의 운영 정리 태스크에서 확인한다.
