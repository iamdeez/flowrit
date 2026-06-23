# Plan: 1.0.0 런칭 준비 및 제품 완성도 개선

> Branch: 001-launch-readiness | Date: 2026-06-23 | Spec: [spec.md](spec.md)

## 사전 검증 (Constitution Gates)

- [x] **P-001 워크스페이스 데이터 격리**: 신규 UI와 운영 API는 워크스페이스 데이터 조회 시 `workspaceId` scope를 유지한다. 공개 Health Check는 워크스페이스 데이터를 조회하지 않는다.
- [x] **P-002 RBAC 역할 경계**: 설정, 팀, 결제 등 OWNER/ADMIN 전용 화면은 기존 `proxy.ts`와 `SidebarNav` 정책을 유지하며, 새 액션은 Server Action/API에서 role을 재검증한다.
- [x] **P-003 NextAuth JWT 세션**: 온보딩과 대시보드는 기존 NextAuth JWT 세션 필드(`id`, `workspaceId`, `role`)만 사용한다.
- [x] **P-004 Next.js 버전 준수**: App Router, Server Component, Route Handler, `proxy.ts` 구조를 유지한다. 구현 전 필요한 경우 `node_modules/next/dist/docs/`를 확인한다.
- [x] **P-005 파일 업로드 크기**: 본 스펙은 업로드 크기 정책을 변경하지 않으며, 파일 관련 UI는 `MAX_UPLOAD_SIZE` 기준을 유지한다.
- [x] **P-006 테스트 원칙**: 신규 운영 알림/Health Check/핵심 로직은 Vitest 테스트를 추가하고, 주요 사용자 흐름은 Playwright E2E로 검증한다.

**예외 사항**: 없음.

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Node.js 24, Next.js 16.2.9 App Router, React 19
- **스타일**: Tailwind CSS v4, `app/globals.css` Flowrit 디자인 토큰
- **인증**: NextAuth v5 JWT
- **DB**: Prisma 7 + PostgreSQL
- **운영 알림**: Discord Incoming Webhook, Sentry
- **테스트**: Vitest, Playwright
- **배포**: Vercel, Vercel Cron

## 사전 영향도 분석 결과

### 영향 파일 목록

| 파일 | 변경 유형 | 영향 내용 |
|---|---|---|
| `app/globals.css` | 수정 | 상태 UI, skeleton, empty state, button/table/form 공통 스타일 보강 |
| `app/page.tsx` | 수정 | 랜딩 메시지와 첫인상 개선 |
| `app/(auth)/login/page.tsx` | 수정 | 인증 화면 톤 통일 |
| `app/(auth)/register/page.tsx` | 수정 | 가입 가치 제안과 온보딩 연결 개선 |
| `app/onboarding/page.tsx` | 수정 | 첫 설정/첫 액션 흐름 개선 |
| `app/(dashboard)/dashboard/page.tsx` | 수정 | 오늘의 우선순위, 파이프라인, 최근 활동 중심 정보 구조 |
| `app/(dashboard)/projects/page.tsx` | 수정 | 목록 정보 밀도와 빈 상태 개선 |
| `app/(dashboard)/projects/[id]/page.tsx` | 수정 | 상세 화면 정보 구조, 고객 공유/수정 요청/납품물 영역 개선 |
| `app/(dashboard)/orders/page.tsx` | 수정 | 접수→프로젝트 전환 흐름 명확화 |
| `app/(dashboard)/settings/page.tsx` | 수정 | 설정 섹션 구조 정리 |
| `app/(dashboard)/settings/billing-tab.tsx` | 수정 | 구독 상태별 메시지와 액션 보강 |
| `app/(dashboard)/settings/webhook-info.tsx` | 수정 | 웹훅 설정/테스트/문제 해결 안내 개선 |
| `app/order/[workspaceSlug]/page.tsx` | 수정 | 공개 주문서 신뢰감과 제출 완료 UX 개선 |
| `app/intake/[workspaceSlug]/page.tsx` | 수정 | 공개 일반 문의 신뢰감과 제출 완료 UX 개선 |
| `app/p/[token]/page.tsx` | 수정 | 고객 포털 정보 구조와 다음 행동 안내 개선 |
| `app/error.tsx` | 수정 | 전역 에러 복구 액션 개선 |
| `app/not-found.tsx` | 수정 | 404 복구 액션 개선 |
| `app/loading.tsx` | 수정 | 브랜드 일관 loading 개선 |
| `app/api/health/route.ts` | 신규 | Health Check API |
| `lib/ops-alert.ts` | 신규 | Discord 운영 알림 전송 유틸 |
| `lib/ops-sanitize.ts` | 신규 | 알림 context 민감 정보 제거 |
| `app/api/cron/*/route.ts` | 수정 | Cron 실패/성공 요약 알림 연결 |
| `app/api/billing/callback/route.ts` | 수정 | 결제 실패 중요 이벤트 알림 연결 |
| `lib/email.ts`, `lib/notifications.ts` | 수정 | 이메일 실패 운영 알림 연결 |
| `lib/ratelimit.ts` | 수정 | 로그인 rate limiter 추가 (`loginLimiter`) |
| `lib/auth.ts`, `lib/actions/auth.ts` | 수정 | 로그인 시도 제한과 사용자 안내 메시지 연결 |
| `.env.example` | 수정 | `DISCORD_WEBHOOK_URL`, `HEALTHCHECK_TOKEN` placeholder 추가 (`CRON_SECRET`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_*`는 이미 존재) |
| `.github/workflows/ci.yml` | 수정 | E2E 또는 readiness 검증 단계 추가 |
| `playwright.config.ts` | 신규 | Playwright 설정 |
| `tests/e2e/*.spec.ts` | 신규 | 핵심 사용자 흐름 E2E |
| `tests/e2e/fixtures/` | 신규 | E2E seed 전용 테스트 계정·데이터 fixture |
| `tests/ops-alert.test.ts` | 신규 | Discord 알림 sanitization/no-op 테스트 |
| `tests/health.test.ts` | 신규 | Health Check 테스트 |
| `docs/specs/v1.0.0/001-launch-readiness/checklist.md` | 신규 | 1.0.0 배포 전 체크리스트 |
| `.claude/docs/context.md` | 수정 | 구현 완료 후 현재 상태 반영 |
| `.claude/docs/infra.md` | 수정 | 운영 알림, Health Check, Cron 제약 반영 |

## 핵심 설계

### 1. UI/UX 개선 원칙

1. 실제 업무 화면을 첫 화면으로 유지한다. 마케팅식 장식보다 사용자의 다음 행동을 우선한다.
2. 대시보드는 "전체 통계"보다 "오늘 처리할 일"을 먼저 보여준다.
3. 각 페이지는 다음 네 상태를 반드시 고려한다.
   - 데이터 있음
   - 데이터 없음
   - 로딩 중
   - 오류 또는 권한 없음
4. 반복되는 시각 요소는 `flowrit-*` 공통 클래스로 묶는다.
5. 고객 공개 화면은 내부 관리 도구보다 더 친절한 문장과 제출 후 안내를 제공한다.

### 2. 대시보드 정보 구조

```
/dashboard
  ├─ 오늘의 우선순위
  │   ├─ 미확인 주문
  │   ├─ 열린 수정 요청
  │   └─ 마감 임박 프로젝트
  ├─ 업무 파이프라인
  │   ├─ 접수됨
  │   ├─ 진행 중
  │   ├─ 검토 중
  │   └─ 완료
  ├─ 최근 활동
  └─ 기간별 지표
```

기존 analytics chart는 대시보드 하단 또는 접힘 가능한 영역으로 유지하고, 상단은 운영 행동 중심으로 재배치한다.

### 3. 온보딩 흐름

```
회원가입 완료
  → 워크스페이스 기본 정보 확인
  → 기본 워크플로우 템플릿 확인
  → 주문서 링크 복사 또는 샘플 프로젝트 생성
  → 대시보드 진입
```

온보딩은 이미 생성된 계정에도 안전해야 하며, 완료 후 재진입 시 현재 상태를 보여준다.

### 4. 운영 알림 설계

`lib/ops-alert.ts`:

```typescript
type OpsAlertLevel = 'info' | 'warning' | 'critical'

type OpsAlertInput = {
  level: OpsAlertLevel
  title: string
  message: string
  source: string
  context?: Record<string, unknown>
}

export async function sendOpsAlert(input: OpsAlertInput): Promise<void>
```

동작:

- `NODE_ENV !== 'production'`이면 Discord 전송을 생략하고 로그만 남긴다.
- `DISCORD_WEBHOOK_URL`이 없으면 no-op 처리하고 앱 기능을 실패시키지 않는다.
- context는 `sanitizeOpsContext()`를 거쳐 민감 키를 제거한다.
- Discord 전송 실패는 사용자 요청 실패로 전파하지 않고 Sentry 또는 console에 기록한다.

로그인 rate limiting (`lib/ratelimit.ts`에 `loginLimiter` 추가):

```typescript
// 로그인: 5분에 10회
const loginLimiter = buildLimiter(10, '5 m', 'login')

export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  return check(loginLimiter, ip)
}
```

로그인 rate limit은 서버에서 신뢰 가능한 request header(`x-forwarded-for`, `x-real-ip`)를 기준으로 IP를 식별한다. 클라이언트가 제출하는 `credentials` 값은 IP 판정에 사용하지 않는다.

NextAuth Credentials provider의 `authorize` 내부 또는 로그인 Server Action 진입부에서 `checkLoginRateLimit(ip)`를 호출한다. 제한에 걸린 경우 현재 NextAuth 구조와 호환되도록 인증을 거부하고, 로그인 화면에는 "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." 메시지를 표시한다. 별도 Route Handler로 `/api/auth/callback/credentials` 앞단을 감싸지 않는 한 명시적인 HTTP status를 수용 기준으로 삼지 않는다.

Upstash Redis가 없는 환경에서는 `buildLimiter`가 `null`을 반환하므로 no-op으로 처리된다.

알림 대상 이벤트:

| 이벤트 | level | source |
|---|---|---|
| Health Check 실패 | critical | `health` |
| Cron 실행 실패 | critical | `cron` |
| 결제 실패 | warning | `billing` |
| 결제 3회 실패/다운그레이드 | critical | `billing` |
| 이메일 발송 실패 | warning | `email` |
| 웹훅 반복 실패 또는 인증 오류 급증 | warning | `webhook` |

### 5. Health Check 설계

`GET /api/health`

정상 응답:

```json
{
  "ok": true,
  "status": "ok",
  "checks": {
    "app": "ok",
    "database": "ok",
    "env": "ok"
  }
}
```

실패 응답:

```json
{
  "ok": false,
  "status": "degraded",
  "checks": {
    "app": "ok",
    "database": "fail",
    "env": "ok"
  }
}
```

공개 응답에는 구체적인 secret 이름, DB URL, 토큰 값을 포함하지 않는다.

### 6. E2E 전략

Playwright는 다음 흐름을 검증한다.

- 인증/온보딩
- 주문서 제출과 대시보드 확인
- 주문서 → 프로젝트 전환
- 고객 포털 수정 요청 제출
- 결제 모달 진입
- 모바일 공개 주문서 제출

실제 결제 승인, 외부 이메일 수신, Discord 실제 전송은 mock 또는 단위 테스트로 대체한다.

## 인터페이스 계약

### 환경변수

`.env.example`에 이미 존재하는 변수: `CRON_SECRET`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

`.env.example`에 신규 추가:

- `DISCORD_WEBHOOK_URL`
- `HEALTHCHECK_TOKEN` — `/api/health` 상세 체크 요청 보호용. 공개 요약 응답은 token 없이 허용한다.

실제 값은 Vercel Environment Variables에만 설정한다.

### API Routes

| 경로 | 메서드 | 설명 | 인증 |
|---|---|---|---|
| `/api/health` | GET | 앱/DB/env 상태 확인 | 공개 요약은 token 없이 허용, 상세 체크는 `HEALTHCHECK_TOKEN` 필요 |

### 운영 알림 함수

`sendOpsAlert()`는 실패해도 호출자의 주요 비즈니스 흐름을 실패시키지 않는다. 단, Health Check 전용 로직은 실패 상태를 응답으로 반환한다.

## 데이터 모델

신규 DB 모델은 추가하지 않는다.

운영 알림 이력 저장은 본 스펙 범위에서 제외한다. 중복 알림 제어는 메모리 기반 단기 throttle 또는 Sentry grouping을 우선 사용한다.

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-001 | Playwright | 가입 후 온보딩 완료 | 테스트 사용자 | 대시보드 진입 |
| SC-002 | Playwright/시각 점검 | 빈 상태 CTA 확인 | 데이터 없는 워크스페이스 | 다음 행동 버튼 표시 |
| SC-003 | Playwright | 대시보드 핵심 섹션 확인 | seeded 데이터 | 우선순위/파이프라인/최근 활동 표시 |
| SC-004 | Playwright | 프로젝트 상세 구성 확인 | seeded 프로젝트 | 공유 링크/수정 요청/납품물 영역 표시 |
| SC-005 | Playwright | 주문서 프로젝트 전환 CTA 확인 | PENDING ORDER | 전환 CTA 표시 및 동작 |
| SC-006 | Playwright | 공개 주문서 제출 | 공개 slug | 성공 안내 표시 |
| SC-007 | Playwright/단위 | 설정 섹션 렌더링 | OWNER 세션 | 섹션별 상태/액션 표시 |
| SC-008 | 단위/컴포넌트 | 결제 상태별 UI | FREE/PRO/past_due/cancel 예정 | 다른 메시지와 CTA 표시 |
| SC-009 | Playwright | error/not-found/loading 상태 확인 | 오류/없는 경로 | 복구 액션 표시 |
| SC-010 | Vitest | Discord 알림 sanitization | 민감 context | 민감 키 제거 후 전송 |
| SC-011 | Vitest/API | Health Check 상태 | DB 정상/실패 mock | ok/degraded 응답 구분 |
| SC-012 | 문서 검증 | checklist 포함 항목 확인 | checklist.md | 필수 운영 항목 포함 |
| SC-013 | Playwright | 핵심 E2E 실행 | 로컬 dev 서버 | 테스트 통과 |
| SC-014 | 문서 검증 | context/infra 현행화 | 구현 후 문서 | 변경 상태 반영 |
| SC-015 | Vitest/API | 로그인 rate limit 동작 | 동일 IP 반복 실패 | 인증 거부 및 rate limit 안내 |
| SC-016 | 빌드 검증 | 미사용 Toss SDK 제거 | 의존성 제거 후 build | typecheck/build 성공 |

## 기타 고려사항

- **[BLOCKER] v0.7.0/001-nicepayments 동기화 전제**: FR-009(결제/구독 UI), SC-008(결제 상태별 UI), T014(billing callback 알림 연결)는 모두 NicePayments 구현 완료를 전제로 한다. 코드에는 결제 구현이 일부 존재하지만 `docs/specs/v0.7.0/001-nicepayments/tasks.md` 체크박스는 미완료 상태이므로, 본 스펙 Phase 3·4 착수 전 구현·검증·체크박스 상태를 동기화한다.
- **Cron 스케줄 확인**: `vercel.json`의 두 Cron(`/api/cron/deadline-reminder`, `/api/cron/billing`)은 모두 `0 0 * * *`(매일 자정 UTC)으로 설정되어 있다. Vercel 플랜에 따라 Cron Job 수량 제한이 있으므로 두 Cron이 모두 동작 중인지 Vercel 대시보드에서 반드시 확인한다.
- **`@tosspayments/payment-sdk` 제거 필요**: 앱 코드 전체에서 `tosspayments`를 import하는 파일이 없음이 확인됨. `package.json`에서 제거해야 한다. `tasks.md`에 별도 태스크로 포함한다.
- staging 환경이 없으므로, 1.0.0 전 production과 분리된 검증 환경 구성을 별도 task로 포함한다.
- Discord 알림은 운영 편의 기능이지만 장애 전파 경로가 되면 안 된다. 전송 실패는 앱의 주요 기능을 깨뜨리지 않는다.
