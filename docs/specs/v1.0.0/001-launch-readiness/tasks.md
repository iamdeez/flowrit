# Tasks: 1.0.0 런칭 준비 및 제품 완성도 개선

> Branch: 001-launch-readiness | Date: 2026-06-23 | Plan: [plan.md](plan.md)

## 전제 조건

- [x] spec.md의 모든 `[NEEDS CLARIFICATION]` 항목이 해소되었는가? — 예
- [x] plan.md의 Constitution Gates가 모두 통과(또는 예외 기재)되었는가? — 예
- [x] CHANGES.md에서 이전 작업의 "후속 작업 시 주의사항"을 확인했는가? — 예 (`docs/specs/pre-launch/002-launch-infra/tasks.md`의 "외부 의존 항목" 섹션 — v0.6.0 이후 pre-launch 작업이 완료됨)
- [ ] **[BLOCKER]** `v0.7.0/001-nicepayments` 구현·검증·체크박스 상태가 동기화되었는가? — Phase 3(T012 결제 UI) 및 Phase 4(T014 billing callback 알림) 착수 전 필수

## 태스크 목록

> [P] 표시: 이전 태스크와 병렬 실행 가능

### Phase 1. 디자인 시스템 및 상태 UI 기반

- [x] **T001** — Flowrit UI 토큰과 공통 컴포넌트 정리
  - 구현 파일: `app/globals.css`, 필요 시 `components/ui/*`
  - 관련 요구사항: `FR-001`, `FR-003`, `FR-010`
  - 상세:
    - panel, table, empty state, skeleton, status badge, icon button, form help/error 텍스트 패턴 정리
    - 모바일/데스크톱에서 버튼 텍스트와 컨테이너가 겹치지 않도록 stable dimensions 적용
  - 완료 기준: 주요 화면에서 공통 스타일이 반복 사용되고 텍스트 겹침이 없음

- [x] **T002** `[P]` — 전역 loading/error/not-found 화면 개선
  - 구현 파일: `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx`
  - 관련 요구사항: `FR-010`
  - 상세:
    - Flowrit 브랜드 톤 적용
    - 홈/대시보드/이전 화면 이동 등 복구 액션 제공
    - 내부 에러 상세 노출 금지
  - 완료 기준: 없는 경로와 강제 error 상태에서 복구 액션 표시

- [x] **T003** `[P]` — 주요 빈 상태 UX 패턴 적용
  - 구현 파일: `app/(dashboard)/**/page.tsx`, 공개 페이지 관련 컴포넌트
  - 관련 요구사항: `FR-003`
  - 상세:
    - 프로젝트, 고객, 주문서, 수정 요청, 템플릿, 메시지, 결제 내역 빈 상태에 다음 행동 CTA 추가
    - OWNER/ADMIN/MEMBER 권한별 가능한 CTA만 노출
  - 완료 기준: 주요 빈 상태가 모두 다음 행동을 제공

### Phase 2. 첫인상과 온보딩

- [x] **T004** — 랜딩 페이지 메시지와 시각 구조 개선
  - 구현 파일: `app/page.tsx`
  - 관련 요구사항: `FR-001`
  - 상세:
    - Flowrit의 핵심 가치 문장을 고객 의뢰·수정 요청·납품 링크 중심으로 정리
    - 실제 제품 화면 또는 워크플로우가 첫 viewport에서 드러나도록 구성
  - 완료 기준: 첫 화면에서 서비스 목적과 주요 CTA가 명확함

- [x] **T005** — 인증 화면 톤 통일
  - 구현 파일: `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `app/(auth)/forgot-password/page.tsx`, `app/(auth)/reset-password/[token]/page.tsx`
  - 관련 요구사항: `FR-001`
  - 상세:
    - `forgot-password`, `reset-password` 경로는 pre-launch에서 생성됨 — 스타일 통일 범위만 적용
    - 문구, 입력 오류, 버튼 상태, 보조 링크 스타일 통일
    - 모바일에서 입력 폼이 답답하지 않도록 레이아웃 조정
  - 완료 기준: 인증 화면들이 동일한 제품 톤과 폼 UX를 가짐

- [x] **T006** — 온보딩 첫 설정 흐름 개선
  - 구현 파일: `app/onboarding/page.tsx`, 필요 시 `lib/actions/settings.ts`
  - 관련 요구사항: `FR-002`
  - 상세:
    - 워크스페이스 정보 확인
    - 기본 템플릿 확인
    - 주문서 링크 복사 또는 샘플 프로젝트 생성 CTA 제공
    - 이미 설정된 사용자의 재진입 처리
  - 완료 기준: 신규 사용자 E2E에서 온보딩 완료 후 대시보드 진입

### Phase 3. 핵심 업무 화면 UX 개선

- [x] **T007** — 대시보드 정보 구조 재정렬
  - 구현 파일: `app/(dashboard)/dashboard/page.tsx`
  - 관련 요구사항: `FR-004`
  - 상세:
    - 오늘의 우선순위, 업무 파이프라인, 최근 활동, 기간별 지표 순으로 재구성
    - 기존 analytics 차트는 하단 또는 보조 섹션으로 유지
    - DB query 증가 없이 select와 Promise.all 구조 점검
  - 완료 기준: `SC-003` 충족, dashboard unit/e2e 테스트 통과

- [x] **T008** — 프로젝트 목록 UX 개선
  - 구현 파일: `app/(dashboard)/projects/page.tsx`, `components/projects-filter.tsx`
  - 관련 요구사항: `FR-005`
  - 상세:
    - 상태, 고객, 마감일, 담당자, 마지막 활동이 스캔 가능하도록 목록 구조 개선
    - 필터/검색/빈 상태 CTA 정리
  - 완료 기준: 프로젝트가 많거나 없을 때 모두 읽기 쉬움

- [x] **T009** — 프로젝트 상세 UX 개선
  - 구현 파일: `app/(dashboard)/projects/[id]/page.tsx`, 하위 컴포넌트
  - 관련 요구사항: `FR-005`
  - 상세:
    - 고객 공유 링크, 수정 요청, 납품물, 타임라인/메시지 영역을 명확히 분리
    - 다음 액션이 가장 먼저 보이도록 CTA 정리
  - 완료 기준: 고객 공유/수정 요청/납품물 액션을 사용자가 혼동하지 않음

- [x] **T010** — 주문서 관리 UX 개선
  - 구현 파일: `app/(dashboard)/orders/page.tsx`, `app/(dashboard)/orders/*`
  - 관련 요구사항: `FR-006`
  - 상세:
    - 접수→검토→프로젝트 전환 흐름 명확화
    - 주문서 링크 복사, 무시, 전환 액션의 위계 정리
  - 완료 기준: PENDING ORDER에서 프로젝트 전환 CTA가 명확함

- [x] **T011** — 고객 공개 화면 신뢰감 개선
  - 구현 파일: `app/order/[workspaceSlug]/page.tsx`, `app/intake/[workspaceSlug]/page.tsx`, `app/p/[token]/page.tsx`
  - 관련 요구사항: `FR-007`
  - 상세:
    - 공개 화면의 브랜드, 안내 문구, 제출 후 성공 상태 개선
    - 고객이 다음 단계와 응답 기대치를 이해하도록 안내
  - 완료 기준: 공개 주문서 제출 E2E에서 성공 안내 확인

- [x] **T012** — 설정 및 결제 화면 UX 개선
  - 구현 파일: `app/(dashboard)/settings/page.tsx`, `app/(dashboard)/settings/billing-tab.tsx`, `app/(dashboard)/settings/webhook-info.tsx`
  - 관련 요구사항: `FR-008`, `FR-009`
  - 상세:
    - 설정 섹션 정보 구조 정리
    - FREE/PRO/past_due/cancelAtPeriodEnd 상태별 메시지와 CTA 분리
    - 웹훅 설정 실패 가능성과 테스트 액션 명확화
  - 완료 기준: 설정/결제 상태별 UI가 사용자에게 다음 행동을 제공

### Phase 4. 운영 모니터링 및 인프라 보강

- [x] **T013** — Discord 운영 알림 유틸 작성
  - 구현 파일: `lib/ops-alert.ts`, `lib/ops-sanitize.ts`, `.env.example`
  - 관련 요구사항: `FR-011`, `FR-012`
  - 상세:
    - `sendOpsAlert` 구현
    - production 외 환경 no-op
    - 민감 키 제거
    - Discord 전송 실패가 비즈니스 로직을 깨뜨리지 않도록 처리
    - `.env.example`에 `DISCORD_WEBHOOK_URL` placeholder 추가 (`CRON_SECRET`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_*`는 이미 존재)
  - 완료 기준: Vitest로 no-op/sanitization/전송 payload 검증

- [x] **T014** — 중요 이벤트에 운영 알림 연결
  - 구현 파일: `app/api/cron/*/route.ts`, `app/api/billing/callback/route.ts`, `lib/email.ts`, `lib/notifications.ts`, `app/api/webhooks/intake/[workspaceSlug]/route.ts`
  - 관련 요구사항: `FR-011`, `FR-012`
  - 상세:
    - Cron 실패, 결제 실패, 결제 최종 실패, 이메일 실패, 웹훅 중요 실패에 알림 연결
    - 민감 정보 context 포함 금지
  - 완료 기준: 각 실패 분기에서 `sendOpsAlert` 호출 테스트 또는 코드 리뷰 확인

- [x] **T014-A** — 로그인 rate limiting 추가
  - 구현 파일: `lib/ratelimit.ts`, `lib/auth.ts`, `lib/actions/auth.ts`
  - 관련 요구사항: `FR-017`
  - 상세:
    - `lib/ratelimit.ts`에 `loginLimiter` 추가 (5분에 10회)
    - 서버에서 신뢰 가능한 request header(`x-forwarded-for`, `x-real-ip`)를 기준으로 IP 식별
    - 클라이언트가 제출하는 `credentials` 값은 IP 판정에 사용하지 않음
    - `lib/auth.ts`의 credentials provider `authorize` 내부 또는 `lib/actions/auth.ts`의 로그인 Server Action 진입부에서 `checkLoginRateLimit(ip)` 호출
    - 제한 시 현재 NextAuth 구조와 호환되도록 인증 거부 및 로그인 화면에 과도한 시도 안내 표시
    - Upstash Redis 미설정 환경에서는 no-op (기존 `buildLimiter` 패턴 동일 적용)
  - 완료 기준: `SC-015` — 동일 IP 반복 실패 시 인증 거부 및 안내 메시지 Vitest 테스트 통과

- [x] **T015** — Health Check API 추가
  - 구현 파일: `app/api/health/route.ts`, `tests/health.test.ts`
  - 관련 요구사항: `FR-013`
  - 상세:
    - app/database/env 상태 확인
    - 실패 시 degraded 응답
    - 민감 정보 노출 금지
    - 공개 요약은 token 없이 허용
    - 상세 체크는 `HEALTHCHECK_TOKEN`으로 보호
  - 완료 기준: DB 정상/실패 mock 테스트 통과

- [x] **T015-B** — `@tosspayments/payment-sdk` 제거
  - 구현 파일: `package.json`, `package-lock.json`
  - 관련 요구사항: `FR-018`
  - 상세:
    - 앱 코드 전체에서 `tosspayments` import가 없음이 이미 확인됨
    - `npm uninstall @tosspayments/payment-sdk` 실행
    - `npm run typecheck && npm run build` 통과 확인
  - 완료 기준: `SC-016` — `package.json`에서 제거 완료, 빌드 통과

- [x] **T016** — 배포/운영 체크리스트 작성
  - 구현 파일: `docs/specs/v1.0.0/001-launch-readiness/checklist.md`
  - 관련 요구사항: `FR-014`
  - 상세:
    - `docs/specs/pre-launch/CHECKLIST.md`를 기반으로 1.0.0 시점 미완료 항목을 포함
    - Vercel env 확인 목록: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, `RESEND_API_KEY`, `R2_*`, `NICEPAY_*`, `CRON_SECRET`, `DISCORD_WEBHOOK_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
    - DB migration, Cron(매일 자정 UTC, 플랜별 수량 제한 확인), Resend DNS, R2, NICE 결제, webhook, domain, Sentry DSN 설정 여부
    - 로그인 rate limiting 동작 확인 항목 포함
    - Vercel Cron 2개 모두 동작 중인지 대시보드에서 확인 항목 포함
  - 완료 기준: `SC-012` 충족

- [x] **T017** — staging 또는 preview 검증 전략 정리
  - 구현 파일: `.github/workflows/ci.yml`, 문서 필요 시 `docs/specs/v1.0.0/001-launch-readiness/checklist.md`
  - 관련 요구사항: `FR-014`, `FR-015`
  - 상세:
    - production과 분리된 테스트 계정/DB/환경변수 전략 명시
    - CI에서 typecheck/lint/test/build/E2E 실행 가능하도록 정리
  - 완료 기준: 로컬 또는 CI에서 readiness 검증 명령 실행 가능

### Phase 5. E2E 및 품질 검증

- [x] **T018** — Playwright 설정 추가
  - 구현 파일: `playwright.config.ts`, `tests/e2e/`, `tests/e2e/fixtures/`
  - 관련 요구사항: `FR-015`
  - 상세:
    - local dev server(`http://localhost:3000`) 또는 `PLAYWRIGHT_BASE_URL` 환경변수 대상 설정
    - 모바일 390px, 데스크톱 1440px 프로젝트 구성
    - **seed 전략**: E2E 전용 테스트 계정(`E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`)을 환경변수로 관리. 테스트 시작 시 `beforeAll`에서 해당 계정으로 로그인. production 데이터에 영향을 주는 테스트는 금지.
    - CI에서는 `E2E_TEST_EMAIL/PASSWORD` 시크릿을 GitHub Actions Secrets으로 관리하고 Playwright 실행 단계를 별도 job으로 분리 (CI yml은 T017에서 처리)
  - 완료 기준: `npx playwright test --list` 성공

- [ ] **T019** — 핵심 E2E 시나리오 작성
  - 테스트 파일: `tests/e2e/*.spec.ts`
  - 검증 대상: `SC-001`, `SC-003`, `SC-005`, `SC-006`, `SC-013`
  - 시나리오:
    - 회원가입 → 온보딩 → 대시보드
    - 공개 주문서 제출 → 주문서 관리 확인
    - 주문서 → 프로젝트 전환
    - 고객 포털 수정 요청 제출
    - 결제 모달 진입 (NicePayments 실청구 없이, 모달 열림까지)
    - 모바일 공개 주문서 제출
  - 완료 기준: 로컬 Playwright 핵심 시나리오 통과

- [ ] **T020** — 반응형/시각 QA
  - 검증 대상: `SC-002`, `SC-004`, `SC-007`, `SC-008`, `SC-009`
  - 상세:
    - 390px, tablet, 1440px에서 주요 페이지 스크린샷 확인
    - 긴 고객명/프로젝트명/빈 상태/데이터 많은 상태 확인
  - 완료 기준: 텍스트 겹침, 버튼 overflow, 정보 가림 없음

- [ ] **T021** — 단위 테스트 보강
  - 테스트 파일: `tests/ops-alert.test.ts`, `tests/health.test.ts`, `tests/ratelimit.test.ts`, 기존 관련 테스트
  - 검증 대상: `SC-008`, `SC-010`, `SC-011`, `SC-015`
  - 상세:
    - Discord payload sanitization
    - production 외 no-op
    - Health Check 정상/실패 응답
    - 결제 상태별 UI 또는 상태 helper 검증
    - 로그인 rate limit: 동일 IP 반복 실패 시 인증 거부 및 안내 메시지 확인
  - 완료 기준: `npm test` 통과

### Phase 6. 문서 현행화 및 출시 준비

- [ ] **T022** — context.md / infra.md 현행화
  - 구현 파일: `.claude/docs/context.md`, `.claude/docs/infra.md`
  - 관련 요구사항: `FR-016`
  - 상세:
    - 운영 알림, Health Check, Playwright, 1.0.0 UI 구조 변경 반영
    - 실제 구현된 내용만 기록
  - 완료 기준: `SC-014` 충족

- [ ] **T023** — 스펙 구현 이력 문서 작성
  - 구현 파일: `docs/specs/v1.0.0/CHANGES.md`, `docs/specs/v1.0.0/DIFF-001-launch-readiness.md`
  - 관련 요구사항: `FR-014`, `FR-016`
  - 상세:
    - 구현 완료 파일과 후속 작업 주의사항 기록
    - 최종 diff 기록
  - 완료 기준: CHANGES/DIFF 최신 상태

## 구현 완료 기준

- [ ] 모든 태스크 체크박스가 완료 처리되었다.
- [ ] `npm run typecheck` 통과
- [ ] `npm run lint` 통과
- [ ] `npm test` 통과
- [ ] Playwright 핵심 E2E 통과
- [ ] 390px / tablet / 1440px 주요 화면 시각 QA 완료
- [ ] Discord 운영 알림 테스트 이벤트 수신 확인
- [ ] `/api/health` 정상/실패 상태 검증 완료
- [ ] 로그인 rate limiting 인증 거부 및 사용자 안내 테스트 통과
- [ ] `@tosspayments/payment-sdk` `package.json`에서 제거 완료
- [ ] Vercel 환경변수 전체 확인 완료 (특히 `DISCORD_WEBHOOK_URL`, `NICEPAY_*`, `UPSTASH_*`)
- [ ] Vercel Cron 2개 모두 대시보드에서 활성 상태 확인
- [ ] `docs/specs/v1.0.0/001-launch-readiness/checklist.md` 완료 또는 미완료 사유 기록
- [ ] `git status`에 의도치 않은 파일 없음
