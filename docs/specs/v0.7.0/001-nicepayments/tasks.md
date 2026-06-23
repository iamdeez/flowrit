# Tasks: 나이스페이먼츠 결제 · 구독 시스템

> Branch: 001-nicepayments | Date: 2026-06-23 | Plan: [plan.md](plan.md)

## 목차

- [전제 조건](#전제-조건)
- [태스크 목록](#태스크-목록)
- [구현 완료 기준](#구현-완료-기준)

---

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? — 예 (없음)
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가? — 예
- [ ] 나이스페이먼츠 개발자 계정 및 테스트 키 발급 완료 (`NEXT_PUBLIC_NICEPAY_CLIENT_ID`, `NICEPAY_SECRET_KEY`)

---

## 태스크 목록

### Phase 1. 데이터 모델 및 기반

- [ ] **T001** — Prisma 스키마 업데이트 및 마이그레이션 생성
  - 구현 파일: `prisma/schema.prisma`
  - 관련 요구사항: `FR-001`, `FR-010`
  - 상세:
    - `Subscription` 모델 추가 (plan.md §데이터 모델 참조)
    - `Payment` 모델 추가
    - `Workspace` 에 `subscription Subscription?`, `payments Payment[]` 관계 추가
    - `prisma migrate dev --name add_subscription_payment` 실행
    - 마이그레이션 파일에 beta→free 데이터 마이그레이션 SQL 추가 (plan.md §마이그레이션 전략)
  - 완료 기준: `npx prisma migrate dev` 성공, `Subscription`·`Payment` 테이블 생성 확인

- [ ] **T002** `[P]` — 플랜 상수 및 유틸 함수 작성
  - 구현 파일: `lib/plan.ts` (신규)
  - 관련 요구사항: `FR-001`, `FR-007`
  - 상세:
    - `PLAN_LIMITS` 상수 정의 (free: maxProjects=3, maxMembers=1 / pro: Infinity, 5)
    - `getWorkspacePlan(workspaceId)` — Subscription 조회 후 plan 반환, 없으면 "free"
    - `checkProjectLimit(workspaceId)` — 초과 시 `throw new Error('PLAN_LIMIT_EXCEEDED:PROJECT')`
    - `checkMemberLimit(workspaceId)` — 초과 시 `throw new Error('PLAN_LIMIT_EXCEEDED:MEMBER')`
  - 완료 기준: 함수 작성 완료, TypeScript 컴파일 에러 없음

- [ ] **T003** `[P]` — 나이스페이먼츠 API 래퍼 작성
  - 구현 파일: `lib/billing.ts` (신규)
  - 관련 요구사항: `FR-002`, `FR-003`, `FR-004`
  - 상세:
    - `PLAN_PRICES = { monthly: 29900, yearly: 298000 }` 상수
    - `registerBillingKey(authToken, orderId, buyerEmail, buyerName)` — 나이스페이먼츠 `/v1/subscribe/regist` 호출 후 `bid` 반환
    - `chargeBillingKey({ bid, orderId, amount, goodsName, buyerName, buyerEmail })` — `/v1/subscribe/{bid}/payments` 호출 후 `tid` 반환
    - `getNextPeriodEnd(billingCycle, from)` — 월/연 기준 다음 결제일 계산
    - 모든 함수는 실패 시 throw, Sentry captureException 호출
  - 완료 기준: 함수 작성 완료, TypeScript 컴파일 에러 없음

- [ ] **T004** `[P]` — 나이스페이먼츠 환경변수 및 스크립트 로딩 준비
  - 구현 파일: `.env.local`, `.env.example`
  - 관련 요구사항: `FR-002`
  - 상세:
    - 클라이언트 UI에서 `https://pay.nicepay.co.kr/v1/js/` 스크립트 로딩
    - `AUTHNICE.requestPay` 호출에 필요한 `clientId`, `orderId`, `amount`, `goodsName`, `returnUrl`, `fn_success`, `fn_error` 설정
    - `.env.local`에 `NEXT_PUBLIC_NICEPAY_CLIENT_ID`, `NICEPAY_SECRET_KEY` 추가 (나이스페이먼츠 대시보드에서 발급)
    - `.env.example`에 동일 키 추가 (placeholder 값)
  - 완료 기준: env 파일 업데이트, UI에서 AUTHNICE 스크립트가 정상 로드됨

### Phase 2. 핵심 비즈니스 로직

- [ ] **T005** — 빌링키 발급 + 첫 결제 API Route
  - 구현 파일: `app/api/billing/callback/route.ts` (신규)
  - 관련 요구사항: `FR-002`, `FR-003`
  - 상세:
    - POST handler: `{ authToken, orderId, billingCycle }` 수신
    - 세션 검증: `auth()` 호출, OWNER 권한 확인
    - `registerBillingKey(authToken, orderId, buyerEmail, buyerName)` 호출 → `bid` 획득
    - 결제용 orderId 생성: `billing-${workspaceId}-${Date.now()}`
    - `chargeBillingKey({ bid, orderId: paymentOrderId, amount: PLAN_PRICES[billingCycle], goodsName, buyerName, buyerEmail })` 호출
    - 성공 시: Subscription 생성 (plan=pro, status=active, billingKey=bid, currentPeriodEnd), Workspace.plan = "pro", Payment 생성 (status=done, paymentKey=tid)
    - 실패 시: Payment 생성 (status=failed), 400 반환
  - 완료 기준: 나이스페이먼츠 테스트 환경에서 정상 동작

- [ ] **T006** — 자동결제 Cron API Route
  - 구현 파일: `app/api/cron/billing/route.ts` (신규)
  - 관련 요구사항: `FR-004`, `FR-005`
  - 상세:
    - GET handler: `Authorization: Bearer {CRON_SECRET}` 검증 (기존 cron 패턴 참고)
    - 당일 만료 Subscription 조회 (status=active, cancelAtPeriodEnd=false)
    - 각 구독 처리: 저장된 `Subscription.billingKey`(`bid`)로 `chargeBillingKey` 호출
    - 성공: currentPeriodEnd 갱신, Payment 생성 (status=done), retryCount=0 초기화
    - 실패: Payment 생성 (status=failed), retryCount 증가
    - retryCount >= 3: status="past_due", Workspace.plan="free", `sendPaymentFailEmail` 이메일 발송
    - `cancelAtPeriodEnd=true` 인 구독: 기간 만료 시 plan="free" 처리 추가
  - 완료 기준: CRON_SECRET 없이 요청 시 401, 정상 요청 시 200

- [ ] **T007** — 구독 취소 Server Action
  - 구현 파일: `lib/actions/billing.ts` (신규)
  - 관련 요구사항: `FR-006`
  - 상세:
    - `cancelSubscription()` Server Action
    - OWNER 권한 확인
    - `Subscription.cancelAtPeriodEnd = true` 업데이트
    - revalidatePath('/settings')
  - 완료 기준: OWNER만 취소 가능, 취소 후 cancelAtPeriodEnd=true 확인

- [ ] **T008** — 결제 실패 이메일
  - 구현 파일: `lib/email.ts`
  - 관련 요구사항: `FR-005`
  - 상세:
    - `sendPaymentFailEmail(ownerEmail, workspaceName, retryCount)` 함수 추가
    - 3회 최종 실패 시 다운그레이드 안내 포함
  - 완료 기준: 함수 작성 완료

### Phase 3. 플랜 제한 통합

- [ ] **T009** — 프로젝트 생성 제한 통합
  - 구현 파일: `lib/actions/project.ts`
  - 관련 요구사항: `FR-007`, `SC-001`
  - 상세:
    - 기존 `createProject` Server Action 상단에 `await checkProjectLimit(workspaceId)` 추가
    - throw 시 클라이언트에 에러 코드 전달
  - 완료 기준: FREE 플랜 3개 초과 시 에러 반환

- [ ] **T010** — 팀원 초대 제한 통합
  - 구현 파일: `lib/actions/member.ts` 또는 `lib/actions/invite.ts` (팀원 초대 Server Action 위치 확인 필요)
  - 관련 요구사항: `FR-007`, `SC-002`
  - 상세:
    - 초대 생성 Server Action 상단에 `await checkMemberLimit(workspaceId)` 추가
  - 완료 기준: FREE 플랜에서 초대 시도 시 에러 반환

### Phase 4. UI

- [ ] **T011** — 빌링 탭 및 업그레이드 UI
  - 구현 파일:
    - `app/(dashboard)/settings/billing-tab.tsx` (신규)
    - `app/(dashboard)/settings/upgrade-modal.tsx` (신규)
    - `app/(dashboard)/settings/page.tsx` (수정 — 빌링 탭 추가)
  - 관련 요구사항: `FR-008`, `SC-009`
  - 상세:
    - 현재 플랜 표시 (FREE/PRO 배지, 다음 결제일, 금액)
    - PRO일 경우: 등록 카드 마지막 4자리, "구독 취소" 버튼
    - FREE일 경우: "Pro 업그레이드" 버튼 → 업그레이드 모달
    - 결제 내역 테이블 (날짜, 금액, 상태)
    - 업그레이드 모달: 월/연 선택, 나이스페이먼츠 AUTHNICE 카드 인증 UI 렌더링
  - 완료 기준: 빌링 탭 렌더링, 업그레이드 플로우 UI 확인

- [ ] **T012** — 나이스페이먼츠 카드 인증 콜백 처리
  - 구현 파일:
    - `app/(dashboard)/settings/upgrade-modal.tsx`
    - `app/api/billing/callback/route.ts`
  - 관련 요구사항: `FR-002`, `FR-003`
  - 상세:
    - `AUTHNICE.requestPay`의 `fn_success(data)`에서 `authToken`, `orderId` 추출
    - 선택된 `billingCycle`과 함께 `/api/billing/callback` POST
    - 성공 시 `/settings?tab=billing` 갱신 또는 이동
    - `fn_error` 또는 API 실패 시 사용자에게 실패 메시지 표시
  - 완료 기준: 카드 인증 성공/실패 시 적절한 UI 상태 표시

- [ ] **T013** — 플랜 제한 업그레이드 유도 모달 통합
  - 구현 파일: 프로젝트 생성 UI, 팀원 초대 UI (해당 컴포넌트)
  - 관련 요구사항: `FR-007`
  - 상세:
    - `PLAN_LIMIT_EXCEEDED:PROJECT` 에러 수신 시 upgrade-modal 표시
    - `PLAN_LIMIT_EXCEEDED:MEMBER` 에러 수신 시 upgrade-modal 표시
  - 완료 기준: 제한 초과 시 업그레이드 모달 표시

- [ ] **T014** — Vercel Cron 스케줄 설정
  - 구현 파일: `vercel.json` (신규 또는 수정)
  - 관련 요구사항: `FR-004`
  - 상세:
    - 매일 00:00 UTC (09:00 KST) 실행
    ```json
    { "crons": [{ "path": "/api/cron/billing", "schedule": "0 0 * * *" }] }
    ```
  - 완료 기준: `vercel.json` 에 cron 스케줄 추가 확인

### Phase 5. 테스트

- [ ] **T015** — 플랜 제한 함수 단위 테스트
  - 테스트 파일: `tests/plan.test.ts` (신규)
  - 검증 대상: `SC-001`, `SC-002`
  - 시나리오:
    - FREE 플랜 + 프로젝트 3개 → `checkProjectLimit` throw
    - FREE 플랜 + 프로젝트 2개 → `checkProjectLimit` pass
    - FREE 플랜 + 멤버 1명 → `checkMemberLimit` throw
    - PRO 플랜 → 제한 없음

- [ ] **T016** — 빌링 로직 단위 테스트
  - 테스트 파일: `tests/billing.test.ts` (신규)
  - 검증 대상: `SC-006`, `SC-007`, `SC-008`, `SC-010`
  - 시나리오:
    - 나이스페이먼츠 API mock 실패 → Payment.status=failed, failReason 저장
    - retryCount=2 + 실패 → status=past_due, Workspace.plan=free
    - `cancelSubscription()` OWNER → cancelAtPeriodEnd=true
    - 연간 결제 → amount=298000, currentPeriodEnd=+365일

---

## 구현 완료 기준

- [ ] 모든 태스크 체크박스가 완료 처리되었다.
- [ ] `npm test` 전체 PASSED
- [ ] `npm run typecheck` 에러 없음
- [ ] `npm run lint` 에러 없음
- [ ] `git status`에 의도치 않은 파일 없음
- [ ] 나이스페이먼츠 테스트 환경에서 카드 등록 → 결제 → 구독 활성화 플로우 수동 확인
