# Plan: 나이스페이먼츠 결제 · 구독 시스템

> Branch: 001-nicepayments | Date: 2026-06-23 | Spec: [spec.md](spec.md)

## 목차

- [사전 검증 (Constitution Gates)](#사전-검증-constitution-gates)
- [기술 컨텍스트](#기술-컨텍스트)
- [사전 영향도 분석](#사전-영향도-분석)
- [핵심 설계](#핵심-설계)
- [인터페이스 계약](#인터페이스-계약)
- [데이터 모델](#데이터-모델)
- [테스트 전략](#테스트-전략)
- [기타 고려사항](#기타-고려사항)

---

## 사전 검증 (Constitution Gates)

- [x] **P-001 워크스페이스 데이터 격리**: 결제/구독 조회는 모두 `workspaceId` scope. Subscription, Payment 모두 `workspaceId` 컬럼 포함.
- [x] **P-002 RBAC 역할 경계**: 업그레이드/취소는 OWNER만 가능. Server Action에서 role 재검증. 빌링 페이지(`/settings/billing`)는 MEMBER가 읽기만 가능하도록 UI 제한.
- [x] **P-003 NextAuth JWT 세션**: 플랜 확인 시 `session.user.workspaceId`로 DB 조회. JWT에 plan 정보를 저장하지 않음 (플랜 변경이 즉시 반영되어야 하므로).
- [x] **P-004 Next.js 버전 준수**: App Router, Server Actions, async 컴포넌트 패턴 사용.
- [x] **P-005 파일 업로드 크기**: 이 스펙과 무관.
- [x] **P-006 테스트 원칙**: 모든 신규 Server Action에 Vitest 단위 테스트 작성.

**예외 사항**: 없음.

---

## 기술 컨텍스트

- **언어 / 런타임**: TypeScript, Node.js 24 (Next.js 16.2.9 App Router)
- **패키지 매니저**: npm
- **DB**: Prisma 7 + PostgreSQL (Neon), 출력 경로 `app/generated/prisma`
- **결제**: 나이스페이먼츠(NICEPAY) `AUTHNICE` 클라이언트 스크립트 + REST API 서버 직접 호출
- **이메일**: Resend (`lib/email.ts`)
- **Cron**: Vercel Cron (`vercel.json` 또는 `next.config.ts`의 `crons` 설정)
- **테스트**: Vitest 4, Prisma mock 개별 파일 작성

---

## 사전 영향도 분석

### 영향 파일 목록

| 파일 | 변경 유형 | 내용 |
|---|---|---|
| `prisma/schema.prisma` | 수정 | `Subscription`, `Payment` 모델 추가; `Workspace` 관계 추가 |
| `prisma/migrations/` | 신규 | 마이그레이션 파일 자동 생성 |
| `lib/plan.ts` | 신규 | 플랜 상수 정의, 플랜 제한 조회 함수 |
| `lib/billing.ts` | 신규 | 나이스페이먼츠 API 호출 래퍼 |
| `lib/email.ts` | 수정 | 결제 실패 알림 이메일 함수 추가 |
| `lib/actions/billing.ts` | 신규 | 구독 취소, 카드 등록 콜백 처리 Server Actions |
| `lib/actions/project.ts` | 수정 | 프로젝트 생성 시 FREE 플랜 제한 체크 추가 |
| `lib/actions/member.ts` | 수정 | 팀원 초대 시 FREE 플랜 제한 체크 추가 |
| `app/(dashboard)/settings/page.tsx` | 수정 | 빌링 탭 추가 |
| `app/(dashboard)/settings/billing-tab.tsx` | 신규 | 결제 정보 / 내역 UI 컴포넌트 |
| `app/(dashboard)/settings/upgrade-modal.tsx` | 신규 | 업그레이드 유도 모달 |
| `app/api/billing/callback/route.ts` | 신규 | 빌링키 발급 + 첫 결제 실행 API Route |
| `app/api/cron/billing/route.ts` | 신규 | 자동결제 Cron 핸들러 |
| `vercel.json` | 수정 또는 신규 | Cron 스케줄 추가 (`/api/cron/billing` 매일 09:00 KST) |
| `tests/billing.test.ts` | 신규 | Server Action 및 빌링 로직 단위 테스트 |
| `tests/plan.test.ts` | 신규 | 플랜 제한 함수 단위 테스트 |

### 기존 제한 체크 추가 파일

- `lib/actions/project.ts` — `createProject` Server Action에 플랜 제한 추가
- `lib/actions/member.ts` (또는 `lib/actions/invite.ts`) — 팀원 초대 제한 추가

---

## 핵심 설계

### 1. 나이스페이먼츠 빌링키 발급 플로우

```
사용자 → /settings/billing 클릭 "Pro 업그레이드"
    → 빌링 플랜 선택 (월/연) UI
    → https://pay.nicepay.co.kr/v1/js/ 로드 후 AUTHNICE.requestPay 호출
       (clientId, orderId, amount, goodsName, returnUrl, fn_success/fn_error 설정)
    → 카드 인증 완료
    → AUTHNICE fn_success(data) 콜백에서 authToken, orderId 수신
       → POST /api/billing/callback (authToken, orderId, billingCycle 전달)
          → 나이스페이먼츠 POST /v1/subscribe/regist
          → bid 획득 → Subscription.billingKey 저장
          → 첫 결제 즉시 실행: POST /v1/subscribe/{bid}/payments
          → 성공: Workspace.plan = "pro", Subscription.status = "active"
          → 실패: 오류 메시지 반환 (구독 미생성)
    → 성공 시 빌링 탭 갱신, 실패 시 모달에 오류 표시
```

### 2. 카드 등록 orderId 설계

- 카드 등록용 `orderId`는 `nicepay-auth-{workspaceId}-{timestamp}` 형식으로 생성한다.
- `orderId`는 나이스페이먼츠 카드 인증과 `/v1/subscribe/regist` 호출을 연결하는 값으로 사용한다.
- 서버는 세션의 `workspaceId`를 신뢰하고, 클라이언트가 전달하는 워크스페이스 식별자는 사용하지 않는다.
- 워크스페이스당 하나의 빌링키만 존재한다 (`Subscription.workspaceId` UNIQUE 제약).

### 3. 결제 orderId 및 PG 식별자 설계

- 결제마다 고유 orderId 필요: `billing-{workspaceId}-{timestamp}`
- 나이스페이먼츠 결제 응답의 `tid`를 `Payment.paymentKey`에 저장한다.
- `Subscription.billingKey`에는 나이스페이먼츠 `bid`를 저장한다.
- `Subscription.customerKey`는 별도 PG 고객키가 아니라 내부 추적용으로 `workspaceId`를 저장한다.

### 4. 자동결제 Cron 설계

```
GET /api/cron/billing (매일 09:00 KST = 00:00 UTC)
  → Authorization: Bearer {CRON_SECRET} 검증
  → DB에서 today 만료 예정 Subscription 조회
     (currentPeriodEnd BETWEEN today 00:00 AND today 23:59, status = "active", cancelAtPeriodEnd = false)
  → 각 구독에 대해 나이스페이먼츠 `/v1/subscribe/{bid}/payments` 자동결제 실행
  → 성공: currentPeriodEnd 갱신, Payment 레코드 생성
  → 실패: Payment 실패 기록, retryCount 증가
     - retryCount >= 3: Subscription.status = "past_due", Workspace.plan = "free"
     - 실패 이메일 발송
```

### 5. 플랜 제한 강제 설계

`lib/plan.ts`:
```typescript
export const PLAN_LIMITS = {
  free: { maxProjects: 3, maxMembers: 1 },  // maxMembers = OWNER 포함 총 인원
  pro: { maxProjects: Infinity, maxMembers: 5 },
} as const

export async function getWorkspacePlan(workspaceId: string): Promise<'free' | 'pro'>
export async function checkProjectLimit(workspaceId: string): Promise<void>  // throws if exceeded
export async function checkMemberLimit(workspaceId: string): Promise<void>   // throws if exceeded
```

Server Action에서 사용:
```typescript
// lib/actions/project.ts
await checkProjectLimit(session.user.workspaceId)
// 제한 초과 시 throw new Error('PLAN_LIMIT_EXCEEDED:PROJECT')
```

클라이언트에서 에러 코드로 업그레이드 모달 표시.

### 6. 결제 금액 서버 사이드 결정 (NFR-001 준수)

```typescript
// lib/billing.ts
const PLAN_PRICES = {
  monthly: 29900,
  yearly: 298000,
} as const

function getAmount(billingCycle: 'monthly' | 'yearly'): number {
  return PLAN_PRICES[billingCycle]
}
```

클라이언트에서 전달받은 금액을 사용하지 않는다.

---

## 인터페이스 계약

### Server Actions (lib/actions/billing.ts)

| 함수 | 파라미터 | 반환 | 권한 |
|---|---|---|---|
| `cancelSubscription()` | — | `{ success: true }` or error | OWNER only |

### API Routes

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/billing/callback` | POST | 빌링키 발급 + 첫 결제 (나이스페이먼츠 AUTHNICE 콜백 처리) |
| `/api/cron/billing` | GET | 자동결제 실행 (CRON_SECRET 인증) |

### 플랜 제한 에러 코드

기존 Server Action에서 발생하는 에러 코드 (Breaking change 아님 — 신규 에러 추가):
- `'PLAN_LIMIT_EXCEEDED:PROJECT'` — 프로젝트 생성 제한
- `'PLAN_LIMIT_EXCEEDED:MEMBER'` — 팀원 초대 제한

클라이언트에서 이 코드를 감지하여 업그레이드 모달 표시.

---

## 데이터 모델

### 신규 모델

```prisma
model Subscription {
  id                 String    @id @default(cuid())
  workspaceId        String    @unique
  workspace          Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  plan               String    // "free" | "pro"
  billingCycle       String?   // "monthly" | "yearly" | null (free)
  status             String    @default("active") // "active" | "canceled" | "past_due"
  billingKey         String?   // 나이스페이먼츠 bid
  customerKey        String?   // 내부 추적용 workspaceId
  currentPeriodStart DateTime?
  currentPeriodEnd   DateTime?
  cancelAtPeriodEnd  Boolean   @default(false)
  retryCount         Int       @default(0)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  payments           Payment[]
}

model Payment {
  id             String    @id @default(cuid())
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id])
  subscriptionId String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id])
  paymentKey     String    @unique   // 나이스페이먼츠 tid
  orderId        String    @unique   // billing-{workspaceId}-{timestamp}
  amount         Int                 // 결제 금액 (원)
  status         String              // "pending" | "done" | "failed" | "canceled"
  method         String?             // 결제 방법
  failReason     String?
  paidAt         DateTime?
  createdAt      DateTime  @default(now())

  @@index([workspaceId, createdAt])
}
```

### Workspace 모델 변경

```prisma
model Workspace {
  // ... 기존 필드
  subscription    Subscription?
  payments        Payment[]
}
```

### 마이그레이션 전략

1. `Subscription`, `Payment` 테이블 추가
2. 기존 `plan = "beta"` 워크스페이스 → `plan = "free"` 업데이트 (Data Migration)
3. 각 워크스페이스에 FREE Subscription 레코드 생성 (plan="free", status="active")

Data Migration은 Prisma seed 스크립트가 아닌 마이그레이션 파일 내 raw SQL로 처리:
```sql
-- 기존 워크스페이스 plan 업데이트
UPDATE "Workspace" SET plan = 'free' WHERE plan = 'beta';

-- FREE Subscription 레코드 생성 (아직 Subscription 없는 워크스페이스)
INSERT INTO "Subscription" (id, "workspaceId", plan, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), id, 'free', 'active', NOW(), NOW()
FROM "Workspace"
WHERE id NOT IN (SELECT "workspaceId" FROM "Subscription");
```

---

## 테스트 전략

| SC 식별자 | 테스트 유형 | 시나리오 요약 | 입력 | 기대 결과 |
|---|---|---|---|---|
| SC-001 | 단위 | FREE 플랜 프로젝트 생성 제한 | mock: plan=free, 기존 프로젝트 3개 | `PLAN_LIMIT_EXCEEDED:PROJECT` 에러 |
| SC-001 | 단위 | FREE 플랜 프로젝트 생성 허용 | mock: plan=free, 기존 프로젝트 2개 | 정상 생성 |
| SC-002 | 단위 | FREE 플랜 팀원 초대 제한 | mock: plan=free, 멤버 1명 | `PLAN_LIMIT_EXCEEDED:MEMBER` 에러 |
| SC-006 | 단위 | 나이스페이먼츠 결제 실패 | mock: API 에러 반환 | Payment.status="failed", failReason 저장 |
| SC-007 | 단위 | 3회 재시도 실패 | mock: retryCount=2, API 실패 | status="past_due", plan="free" |
| SC-008 | 단위 | 구독 취소 | session: OWNER | cancelAtPeriodEnd=true, plan 즉시 유지 |
| SC-011 | 단위 | 마이그레이션 후 beta plan 없음 | mock: beta 워크스페이스 존재 | plan="beta" 카운트 = 0 |

---

## 기타 고려사항

### 나이스페이먼츠 테스트 환경

- `NEXT_PUBLIC_NICEPAY_CLIENT_ID`와 `NICEPAY_SECRET_KEY`를 나이스페이먼츠 관리자 콘솔에서 발급
- `.env.local`에 `NEXT_PUBLIC_NICEPAY_CLIENT_ID`, `NICEPAY_SECRET_KEY` 추가
- 테스트 환경에서는 실제 결제가 발생하지 않음

### 나이스페이먼츠 클라이언트 스크립트

- 별도 npm SDK를 설치하지 않는다.
- 클라이언트에서는 `next/script`로 `https://pay.nicepay.co.kr/v1/js/`를 로드한다.
- 카드 인증은 `window.AUTHNICE.requestPay(...)`로 시작한다.

서버 측 API 호출은 SDK 없이 `fetch` + Basic Auth를 사용한다:
```typescript
const encodedKey = Buffer.from(
  `${process.env.NEXT_PUBLIC_NICEPAY_CLIENT_ID}:${process.env.NICEPAY_SECRET_KEY}`
).toString('base64')
headers: { Authorization: `Basic ${encodedKey}` }
```

### 빌링키 보안

나이스페이먼츠 `bid`는 실제 카드 정보가 아니므로 평문 DB 저장 허용.
단, Prisma의 `@select` 기반으로 API 응답에서 빌링키 필드는 제외한다.

### Vercel Cron 무료 플랜 제한

Vercel Hobby 플랜은 Cron 실행 1회/일 제한. 매일 09:00 KST 단일 스케줄로 설계.
Pro 플랜으로 업그레이드 시 더 자주 실행 가능하지만 MVP에서는 충분.
